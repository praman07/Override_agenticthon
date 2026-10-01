import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb.js';
import ResearchChunk from '@/models/researchChunk.model.js';

export const VECTOR_INDEX_NAME = 'research_chunks_vector_index';
export const EMBEDDING_DIMENSION = 768;

/**
 * Ensures the Atlas Vector Search index exists on the research_chunks collection.
 */
export async function ensureVectorIndex() {
  await connectDB();
  const db = mongoose.connection.db;
  if (!db) return false;

  try {
    const collection = db.collection('research_chunks');
    const indexesCursor = collection.listSearchIndexes();
    const existing = await indexesCursor.toArray();

    const found = existing.find((idx) => idx.name === VECTOR_INDEX_NAME);
    if (found) {
      return true;
    }

    // Create Atlas Vector Search index definition
    await collection.createSearchIndex({
      name: VECTOR_INDEX_NAME,
      type: 'vectorSearch',
      definition: {
        fields: [
          {
            type: 'vector',
            path: 'embedding',
            numDimensions: EMBEDDING_DIMENSION,
            similarity: 'cosine',
          },
          {
            type: 'filter',
            path: 'userId',
          },
          {
            type: 'filter',
            path: 'paperId',
          },
        ],
      },
    });

    return true;
  } catch (err) {
    console.warn(`Vector index creation notice: ${err.message}`);
    return false;
  }
}

/**
 * Computes exact cosine similarity between two numeric vectors.
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number}
 */
export function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Performs vector search using MongoDB Atlas $vectorSearch stage with user isolation filter.
 * Falls back seamlessly to exact in-memory cosine ranking if Atlas search index is initializing.
 *
 * @param {object} params
 * @param {number[]} params.queryVector - 768-dim query embedding
 * @param {string} params.userId - Authenticated user ID
 * @param {number} [params.topK=10]
 * @param {number} [params.threshold=0.55] - Configurable cosine similarity threshold
 * @param {string} [params.paperId] - Optional paper ID filter
 * @returns {Promise<Array<object>>}
 */
export async function vectorSearchChunks({
  queryVector,
  userId,
  topK = 10,
  threshold = 0.55,
  paperId = null,
}) {
  await connectDB();
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection unavailable');
  }

  const userObjectId = new mongoose.Types.ObjectId(userId);
  const filterClause = { userId: userObjectId };
  if (paperId) {
    filterClause.paperId = new mongoose.Types.ObjectId(paperId);
  }

  // 1. Attempt Atlas $vectorSearch
  try {
    const collection = db.collection('research_chunks');
    const pipeline = [
      {
        $vectorSearch: {
          index: VECTOR_INDEX_NAME,
          path: 'embedding',
          queryVector,
          numCandidates: Math.max(topK * 10, 100),
          limit: topK * 2,
          filter: filterClause,
        },
      },
      {
        $project: {
          chunkId: 1,
          paperId: 1,
          userId: 1,
          pageNumber: 1,
          section: 1,
          chunkIndex: 1,
          text: 1,
          title: 1,
          authors: 1,
          year: 1,
          score: { $meta: 'vectorSearchScore' },
        },
      },
    ];

    const results = await collection.aggregate(pipeline).toArray();

    if (results && results.length > 0) {
      // Filter by similarity score threshold and limit to topK
      return results
        .filter((r) => (r.score != null ? r.score >= threshold : true))
        .slice(0, topK);
    }
  } catch (atlasErr) {
    console.warn(`Atlas $vectorSearch notice: ${atlasErr.message}. Executing exact fallback calculation.`);
  }

  // 2. Exact fallback ranking for user's chunks
  const query = { userId: userObjectId };
  if (paperId) {
    query.paperId = new mongoose.Types.ObjectId(paperId);
  }

  const candidateChunks = await ResearchChunk.find(query)
    .select('chunkId paperId userId pageNumber section chunkIndex text embedding title authors year')
    .lean();

  if (!candidateChunks || candidateChunks.length === 0) {
    return [];
  }

  const scored = candidateChunks.map((chunk) => ({
    chunkId: chunk.chunkId,
    paperId: chunk.paperId,
    userId: chunk.userId,
    pageNumber: chunk.pageNumber,
    section: chunk.section,
    chunkIndex: chunk.chunkIndex,
    text: chunk.text,
    title: chunk.title,
    authors: chunk.authors,
    year: chunk.year,
    score: cosineSimilarity(queryVector, chunk.embedding),
  }));

  // Sort descending by cosine similarity score
  scored.sort((a, b) => b.score - a.score);

  return scored.filter((r) => r.score >= threshold).slice(0, topK);
}
