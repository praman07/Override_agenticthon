import env from '@/lib/env.js';

const GEMINI_EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004';
const EMBEDDING_DIMENSION = 768;

/**
 * Sanitizes input text so only valid unicode characters are sent to the embedding model.
 */
function sanitizeText(str) {
  if (!str) return '';
  return str
    .replace(/[^\P{C}\n\r\t]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Executes a fetch request with exponential backoff and jitter for transient errors (503, 429, 500, 502, 504).
 */
async function fetchWithRetry(url, options, maxRetries = 4, baseDelay = 1200) {
  let attempt = 0;
  while (true) {
    try {
      const response = await fetch(url, options);

      // Success
      if (response.ok) {
        return response;
      }

      const status = response.status;
      // Retryable HTTP status codes
      if (status === 503 || status === 429 || status === 500 || status === 502 || status === 504) {
        attempt++;
        if (attempt >= maxRetries) {
          return response; // Let caller parse error
        }
        const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 500;
        console.warn(`[Embedding API] Received ${status} (${response.statusText}). Retrying attempt ${attempt}/${maxRetries} in ${Math.round(delay)}ms...`);
        await new Promise((res) => setTimeout(res, delay));
        continue;
      }

      return response;
    } catch (networkErr) {
      attempt++;
      if (attempt >= maxRetries) throw networkErr;
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.warn(`[Embedding API] Network error: ${networkErr.message}. Retrying in ${Math.round(delay)}ms...`);
      await new Promise((res) => setTimeout(res, delay));
    }
  }
}

/**
 * Generates a 768-dimensional embedding vector for a single text using Google Gemini.
 *
 * @param {string} text
 * @returns {Promise<number[]>}
 */
export async function generateEmbedding(text) {
  const clean = sanitizeText(text);
  if (!clean) {
    throw new Error('generateEmbedding requires non-empty string input');
  }

  const apiKey = (process.env.GEMINI_API_KEY || env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment variables');
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_EMBEDDING_MODEL}:embedContent?key=${apiKey}`;

  const response = await fetchWithRetry(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: `models/${GEMINI_EMBEDDING_MODEL}`,
      content: {
        parts: [{ text: clean.slice(0, 8000) }],
      },
    }),
  });


  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Embedding API failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const values = data?.embedding?.values;

  if (!Array.isArray(values) || values.length === 0) {
    throw new Error('Invalid embedding response format from Gemini API');
  }

  return values;
}

/**
 * Batch generates embeddings for multiple chunks using Google Gemini batchEmbedContents API,
 * with automatic fallback to single chunk generation and exponential retry.
 *
 * @param {string[]} texts
 * @param {number} [batchSize=10]
 * @returns {Promise<number[][]>}
 */
export async function generateEmbeddings(texts, batchSize = 10) {
  if (!Array.isArray(texts) || texts.length === 0) {
    return [];
  }

  const apiKey = (process.env.GEMINI_API_KEY || env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment variables');
  }

  const batchEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_EMBEDDING_MODEL}:batchEmbedContents?key=${apiKey}`;
  const allEmbeddings = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const chunkBatch = texts.slice(i, i + batchSize);

    try {
      const requests = chunkBatch
        .map((chunkText) => sanitizeText(chunkText))
        .filter(Boolean)
        .map((cleanText) => ({
          model: `models/${GEMINI_EMBEDDING_MODEL}`,
          content: {
            parts: [{ text: cleanText.slice(0, 8000) }],
          },
        }));

      if (requests.length === chunkBatch.length) {
        const response = await fetchWithRetry(batchEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requests }),
        });

        if (response.ok) {
          const batchData = await response.json();
          if (Array.isArray(batchData?.embeddings) && batchData.embeddings.length === chunkBatch.length) {
            for (const item of batchData.embeddings) {
              allEmbeddings.push(item.values);
            }
            continue;
          }
        }
      }
    } catch (batchErr) {
      console.warn(`[Batch Embedding] Notice: ${batchErr.message}. Falling back to sequential generation.`);
    }

    // Fallback: Generate sequentially with slight delay between calls to avoid concurrency spikes
    for (const chunkText of chunkBatch) {
      const singleEmbedding = await generateEmbedding(chunkText);
      allEmbeddings.push(singleEmbedding);
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  return allEmbeddings;
}

export const EMBEDDING_CONFIG = {
  provider: 'Google Gemini',
  model: GEMINI_EMBEDDING_MODEL,
  dimensions: EMBEDDING_DIMENSION,
};

