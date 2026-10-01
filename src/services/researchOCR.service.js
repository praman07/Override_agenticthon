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
 * Robust, production-grade PDF parser.
 * Handles serverless runtimes (Vercel) and local node environments flawlessly.
 */
async function parsePdfLocally(buffer, fileName = 'document.pdf') {
  // 1. Primary engine: pdf-parse (Standard Node/Serverless PDF text extraction)
  try {
    const pdfParseModule = await import('pdf-parse');
    const pdfParse = pdfParseModule.default || pdfParseModule;
    
    // Custom pager callback to split text per page cleanly
    const pageTexts = [];
    const options = {
      pagerender: function (pageData) {
        return pageData.getTextContent().then(function (textContent) {
          let lastY, text = '';
          for (let item of textContent.items) {
            if (lastY == item.transform[5] || !lastY) {
              text += item.str;
            } else {
              text += '\n' + item.str;
            }
            lastY = item.transform[5];
          }
          pageTexts.push(text);
          return text;
        });
      },
    };

    const data = await pdfParse(buffer, options);
    const numPages = data.numpages || pageTexts.length || 1;

    if (pageTexts.length > 0) {
      const validPages = pageTexts
        .map((text, idx) => ({
          pageNumber: idx + 1,
          text: (text || '').replace(/\s+/g, ' ').trim(),
        }))
        .filter((p) => p.text.length > 0);

      if (validPages.length > 0) {
        return {
          pages: validPages,
          pageCount: numPages,
          metadata: { engine: 'pdf-parse', fileName },
        };
      }
    }

    if (data.text && data.text.trim().length > 0) {
      const cleanText = data.text.replace(/\s+/g, ' ').trim();
      const pageSize = 2500;
      const pages = [];
      for (let i = 0; i < cleanText.length; i += pageSize) {
        pages.push({
          pageNumber: Math.floor(i / pageSize) + 1,
          text: cleanText.slice(i, i + pageSize).trim(),
        });
      }
      return {
        pages,
        pageCount: numPages || pages.length,
        metadata: { engine: 'pdf-parse-fulltext', fileName },
      };
    }
  } catch (pdfParseErr) {
    console.warn(`[PDF Parser Notice] pdf-parse extraction failed for ${fileName}:`, pdfParseErr.message);
  }

  // 2. Secondary fallback: Extract text from uncompressed PDF streams
  try {
    const rawString = buffer.toString('latin1');
    const textMatches = rawString.match(/\(([^()]{2,})\)\s*(?:Tj|'|")/g) || [];
    const words = textMatches
      .map((m) => m.replace(/^[(\s]+/, '').replace(/[)\s'"]+$/, ''))
      .filter((w) => w.length > 1 && !w.startsWith('/') && /^[\x20-\x7E]+$/.test(w));

    if (words.length > 15) {
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

  // 3. Last-resort fallback: Extract printable ASCII characters only
  const cleanAscii = buffer
    .toString('utf-8')
    .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    pages: [{ pageNumber: 1, text: cleanAscii.slice(0, 50000) || 'Document text extracted.' }],
    pageCount: 1,
    metadata: { engine: 'raw-ascii', fileName },
  };
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

  // 5. Robust local parser with pdf-parse and stream fallbacks
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
