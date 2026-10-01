import path from 'path';
import crypto from 'crypto';
import mammoth from 'mammoth';
import { parseOffice } from 'officeparser';
import env from '@/lib/env.js';

/**
 * Computes a SHA-256 hash of a buffer for deduplication.
 * @param {Buffer} buffer
 * @returns {string}
 */
export function computeFileHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Extracts text from scanned, image-heavy, or complex PDFs using Gemini Flash Multimodal Vision.
 * Ultra-fast serverless-safe extraction (~1-2 seconds).
 */
async function extractWithGeminiOCR(buffer, fileName) {
  const apiKey = (process.env.GEMINI_API_KEY || env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured for PDF OCR');
  }

  const base64Data = buffer.toString('base64');
  const candidateModels = [
    'gemini-flash-latest',
    'gemini-3.5-flash-lite',
    'gemini-3.5-flash',
  ];

  let lastError = null;

  for (const model of candidateModels) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: 'Extract all readable text, titles, headings, sections, and data tables from this PDF document into structured Markdown or plain text. Include all content completely and verbatim without summarizing.',
                },
                {
                  inlineData: {
                    mimeType: 'application/pdf',
                    data: base64Data,
                  },
                },
              ],
            },
          ],
        }),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text();
        lastError = new Error(`${model} failed (${response.status}): ${errText}`);
        continue;
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const clean = text.trim();

      if (clean && clean.length > 20) {
        const pageSize = 2500;
        const pages = [];
        for (let i = 0; i < clean.length; i += pageSize) {
          pages.push({
            pageNumber: Math.floor(i / pageSize) + 1,
            text: clean.slice(i, i + pageSize).trim(),
          });
        }

        return {
          pages: pages.length ? pages : [{ pageNumber: 1, text: clean }],
          pageCount: pages.length || 1,
          metadata: { engine: `gemini-ocr-${model}`, fileName },
        };
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('All OCR models failed to extract text from PDF');
}

/**
 * Fast local PDF extraction with strict timeout guard to prevent serverless hanging.
 */
async function parsePdfLocally(buffer, fileName = 'document.pdf') {
  // 1. Try pdf-parse v2 class with 2-second timeout guard
  try {
    const parsePromise = (async () => {
      const pdfParseModule = await import('pdf-parse');
      const PDFParseClass = pdfParseModule.PDFParse || pdfParseModule.default?.PDFParse;

      if (typeof PDFParseClass === 'function') {
        const parser = new PDFParseClass({ data: buffer });
        const textResult = await parser.getText();

        if (textResult?.pages && Array.isArray(textResult.pages) && textResult.pages.length > 0) {
          const validPages = textResult.pages
            .map((p, idx) => ({
              pageNumber: p.num || idx + 1,
              text: (p.text || '').replace(/\s+/g, ' ').trim(),
            }))
            .filter((p) => p.text.length > 20 && !p.text.includes('%PDF-'));

          if (validPages.length > 0) {
            return {
              pages: validPages,
              pageCount: textResult.total || validPages.length,
              metadata: { engine: 'pdf-parse-v2', fileName },
            };
          }
        }

        if (textResult?.text && textResult.text.trim().length > 30 && !textResult.text.includes('%PDF-')) {
          const cleanText = textResult.text.replace(/\s+/g, ' ').trim();
          const pageSize = 2500;
          const pages = [];
          for (let i = 0; i < cleanText.length; i += pageSize) {
            pages.push({
              pageNumber: Math.floor(i / pageSize) + 1,
              text: cleanText.slice(i, i + pageSize).trim(),
            });
          }
          return {
            pages: pages.length ? pages : [{ pageNumber: 1, text: cleanText }],
            pageCount: textResult.total || pages.length,
            metadata: { engine: 'pdf-parse-v2-fulltext', fileName },
          };
        }
      }
      return null;
    })();

    const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 2000));
    const result = await Promise.race([parsePromise, timeoutPromise]);
    if (result) return result;
  } catch (pdfParseErr) {
    console.warn(`[PDF Parser] Local parsing notice for ${fileName}:`, pdfParseErr.message);
  }

  // 2. High-speed Gemini Multimodal OCR (Serverless safe and accurate)
  try {
    return await extractWithGeminiOCR(buffer, fileName);
  } catch (ocrErr) {
    console.warn(`[PDF Parser] Gemini OCR notice: ${ocrErr.message}`);
  }

  // 3. Fallback: stream string literals
  try {
    const rawString = buffer.toString('latin1');
    const textMatches = rawString.match(/\(([^()]{3,})\)\s*(?:Tj|'|")/g) || [];
    const words = textMatches
      .map((m) => m.replace(/^[(\s]+/, '').replace(/[)\s'"]+$/, ''))
      .filter((w) => w.length > 2 && !w.startsWith('/') && /^[\x20-\x7E\s]+$/.test(w));

    if (words.length > 20) {
      const fullText = words.join(' ');
      const pageSize = 2500;
      const pages = [];
      for (let i = 0; i < fullText.length; i += pageSize) {
        pages.push({
          pageNumber: Math.floor(i / pageSize) + 1,
          text: fullText.slice(i, i + pageSize).trim(),
        });
      }
      return {
        pages: pages.length ? pages : [{ pageNumber: 1, text: fullText }],
        pageCount: Math.max(pages.length, 1),
        metadata: { engine: 'stream-fallback', fileName },
      };
    }
  } catch (streamErr) {
    console.warn(`[PDF Parser] Stream fallback notice:`, streamErr.message);
  }

  throw new Error(`Failed to extract readable text from PDF: ${fileName}. The PDF could not be processed.`);
}

/**
 * Extracts page-aware content from PDF, DOCX, PPTX, TXT, and Markdown document buffers.
 *
 * @param {Buffer} buffer
 * @param {string} fileName
 * @returns {Promise<{ pages: Array<{ pageNumber: number, text: string }>, pageCount: number, metadata: object }>}
 */
export async function extractPagesFromPdf(buffer, fileName = 'paper.pdf') {
  const lowerName = (fileName || 'document.pdf').toLowerCase();

  // 1. Plain text / Markdown
  if (lowerName.endsWith('.txt') || lowerName.endsWith('.md')) {
    const text = buffer.toString('utf-8').trim();
    const pageSize = 2500;
    const pages = [];
    for (let i = 0; i < text.length; i += pageSize) {
      pages.push({
        pageNumber: Math.floor(i / pageSize) + 1,
        text: text.slice(i, i + pageSize).trim(),
      });
    }
    return {
      pages: pages.length ? pages : [{ pageNumber: 1, text }],
      pageCount: Math.max(pages.length, 1),
      metadata: { engine: 'text-raw', fileName },
    };
  }

  // 2. Word documents (.docx)
  if (lowerName.endsWith('.docx')) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      const fullText = (result?.value || '').trim();
      const pageSize = 2500;
      const pages = [];
      for (let i = 0; i < fullText.length; i += pageSize) {
        pages.push({
          pageNumber: Math.floor(i / pageSize) + 1,
          text: fullText.slice(i, i + pageSize).trim(),
        });
      }
      return {
        pages: pages.length ? pages : [{ pageNumber: 1, text: fullText }],
        pageCount: Math.max(pages.length, 1),
        metadata: { engine: 'mammoth', fileName },
      };
    } catch (docxErr) {
      console.warn(`Mammoth docx parse notice: ${docxErr.message}`);
    }
  }

  // 3. Presentations & Office documents (.pptx, .doc)
  if (lowerName.endsWith('.pptx') || lowerName.endsWith('.doc')) {
    try {
      const officeText = await parseOffice(buffer);
      const fullText = (typeof officeText === 'string' ? officeText : '').trim();
      const pageSize = 2000;
      const pages = [];
      for (let i = 0; i < fullText.length; i += pageSize) {
        pages.push({
          pageNumber: Math.floor(i / pageSize) + 1,
          text: fullText.slice(i, i + pageSize).trim(),
        });
      }
      return {
        pages: pages.length ? pages : [{ pageNumber: 1, text: fullText }],
        pageCount: Math.max(pages.length, 1),
        metadata: { engine: 'officeparser', fileName },
      };
    } catch (officeErr) {
      console.warn(`Officeparser notice: ${officeErr.message}`);
    }
  }

  const activeMistralKey = (
    process.env.MISTRALAI_API_KEY ||
    process.env.MISTRAL_API_KEY ||
    env.MISTRALAI_API_KEY ||
    ''
  ).trim();

  // 4. Try Mistral OCR if API key is present
  if (activeMistralKey) {
    try {
      const base64Data = buffer.toString('base64');
      const dataUri = `data:application/pdf;base64,${base64Data}`;

      const ocrRes = await fetch('https://api.mistral.ai/v1/ocr', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${activeMistralKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'mistral-ocr-latest',
          document: {
            type: 'document_url',
            document_url: dataUri,
          },
        }),
      });

      if (ocrRes.ok) {
        const ocrData = await ocrRes.json();
        if (Array.isArray(ocrData?.pages) && ocrData.pages.length > 0) {
          const pages = ocrData.pages.map((p, idx) => ({
            pageNumber: p.index != null ? p.index + 1 : idx + 1,
            text: (p.markdown || '').trim(),
          }));

          return {
            pages,
            pageCount: pages.length,
            metadata: {
              engine: 'mistral-ocr',
              fileName,
            },
          };
        }
      }
    } catch (err) {
      console.warn(`Mistral OCR notice for ${fileName}: ${err.message}`);
    }
  }

  // 5. Robust local parser with Gemini OCR fallback
  return parsePdfLocally(buffer, fileName);
}

/**
 * Heuristically extracts title, authors, and abstract from Page 1 text.
 *
 * @param {string} page1Text
 * @param {string} fallbackTitle
 * @returns {{ title: string, authors: string[], abstract: string }}
 */
export function extractHeuristicMetadata(page1Text = '', fallbackTitle = 'Untitled Paper') {
  const lines = page1Text.split('\n').map((l) => l.trim()).filter(Boolean);
  let title = fallbackTitle.replace(/\.[^/.]+$/, '');
  let authors = [];
  let abstract = '';

  if (lines.length > 0) {
    const candidateLines = lines.slice(0, 5).filter(
      (l) => !l.toLowerCase().includes('journal') && !l.toLowerCase().includes('issn') && !l.startsWith('http')
    );
    if (candidateLines.length > 0 && candidateLines[0].length > 10 && candidateLines[0].length < 180) {
      title = candidateLines[0];
    }
  }

  const abstractMatch = page1Text.match(/abstract[:\s\n]+([\s\S]*?)(?=\n\s*(?:introduction|keywords|1\.|#))/i);
  if (abstractMatch && abstractMatch[1]) {
    abstract = abstractMatch[1].trim().replace(/\s+/g, ' ').slice(0, 1500);
  }

  return { title, authors, abstract };
}
