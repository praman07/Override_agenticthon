import { generateEmbedding } from './researchEmbedding.service.js';
import { vectorSearchChunks } from './researchVector.service.js';

/**
 * Retrieves factual evidence chunks for a research query with user authorization isolation.
 *
 * @param {string} question - The user's research inquiry
 * @param {object} options
 * @param {string} options.userId - Authenticated user ID (MANDATORY)
 * @param {string} [options.paperId] - Optional specific paper to filter within
 * @param {number} [options.topK=10] - Number of top candidate chunks to retrieve
 * @param {number} [options.threshold=0.45] - Cosine similarity threshold
 * @returns {Promise<Array<{ chunkId: string, text: string, score: number, paper: { id: string, title: string, authors: string[], year?: number }, source: { pageNumber: number, section: string | null } }>>}
 */
export async function retrieveResearchEvidence(question, options = {}) {
  const { userId, paperId = null, topK = 10, threshold = 0.45 } = options;

  if (!userId) {
    throw new Error('User isolation violation: userId is required for research retrieval');
  }

  if (!question || !question.trim()) {
    return [];
  }

  // 1. Generate query embedding using the EXACT SAME model and dimension as chunks
  const queryVector = await generateEmbedding(question.trim());

  // 2. Perform vector search in Atlas Vector Search with userId filtering
  const matchingChunks = await vectorSearchChunks({
    queryVector,
    userId,
    paperId,
    topK,
    threshold,
  });

  // 3. Format and deduplicate evidence results
  const formattedResults = matchingChunks.map((chunk) => ({
    chunkId: chunk.chunkId,
    text: chunk.text,
    score: Number((chunk.score || 0).toFixed(4)),
    paper: {
      id: chunk.paperId?.toString() || '',
      title: chunk.title || 'Untitled Paper',
      authors: Array.isArray(chunk.authors) ? chunk.authors : [],
      year: chunk.year,
    },
    source: {
      pageNumber: chunk.pageNumber,
      section: chunk.section || null,
    },
  }));

  return formattedResults;
}
