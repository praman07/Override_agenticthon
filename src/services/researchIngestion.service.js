import connectDB from '@/lib/mongodb.js';
import ResearchPaper from '@/models/researchPaper.model.js';
import ResearchChunk from '@/models/researchChunk.model.js';
import { extractPagesFromPdf, computeFileHash, extractHeuristicMetadata } from './researchOCR.service.js';
import { chunkPagesAware } from './researchChunker.js';
import { generateEmbeddings } from './researchEmbedding.service.js';
import { ensureVectorIndex } from './researchVector.service.js';

/**
 * Executes the complete ingestion pipeline for a research paper:
 * 1. Extract pages (Mistral OCR or pdf-parse fallback)
 * 2. Section detection & page-aware chunking
 * 3. Embedding generation (Gemini embedding 768-dim)
 * 4. Storing chunks in MongoDB & ensuring vector indexing
 * 5. Update ResearchPaper status to 'ready'
 *
 * @param {string} paperId - MongoDB ObjectId string of the ResearchPaper
 * @param {Buffer} fileBuffer - PDF file buffer
 * @param {object} [metadataOverrides]
 * @returns {Promise<object>} Updated ResearchPaper document
 */
export async function processResearchPaper(paperId, fileBuffer, metadataOverrides = {}) {
  await connectDB();

  const paper = await ResearchPaper.findById(paperId);
  if (!paper) {
    throw new Error(`ResearchPaper not found: ${paperId}`);
  }

  try {
    // 1. Status: processing -> extracting
    paper.status = 'extracting';
    paper.processingError = '';
    await paper.save();

    const fileName = metadataOverrides.originalFileName || paper.originalFileName || 'document.pdf';
    const { pages, pageCount } = await extractPagesFromPdf(fileBuffer, fileName);

    if (!pages || pages.length === 0) {
      throw new Error('No readable text content extracted from document.');
    }

    paper.pageCount = pageCount;

    // Heuristically extract title/abstract if missing
    if (pages[0] && (!paper.title || paper.title === 'Untitled Paper')) {
      const heuristic = extractHeuristicMetadata(pages[0].text, fileName);
      if (heuristic.title && (!paper.title || paper.title === 'Untitled Paper')) {
        paper.title = heuristic.title;
      }
      if (heuristic.abstract && !paper.abstract) {
        paper.abstract = heuristic.abstract;
      }
    }

    // Apply metadata overrides if user provided custom title/authors/year
    if (metadataOverrides.title) paper.title = metadataOverrides.title;
    if (metadataOverrides.authors?.length) paper.authors = metadataOverrides.authors;
    if (metadataOverrides.year) paper.year = metadataOverrides.year;
    if (metadataOverrides.doi) paper.doi = metadataOverrides.doi;

    // 2. Status: chunking
    paper.status = 'chunking';
    await paper.save();

    const { chunks: rawChunks, detectedSections } = chunkPagesAware(pages, paper._id.toString(), {
      chunkSize: 1200,
      chunkOverlap: 200,
    });

    if (rawChunks.length === 0) {
      throw new Error('No text chunks could be produced from document pages.');
    }

    paper.sections = detectedSections;
    paper.chunkCount = rawChunks.length;

    // 3. Status: embedding
    paper.status = 'embedding';
    await paper.save();

    // Generate embeddings in high-speed parallel batches
    const chunkTexts = rawChunks.map((c) => c.text);
    const embeddings = await generateEmbeddings(chunkTexts, 8);

    if (embeddings.length !== rawChunks.length) {
      throw new Error('Embedding count mismatch with chunks.');
    }

    // 4. Status: indexing
    paper.status = 'indexing';
    await paper.save();

    // Remove any previous chunks for this paper (idempotent / stable updates)
    await ResearchChunk.deleteMany({ paperId: paper._id });

    // Prepare chunk documents
    const chunkDocs = rawChunks.map((chunk, index) => ({
      paperId: paper._id,
      userId: paper.userId,
      chunkId: chunk.chunkId,
      chunkIndex: chunk.chunkIndex,
      pageNumber: chunk.pageNumber,
      section: chunk.section,
      text: chunk.text,
      embedding: embeddings[index],
      title: paper.title,
      authors: paper.authors,
      year: paper.year,
    }));

    await ResearchChunk.insertMany(chunkDocs);

    // Non-blocking background vector index verification
    ensureVectorIndex().catch((idxErr) => {
      console.warn('Atlas vector search index notice:', idxErr.message);
    });

    // 5. Status: ready
    paper.status = 'ready';
    paper.processingError = '';
    await paper.save();

    return paper;
  } catch (err) {
    console.error(`Paper ingestion failed for ${paperId}:`, err);
    paper.status = 'failed';
    paper.processingError = err.message || 'Unknown processing error';
    await paper.save();
    throw err;
  }
}

export { computeFileHash };
