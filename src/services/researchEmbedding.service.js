import env from '@/lib/env.js';

const GEMINI_EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';
const EMBEDDING_DIMENSION = 768;

/**
 * Generates a 768-dimensional embedding vector for a single text using Google Gemini.
 * The SAME model and dimension MUST be used for both document chunks and user queries.
 *
 * @param {string} text
 * @returns {Promise<number[]>}
 */
export async function generateEmbedding(text) {
  if (!text || typeof text !== 'string' || !text.trim()) {
    throw new Error('generateEmbedding requires non-empty string input');
  }

  const apiKey = (process.env.GEMINI_API_KEY || env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment variables');
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_EMBEDDING_MODEL}:embedContent?key=${apiKey}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: `models/${GEMINI_EMBEDDING_MODEL}`,
      content: {
        parts: [{ text: text.slice(0, 8000) }],
      },
      outputDimensionality: EMBEDDING_DIMENSION,
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
 * Batch generates embeddings for multiple chunks sequentially or in parallel chunks.
 *
 * @param {string[]} texts
 * @param {number} [batchSize=5]
 * @returns {Promise<number[][]>}
 */
export async function generateEmbeddings(texts, batchSize = 5) {
  const results = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchPromises = batch.map((t) => generateEmbedding(t));
    const batchEmbeddings = await Promise.all(batchPromises);
    results.push(...batchEmbeddings);
  }
  return results;
}

export const EMBEDDING_CONFIG = {
  provider: 'Google Gemini',
  model: GEMINI_EMBEDDING_MODEL,
  dimensions: EMBEDDING_DIMENSION,
};
