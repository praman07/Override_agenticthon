/**
 * Vector database client and operations for MongoDB Atlas Vector Search.
 * Server-side only.
 */

import {
  ensureVectorIndex,
  vectorSearchChunks,
  cosineSimilarity,
  VECTOR_INDEX_NAME,
  EMBEDDING_DIMENSION,
} from '@/services/researchVector.service.js';

export async function getVectorStore() {
  await ensureVectorIndex();
  return {
    indexName: VECTOR_INDEX_NAME,
    dimension: EMBEDDING_DIMENSION,
    search: vectorSearchChunks,
  };
}

export {
  ensureVectorIndex,
  vectorSearchChunks,
  cosineSimilarity,
  VECTOR_INDEX_NAME,
  EMBEDDING_DIMENSION,
};

const vectorService = {
  getVectorStore,
  ensureVectorIndex,
  vectorSearchChunks,
};

export default vectorService;
