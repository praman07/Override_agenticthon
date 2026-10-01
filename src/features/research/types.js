/**
 * Frontend types and data structures for the AI Research Paper Discovery & Evidence Assistant.
 * Isolated from backend and MongoDB models for future RAG API alignment.
 */

/**
 * @typedef {Object} Paper
 * @property {string} id
 * @property {string} title
 * @property {string[]} authors
 * @property {number} year
 * @property {string} abstract
 * @property {string} [doi]
 * @property {string} [sourceUrl]
 * @property {number} pageCount
 * @property {'indexed' | 'indexing' | 'pending'} status
 * @property {string[]} [tags]
 * @property {number} [chunkCount]
 * @property {string} [journal]
 * @property {Record<string, string>} [sections]
 */

/**
 * @typedef {Object} EvidenceSource
 * @property {string} id
 * @property {string} paperId
 * @property {string} paperTitle
 * @property {string[]} authors
 * @property {number} year
 * @property {number} pageNumber
 * @property {string} section
 * @property {string} [chunkId]
 * @property {string} [sourceUrl]
 * @property {string} text
 * @property {number} relevanceScore
 */

/**
 * @typedef {Object} EvidenceClaim
 * @property {string} id
 * @property {string} text
 * @property {string[]} sourceIds
 */

/**
 * @typedef {Object} ResearchResponse
 * @property {string} question
 * @property {string} summary
 * @property {number} confidence
 * @property {boolean} insufficientEvidence
 * @property {string[]} [insufficientReasons]
 * @property {EvidenceClaim[]} claims
 * @property {EvidenceSource[]} sources
 */

/**
 * @typedef {Object} PaperComparisonItem
 * @property {string} finding
 * @property {Record<string, { summary: string, excerpt: string, methodology: string, stance: 'supports' | 'contradicts' | 'neutral' }>} papers
 */

export const PaperStatus = {
  INDEXED: 'indexed',
  INDEXING: 'indexing',
  PENDING: 'pending',
};
