import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb.js';
import { getAuthenticatedUser } from '@/lib/auth.js';
import ResearchPaper from '@/models/researchPaper.model.js';
import ResearchChunk from '@/models/researchChunk.model.js';

export const runtime = 'nodejs';

export async function GET(request, { params }) {
  try {
    const user = getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { paperId } = await params;
    if (!paperId || !mongoose.isValidObjectId(paperId)) {
      return NextResponse.json({ error: 'Invalid paper ID' }, { status: 400 });
    }

    await connectDB();

    const paper = await ResearchPaper.findOne({
      _id: paperId,
      userId: user.id,
    }).lean();

    if (!paper) {
      return NextResponse.json({ error: 'Paper not found or unauthorized' }, { status: 404 });
    }

    // Also fetch sample chunk count / page list
    const chunks = await ResearchChunk.find({ paperId: paper._id, userId: user.id })
      .select('chunkId pageNumber section chunkIndex text')
      .sort({ chunkIndex: 1 })
      .limit(50)
      .lean();

    return NextResponse.json({
      paper: {
        id: paper._id.toString(),
        title: paper.title,
        authors: paper.authors || [],
        year: paper.year,
        abstract: paper.abstract || '',
        doi: paper.doi || '',
        sourceUrl: paper.sourceUrl || '',
        pageCount: paper.pageCount || 0,
        chunkCount: paper.chunkCount || 0,
        status: paper.status === 'ready' ? 'indexed' : paper.status === 'failed' ? 'failed' : 'indexing',
        processingError: paper.processingError || null,
        sections: paper.sections || {},
        chunks: chunks.map((c) => ({
          chunkId: c.chunkId,
          pageNumber: c.pageNumber,
          section: c.section,
          chunkIndex: c.chunkIndex,
          preview: c.text.slice(0, 200) + '...',
        })),
        createdAt: paper.createdAt,
      },
    });
  } catch (error) {
    console.error('Paper detail error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch paper details' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { paperId } = await params;
    if (!paperId || !mongoose.isValidObjectId(paperId)) {
      return NextResponse.json({ error: 'Invalid paper ID' }, { status: 400 });
    }

    await connectDB();

    const paper = await ResearchPaper.findOne({
      _id: paperId,
      userId: user.id,
    });

    if (!paper) {
      return NextResponse.json({ error: 'Paper not found or unauthorized' }, { status: 404 });
    }

    // Delete associated vector chunks
    await ResearchChunk.deleteMany({ paperId: paper._id, userId: user.id });

    // Delete paper
    await ResearchPaper.deleteOne({ _id: paper._id });

    return NextResponse.json({
      success: true,
      message: 'Paper and associated vector chunks removed successfully',
    });
  } catch (error) {
    console.error('Paper delete error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete paper' },
      { status: 500 }
    );
  }
}
