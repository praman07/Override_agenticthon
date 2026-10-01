import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb.js';
import { getAuthenticatedUser } from '@/lib/auth.js';
import { retrieveResearchEvidence } from '@/services/researchRetrieval.service.js';
import { synthesizeResearchAnswer } from '@/services/researchSynthesis.service.js';

export const runtime = 'nodejs';
export const maxDuration = 45;

export async function POST(request) {
  try {
    const user = getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required to search research papers' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const question = (body.question || '').trim();
    const filters = body.filters || {};

    if (!question) {
      return NextResponse.json(
        { error: 'A research question is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // 1. Retrieve evidence chunks using exact embedding model and Atlas Vector Search
    const topK = typeof filters.topK === 'number' ? filters.topK : 10;
    const threshold = typeof filters.threshold === 'number' ? filters.threshold : 0.45;

    const retrievedChunks = await retrieveResearchEvidence(question, {
      userId: user.id,
      paperId: filters.paperId || null,
      topK,
      threshold,
    });

    // 2. Synthesize evidence-grounded response with citation validation
    const responsePayload = await synthesizeResearchAnswer(question, retrievedChunks);

    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error('Research search endpoint error:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred during evidence search' },
      { status: 500 }
    );
  }
}
