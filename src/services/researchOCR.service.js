import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';
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
 * Robust local PDF parser using pdfjs-dist with explicitly resolved worker and multi-stage fallbacks.
 * Ensures Next.js server runtime never crashes on "Cannot find module ... pdf.worker.mjs".
 */
async function parsePdfLocally(buffer, fileName = 'document.pdf') {
  // 1. Attempt pdfjs-dist with explicitly configured GlobalWorkerOptions.workerSrc
  try {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

    const workerCandidates = [
      path.resolve(process.cwd(), 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs'),
      path.resolve(process.cwd(), 'node_modules/pdfjs-dist/build/pdf.worker.mjs'),
    ];

    const validWorker = workerCandidates.find((p) => fs.existsSync(p));
    if (validWorker) {
      pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(validWorker).href;

      // Copy worker to .next dev and build chunk folders if they exist
      try {
        const nextDevChunksDir = path.resolve(process.cwd(), '.next/dev/server/chunks');
        if (fs.existsSync(nextDevChunksDir)) {
          const destWorker = path.join(nextDevChunksDir, 'pdf.worker.mjs');
          if (!fs.existsSync(destWorker)) {
            fs.copyFileSync(validWorker, destWorker);
          }
        }
      } catch {
        // Ignore copy errors
      }
    }

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

      pages.push({
        pageNumber: i,
        text: pageText,
      });
    }

    if (pages.some((p) => p.text.length > 0)) {
      return {
        pages,
        pageCount: numPages,
        metadata: { engine: 'pdfjs-dist', fileName },
      };
    }
  } catch (pdfjsErr) {
    console.warn(`[PDF Parser Notice] pdfjs extraction for ${fileName}:`, pdfjsErr.message);
  }

  // 2. Stream & text literal extraction fallback
  try {
    const rawString = buffer.toString('latin1');
    const textMatches = rawString.match(/\(([^()]{2,})\)\s*(?:Tj|'|")/g) || [];
    const words = textMatches
      .map((m) => m.replace(/^[(\s]+/, '').replace(/[)\s'"]+$/, ''))
      .filter((w) => w.length > 1 && !w.startsWith('/'));

    if (words.length > 5) {
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

  // 3. Fallback: Clean printable ASCII
  const asciiClean = buffer
    .toString('utf-8')
    .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    pages: [{ pageNumber: 1, text: asciiClean.slice(0, 50000) }],
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

  // 5. Robust local parser with worker setup
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
