import mongoose from 'mongoose';

const researchPaperSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    authors: {
      type: [String],
      default: [],
    },
    abstract: {
      type: String,
      default: '',
    },
    year: {
      type: Number,
      default: () => new Date().getFullYear(),
    },
    doi: {
      type: String,
      default: '',
      trim: true,
    },
    sourceUrl: {
      type: String,
      default: '',
    },
    originalFileName: {
      type: String,
      default: '',
    },
    fileReference: {
      type: String,
      default: '',
    },
    fileHash: {
      type: String,
      default: '',
      index: true,
    },
    pageCount: {
      type: Number,
      default: 0,
    },
    chunkCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: [
        'uploaded',
        'processing',
        'extracting',
        'chunking',
        'embedding',
        'indexing',
        'ready',
        'failed',
      ],
      default: 'uploaded',
      index: true,
    },
    processingError: {
      type: String,
      default: '',
    },
    sections: {
      type: Map,
      of: String,
      default: {},
    },
    tags: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for user deduplication checks
researchPaperSchema.index({ userId: 1, title: 1 });
researchPaperSchema.index({ userId: 1, doi: 1 });
researchPaperSchema.index({ userId: 1, fileHash: 1 });

const ResearchPaper =
  mongoose.models.ResearchPaper || mongoose.model('ResearchPaper', researchPaperSchema);

export default ResearchPaper;
