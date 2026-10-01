import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb.js';
import { getAuthenticatedUser } from '@/lib/auth.js';
import ResearchPaper from '@/models/researchPaper.model.js';
import { processResearchPaper, computeFileHash } from '@/services/researchIngestion.service.js';

export const runtime = 'nodejs';
// Allow up to 60s for OCR, chunking, and embedding on heavy papers
export const maxDuration = 60;

export async function POST(request) {
  try {
    const user = getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required to upload research papers' },
        { status: 401 }
      );
    }

    await connectDB();

    const contentType = request.headers.get('content-type') || '';
    let fileBuffer = null;
    let fileName = 'document.pdf';
    let title = '';
    let authors = [];
    let year = new Date().getFullYear();
    let doi = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file');

      if (!file || typeof file === 'string') {
        return NextResponse.json(
          { error: 'No document file provided in upload request' },
          { status: 400 }
        );
      }

      fileName = file.name || 'document.pdf';
      const arrayBuffer = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);

      if (formData.get('title')) title = formData.get('title').toString().trim();
      if (formData.get('doi')) doi = formData.get('doi').toString().trim();
      if (formData.get('year')) {
        const parsedYear = parseInt(formData.get('year').toString(), 10);
        if (!isNaN(parsedYear)) year = parsedYear;
      }
      if (formData.get('authors')) {
        try {
          const parsed = JSON.parse(formData.get('authors').toString());
          if (Array.isArray(parsed)) authors = parsed;
        } catch {
          authors = formData.get('authors').toString().split(',').map((a) => a.trim()).filter(Boolean);
        }
      }
    } else {
      // JSON body with base64 data
      const body = await request.json();
      if (!body.data) {
        return NextResponse.json(
          { error: 'No base64 document data provided' },
          { status: 400 }
        );
      }

      const base64Content = body.data.includes(',')
        ? body.data.split(',')[1]
        : body.data;
      fileBuffer = Buffer.from(base64Content, 'base64');
      fileName = body.fileName || body.name || 'document.pdf';
      if (body.title) title = body.title.trim();
      if (body.authors && Array.isArray(body.authors)) authors = body.authors;
      if (body.year) year = Number(body.year);
      if (body.doi) doi = body.doi.trim();
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return NextResponse.json(
        { error: 'Uploaded file is empty' },
        { status: 400 }
      );
    }

    // Size limit: 25MB
    if (fileBuffer.length > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size exceeds maximum permitted limit of 25MB' },
        { status: 400 }
      );
    }

    // Phase 13: Deduplication via SHA-256 hash
    const fileHash = computeFileHash(fileBuffer);
    const existingPaper = await ResearchPaper.findOne({
      userId: user.id,
      fileHash,
    });

    if (existingPaper && existingPaper.status === 'ready') {
      return NextResponse.json({
        success: true,
        message: 'Identical paper already indexed in your repository.',
        paper: {
          id: existingPaper._id.toString(),
          title: existingPaper.title,
          authors: existingPaper.authors,
          year: existingPaper.year,
          abstract: existingPaper.abstract,
          pageCount: existingPaper.pageCount,
          chunkCount: existingPaper.chunkCount,
          status: existingPaper.status,
          isDuplicate: true,
        },
      });
    }

    // Create ResearchPaper record
    const paper = await ResearchPaper.create({
      userId: user.id,
      title: title || fileName.replace(/\.[^/.]+$/, ''),
      authors,
      year,
      doi,
      originalFileName: fileName,
      fileHash,
      status: 'uploaded',
    });

    // Execute processing pipeline
    try {
      const processed = await processResearchPaper(paper._id, fileBuffer, {
        originalFileName: fileName,
        title,
        authors,
        year,
        doi,
      });

      return NextResponse.json({
        success: true,
        message: 'Research paper successfully ingested, chunked, and vector indexed.',
        paper: {
          id: processed._id.toString(),
          title: processed.title,
          authors: processed.authors,
          year: processed.year,
          abstract: processed.abstract,
          pageCount: processed.pageCount,
          chunkCount: processed.chunkCount,
          status: processed.status,
          sections: Object.keys(processed.sections || {}),
        },
      });
    } catch (ingestError) {
      return NextResponse.json(
        {
          error: `Processing error: ${ingestError.message}`,
          paperId: paper._id.toString(),
          status: 'failed',
        },
        { status: 422 }
      );
    }
  } catch (error) {
    console.error('Upload endpoint error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error processing paper upload' },
      { status: 500 }
    );
  }
}
