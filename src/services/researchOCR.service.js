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
 * Supports pdf-parse v2 (PDFParse class) and v1 callable function.
 */
async function parsePdfLocally(buffer, fileName = 'document.pdf') {
  // 1. Primary engine: pdf-parse v2 class (newest standard)
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
          .filter((p) => p.text.length > 0);

        if (validPages.length > 0) {
          return {
            pages: validPages,
            pageCount: textResult.total || validPages.length,
            metadata: { engine: 'pdf-parse-v2', fileName },
          };
        }
      }

      if (textResult?.text && textResult.text.trim().length > 0) {
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

    // Fallback for pdf-parse v1 (callable function)
    const callableParser = typeof pdfParseModule === 'function' ? pdfParseModule : pdfParseModule.default;
    if (typeof callableParser === 'function') {
      const data = await callableParser(buffer);
      if (data?.text && data.text.trim().length > 0) {
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
          pages: pages.length ? pages : [{ pageNumber: 1, text: cleanText }],
          pageCount: data.numpages || pages.length,
          metadata: { engine: 'pdf-parse-v1', fileName },
        };
      }
    }
  } catch (pdfParseErr) {
    console.warn(`[PDF Parser Notice] pdf-parse extraction failed for ${fileName}:`, pdfParseErr.message);
  }

  // 2. Fallback: Extract plain text using pdfjs-dist if available
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

      if (pageText) {
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

  throw new Error(`Failed to extract readable text from PDF: ${fileName}. The PDF may be scanned or empty.`);
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

  // 5. Robust local parser with pdf-parse v2 class
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
