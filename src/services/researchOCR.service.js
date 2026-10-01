import crypto from 'crypto';
import { PDFParse } from 'pdf-parse';
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
 * Extracts page-aware content from a PDF document buffer.
 * Reuses Mistral OCR API when MISTRAL_API_KEY is available,
 * and falls back to local pdf-parse.
 *
 * CRITICAL: Page numbers are strictly preserved and never flattened.
 *
 * @param {Buffer} buffer
 * @param {string} fileName
 * @returns {Promise<{ pages: Array<{ pageNumber: number, text: string }>, pageCount: number, metadata: object }>}
 */
export async function extractPagesFromPdf(buffer, fileName = 'paper.pdf') {
  const activeMistralKey = (
    process.env.MISTRALAI_API_KEY ||
    process.env.MISTRAL_API_KEY ||
    env.MISTRALAI_API_KEY ||
    ''
  ).trim();

  // 1. Try Mistral OCR if API key is present
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
      } else {
        console.warn(`Mistral OCR returned status ${ocrRes.status}. Using native parser fallback.`);
      }
    } catch (err) {
      console.warn(`Mistral OCR error for ${fileName}: ${err.message}. Falling back to pdf-parse.`);
    }
  }

  // 2. Local fallback using pdf-parse with preserved page boundaries
  try {
    const parser = new PDFParse({ data: buffer });
    const parsed = await parser.getText();

    if (parsed && Array.isArray(parsed.pages) && parsed.pages.length > 0) {
      const pages = parsed.pages.map((p, idx) => ({
        pageNumber: p.num || idx + 1,
        text: (p.text || '').trim(),
      }));

      return {
        pages,
        pageCount: parsed.total || pages.length,
        metadata: {
          engine: 'pdf-parse',
          fileName,
        },
      };
    }

    // Fallback if pages array is not present in parsed response
    const rawText = typeof parsed === 'string' ? parsed : parsed?.text || '';
    return {
      pages: [{ pageNumber: 1, text: rawText.trim() }],
      pageCount: 1,
      metadata: { engine: 'pdf-parse-single', fileName },
    };
  } catch (parseErr) {
    throw new Error(`Failed to extract text from PDF: ${parseErr.message}`);
  }
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
