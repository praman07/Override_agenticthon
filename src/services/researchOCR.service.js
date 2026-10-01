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
 * Extracts text from scanned/image-heavy or complex PDFs using Gemini Multimodal OCR.
 * Tries the active Gemini Flash generation models sequentially.
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
    'gemini-3.8-flash',
  ];

  let lastError = null;

  for (const model of candidateModels) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: 'Extract all readable text, titles, headings, sections, and tables from this PDF document into structured Markdown or plain text. Include all content verbatim without summarizing.',
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

  throw lastError || new Error('All Gemini OCR models failed to extract text');
}

/**
 * Robust local PDF parser with multi-tiered fallbacks.
 */
async function parsePdfLocally(buffer, fileName = 'document.pdf') {
  // 1. pdf-parse v2 class (fastest local extraction)
  try {
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
          .filter((p) => p.text.length > 0 && !p.text.includes('%PDF-') && p.text.length > 20);

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
  } catch (pdfParseErr) {
    console.warn(`[PDF Parser Notice] pdf-parse extraction failed for ${fileName}:`, pdfParseErr.message);
  }

  // 2. pdfjs-dist fallback
  try {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const uint8 = new Uint8Array(buffer);
    const loadingTask = pdfjs.getDocument({
      data: uint8,
      disableFontFace: true,
      useSystemFonts: true,
      isEvalSupported: false,
    });
    const doc = await loadingTask.promise;
    const numPages = doc.numPages || 1;
    const pages = [];

    for (let i = 1; i <= numPages; i++) {
      const page = await doc.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = (textContent?.items || [])
        .map((item) => (typeof item?.str === 'string' ? item.str : ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (pageText && pageText.length > 10) {
        pages.push({ pageNumber: i, text: pageText });
      }
    }

    if (pages.length > 0) {
      return {
        pages,
        pageCount: numPages,
        metadata: { engine: 'pdfjs-dist', fileName },
      };
    }
  } catch (pdfjsErr) {
    console.warn(`[PDF Parser Notice] pdfjs fallback failed for ${fileName}:`, pdfjsErr.message);
  }

  // 3. Automated Gemini Multimodal OCR fallback for scanned, image-only, or Vercel serverless PDFs
  try {
    console.log(`[PDF Parser] Invoking Gemini Multimodal OCR for ${fileName}...`);
    return await extractWithGeminiOCR(buffer, fileName);
  } catch (ocrErr) {
    console.warn(`[PDF Parser Notice] Gemini OCR fallback failed: ${ocrErr.message}`);
  }

  // 4. Final fallback: Extract any readable string literals
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
    console.warn(`[PDF Parser Notice] Stream fallback error:`, streamErr.message);
  }

  throw new Error(`Failed to extract readable text from PDF: ${fileName}. The PDF could not be processed.`);
}

/**
 * Extracts page-aware content from PDF, DOCX, PPTX, TXT, and Markdown document buffers.
 * Preserves page numbers and structures for vector embedding and retrieval.
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
      console.warn(`Mistral OCR notice for ${fileName}: ${err.message}. Using native local parser.`);
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
  let title = fallbackTitle.replace(/\.[^/.]+$/, ''); // Remove file extension
  let authors = [];
  let abstract = '';

  // Look for title among first 5 non-empty lines
  if (lines.length > 0) {
    const candidateLines = lines.slice(0, 5).filter(
      (l) => !l.toLowerCase().includes('journal') && !l.toLowerCase().includes('issn') && !l.startsWith('http')
    );
    if (candidateLines.length > 0 && candidateLines[0].length > 10 && candidateLines[0].length < 180) {
      title = candidateLines[0];
    }
  }

  // Look for Abstract
  const abstractMatch = page1Text.match(/abstract[:\s\n]+([\s\S]*?)(?=\n\s*(?:introduction|keywords|1\.|#))/i);
  if (abstractMatch && abstractMatch[1]) {
    abstract = abstractMatch[1].trim().replace(/\s+/g, ' ').slice(0, 1500);
  }

  return { title, authors, abstract };
}
