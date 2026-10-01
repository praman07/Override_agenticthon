import mongoose from 'mongoose';

const researchChunkSchema = new mongoose.Schema(
  {
    paperId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ResearchPaper',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    chunkId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    chunkIndex: {
      type: Number,
      required: true,
    },
    pageNumber: {
      type: Number,
      required: true,
      index: true,
    },
    section: {
      type: String,
      default: null,
    },
    text: {
      type: String,
      required: true,
    },
    embedding: {
      type: [Number],
      required: true,
      // 768-dimensional vector
    },
    title: {
      type: String,
      default: '',
    },
    authors: {
      type: [String],
      default: [],
    },
    year: {
      type: Number,
    },
  },
  {
    timestamps: true,
    collection: 'research_chunks',
  }
);

// Compound indexes for user isolation and fast retrieval
researchChunkSchema.index({ userId: 1, paperId: 1 });
researchChunkSchema.index({ paperId: 1, pageNumber: 1 });

const ResearchChunk =
  mongoose.models.ResearchChunk || mongoose.model('ResearchChunk', researchChunkSchema);

export default ResearchChunk;
