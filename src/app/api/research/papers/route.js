import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb.js';
import { getAuthenticatedUser } from '@/lib/auth.js';
import ResearchPaper from '@/models/researchPaper.model.js';

export const runtime = 'nodejs';

export async function GET(request) {
  try {
    const user = getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const query = (searchParams.get('query') || '').trim();
    const filter = searchParams.get('filter') || 'all';

    const filterClause = { userId: user.id };

    if (query) {
      filterClause.$or = [
        { title: { $regex: query, $options: 'i' } },
        { authors: { $elemMatch: { $regex: query, $options: 'i' } } },
        { abstract: { $regex: query, $options: 'i' } },
      ];
    }

    let sortOptions = { createdAt: -1 };
    if (filter === 'recent') {
      sortOptions = { year: -1, createdAt: -1 };
    }

    const papers = await ResearchPaper.find(filterClause)
      .sort(sortOptions)
      .lean();

    const formatted = papers.map((p) => ({
      id: p._id.toString(),
      title: p.title,
      authors: p.authors || [],
      year: p.year,
      abstract: p.abstract || '',
      doi: p.doi || '',
      sourceUrl: p.sourceUrl || '',
      pageCount: p.pageCount || 0,
      chunkCount: p.chunkCount || 0,
      status: p.status === 'ready' ? 'indexed' : p.status === 'failed' ? 'failed' : 'indexing',
      sections: p.sections || {},
      tags: p.tags || [],
      createdAt: p.createdAt,
    }));

    return NextResponse.json({ papers: formatted });
  } catch (error) {
    console.error('Papers list error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch research papers' },
      { status: 500 }
    );
  }
}
