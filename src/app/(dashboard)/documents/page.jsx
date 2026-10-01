'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useAuth from '@/features/auth/hooks/useAuth.js';
import useChat from '@/features/chat/hooks/useChat.js';
import Spinner from '@/components/ui/spinner.jsx';

export default function DocumentsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { startNewChat } = useChat();

  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState('all');

  // Upload states
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null); // { step: string, fileName: string }
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);

  // Preview modal states
  const [previewPaper, setPreviewPaper] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  // Delete modal state
  const [deletingId, setDeletingId] = useState(null);
  const [deleteConfirmPaper, setDeleteConfirmPaper] = useState(null);

  // Fetch all documents for user
  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/research/papers', {
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        setPapers(data.papers || []);
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Handle file upload
  const handleUploadFiles = async (files) => {
    if (!files || files.length === 0) return;
    setUploadError(null);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setIsUploading(true);
      setUploadProgress({
        fileName: file.name,
        step: 'Uploading & Extracting text (OCR / Parsing)...',
      });

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', file.name.replace(/\.[^/.]+$/, ''));

        const response = await fetch('/api/research/papers/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to process document');
        }

        setUploadProgress({
          fileName: file.name,
          step: 'Vector embeddings generated & stored in MongoDB Atlas!',
        });
      } catch (err) {
        console.error('Upload error:', err);
        setUploadError(`Error uploading ${file.name}: ${err.message}`);
        break;
      }
    }

    setIsUploading(false);
    setUploadProgress(null);
    fetchDocuments();
  };

  // Drag & drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUploadFiles(e.dataTransfer.files);
    }
  };

  // Preview paper details and chunks
  const handleOpenPreview = async (paper) => {
    setPreviewPaper(paper);
    setPreviewLoading(true);
    setPreviewData(null);
    try {
      const res = await fetch(`/api/research/papers/${paper.id}`);
      if (res.ok) {
        const data = await res.json();
        setPreviewData(data.paper);
      }
    } catch (err) {
      console.error('Failed to fetch preview details:', err);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Delete paper
  const handleDeletePaper = async (paperId) => {
    setDeletingId(paperId);
    try {
      const res = await fetch(`/api/research/papers/${paperId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setPapers((prev) => prev.filter((p) => p.id !== paperId));
        setDeleteConfirmPaper(null);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete document');
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert(err.message || 'Failed to delete document');
    } finally {
      setDeletingId(null);
    }
  };

  // Open chat and tag paper in chat prompt
  const handleChatWithDoc = (paper) => {
    if (!paper) return;
    try {
      sessionStorage.setItem(
        'tagged_document',
        JSON.stringify({
          id: paper.id,
          title: paper.title,
          chunkCount: paper.chunkCount || 0,
        })
      );
    } catch (e) {
      console.warn('Failed saving tagged document:', e);
    }
    startNewChat();
    router.push('/chat');
  };

  // Filter documents
  const filteredPapers = papers.filter((p) => {
    const matchesSearch =
      !searchQuery ||
      p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.abstract?.toLowerCase().includes(searchQuery.toLowerCase());

    const lowerTitle = (p.title || '').toLowerCase();
    if (formatFilter === 'pdf') return matchesSearch && (lowerTitle.endsWith('.pdf') || p.pageCount > 0);
    if (formatFilter === 'docx') return matchesSearch && (lowerTitle.endsWith('.docx') || lowerTitle.endsWith('.doc'));
    if (formatFilter === 'txt') return matchesSearch && (lowerTitle.endsWith('.txt') || lowerTitle.endsWith('.md'));
    return matchesSearch;
  });

  const getFormatBadge = (title = '') => {
    const lower = title.toLowerCase();
    if (lower.endsWith('.pdf')) return { label: 'PDF', bg: 'bg-zinc-800 text-zinc-100 border-zinc-700' };
    if (lower.endsWith('.docx') || lower.endsWith('.doc')) return { label: 'DOCX', bg: 'bg-zinc-800/90 text-zinc-200 border-zinc-700' };
    if (lower.endsWith('.txt')) return { label: 'TXT', bg: 'bg-zinc-900 text-zinc-300 border-zinc-800' };
    if (lower.endsWith('.md')) return { label: 'MD', bg: 'bg-zinc-900 text-zinc-300 border-zinc-800' };
    if (lower.endsWith('.pptx')) return { label: 'PPTX', bg: 'bg-zinc-800 text-zinc-200 border-zinc-700' };
    return { label: 'DOC', bg: 'bg-zinc-800 text-zinc-300 border-zinc-700' };
  };

  const totalChunks = papers.reduce((sum, p) => sum + (p.chunkCount || 0), 0);

  return (
    <div className="flex-1 h-screen overflow-y-auto bg-black text-zinc-100 chat-scrollbar">
      {/* Background radial gradient glow (Aceternity UI style) */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.08),rgba(255,255,255,0))]" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-10 space-y-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-8">
          <div className="space-y-3">
            
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white">
              Document Vault
            </h1>
      
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                startNewChat();
                router.push('/chat');
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/20 bg-zinc-900 text-sm font-medium text-white hover:bg-zinc-800 hover:border-white/30 transition shadow-sm"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>Go to Chat</span>
            </button>
          </div>
        </div>


        {/* Aceternity Style File Upload Dropzone */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Upload & Vectorize Document
          </h2>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className={`relative group cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed p-8 sm:p-12 text-center transition duration-300 ${
              isDragging
                ? 'border-white bg-white/10 scale-[1.005]'
                : 'border-white/15 bg-zinc-950/40 hover:border-white/30 hover:bg-zinc-900/40'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleUploadFiles(e.target.files)}
              className="hidden"
              multiple
              accept=".pdf,.docx,.pptx,.txt,.md,.doc"
            />

            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-zinc-900 text-zinc-200 group-hover:scale-110 group-hover:border-white/30 transition duration-300">
                {isUploading ? (
                  <Spinner className="h-6 w-6 text-white" />
                ) : (
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-base font-medium text-white">
                  {isUploading ? 'Processing Document...' : 'Drag & drop files here, or click to browse'}
                </p>
                <p className="text-xs text-zinc-400">
                  Supports real <span className="text-zinc-200 font-semibold">PDF</span>, <span className="text-zinc-200 font-semibold">DOCX</span>, <span className="text-zinc-200 font-semibold">PPTX</span>, <span className="text-zinc-200 font-semibold">TXT</span>, and <span className="text-zinc-200 font-semibold">Markdown</span> files (up to 25MB)
                </p>
              </div>

              {/* Uploading progress notification */}
              {isUploading && uploadProgress && (
                <div className="w-full max-w-md mt-4 rounded-xl border border-white/15 bg-zinc-900/90 p-3.5 space-y-2 text-left">
                  <div className="flex items-center justify-between text-xs text-zinc-200">
                    <span className="font-mono truncate">{uploadProgress.fileName}</span>
                    <span className="flex items-center gap-1.5 text-zinc-300 font-medium">
                      <Spinner className="h-3.5 w-3.5 text-zinc-300" />
                      Processing
                    </span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-white h-1.5 rounded-full animate-pulse w-3/4" />
                  </div>
                  <p className="text-[11px] text-zinc-400">{uploadProgress.step}</p>
                </div>
              )}

              {uploadError && (
                <div className="w-full max-w-md mt-3 p-3 rounded-xl border border-rose-500/30 bg-rose-950/20 text-xs text-rose-300 text-left">
                  {uploadError}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {['all', 'pdf', 'docx', 'txt'].map((fmt) => (
              <button
                key={fmt}
                onClick={() => setFormatFilter(fmt)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-medium uppercase tracking-wider transition ${
                  formatFilter === fmt
                    ? 'border-white bg-white text-black'
                    : 'border-white/10 bg-zinc-900/60 text-zinc-400 hover:border-white/20 hover:text-white'
                }`}
              >
                {fmt === 'all' ? 'All Files' : fmt.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search uploaded files..."
              className="w-full rounded-xl border border-white/15 bg-zinc-950 px-3.5 py-2 pl-9 text-xs text-white placeholder-zinc-500 focus:border-white focus:outline-none transition"
            />
            <svg
              className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Document Cards List / Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Uploaded Documents ({filteredPapers.length})
            </h2>
            <button
              onClick={fetchDocuments}
              className="text-xs text-zinc-400 hover:text-white transition flex items-center gap-1.5"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh</span>
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-36 rounded-2xl border border-white/10 bg-zinc-950/40 animate-pulse" />
              ))}
            </div>
          ) : filteredPapers.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-zinc-950/40 p-12 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-zinc-900 text-zinc-500">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-zinc-300">No documents found</p>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                {searchQuery
                  ? 'No documents match your search query.'
                  : 'Upload your first PDF or Word document above to enable automatic retrieval in your chats.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPapers.map((paper) => {
                const badge = getFormatBadge(paper.title);
                return (
                  <div
                    key={paper.id}
                    className="group relative flex flex-col justify-between rounded-2xl border border-white/10 bg-zinc-950/80 p-5 hover:border-white/25 hover:bg-zinc-900/40 transition duration-200"
                  >
                    <div className="space-y-3">
                      {/* Top tags */}
                      <div className="flex items-center justify-between gap-2">
                        <span className={`px-2 py-0.5 rounded-md border text-[10px] font-mono font-semibold uppercase ${badge.bg}`}>
                          {badge.label}
                        </span>

                        <div className="flex items-center gap-1.5">
                         
                          <span className="text-[11px] font-medium text-zinc-400 capitalize">
                            {paper.status === 'indexed' ? 'Ready for Chat' : paper.status}
                          </span>
                        </div>
                      </div>

                      {/* Title & Preview */}
                      <div>
                        <h3 className="text-base font-semibold text-white line-clamp-1 group-hover:text-zinc-100 transition">
                          {paper.title || 'Untitled Document'}
                        </h3>
                        <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                          {paper.abstract || 'Content indexed and available for vector search.'}
                        </p>
                      </div>

                      {/* Badges */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-white/5 text-zinc-400">
                          {paper.chunkCount || 0} chunks
                        </span>
                        {paper.pageCount > 0 && (
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-white/5 text-zinc-400">
                            {paper.pageCount} pages
                          </span>
                        )}
                        <span className="text-[11px] text-zinc-500 ml-auto">
                          {paper.createdAt ? new Date(paper.createdAt).toLocaleDateString() : 'Uploaded'}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="flex items-center justify-between gap-2 pt-4 mt-3 border-t border-white/5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenPreview(paper)}
                          className="px-2.5 py-1 rounded-lg border border-white/10 bg-zinc-900 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 transition"
                        >
                          View Chunks
                        </button>
                        <button
                          type="button"
                          onClick={() => handleChatWithDoc(paper)}
                          className="px-3 py-1 rounded-lg border border-white/20 bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition flex items-center gap-1 shadow-sm"
                          title={`Chat with ${paper.title}`}
                        >
                          <span>Chat →</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setDeleteConfirmPaper(paper)}
                        className="p-1 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-800/80 transition"
                        title="Delete document"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {previewPaper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-white/15 bg-zinc-950 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-semibold text-white line-clamp-1">
                  {previewPaper.title}
                </h3>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">
                  ID: {previewPaper.id} · {previewPaper.chunkCount || 0} Vector Chunks
                </p>
              </div>
              <button
                onClick={() => setPreviewPaper(null)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 chat-scrollbar pr-2">
              {previewLoading ? (
                <div className="py-12 text-center text-xs text-zinc-400 animate-pulse">
                  Loading indexed chunks from database...
                </div>
              ) : previewData?.chunks?.length ? (
                previewData.chunks.map((chunk, idx) => (
                  <div
                    key={chunk.chunkId || idx}
                    className="rounded-xl border border-white/10 bg-zinc-900/60 p-4 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                      <span>Chunk #{chunk.chunkIndex + 1} {chunk.section ? `· ${chunk.section}` : ''}</span>
                      <span>Page {chunk.pageNumber || 1}</span>
                    </div>
                    <p className="text-xs text-zinc-200 leading-relaxed font-sans">
                      {chunk.preview}
                    </p>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center text-xs text-zinc-400">
                  {previewData?.abstract || 'No chunk preview available.'}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setPreviewPaper(null)}
                className="px-4 py-2 rounded-xl border border-white/10 bg-zinc-900 text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setPreviewPaper(null);
                  handleChatWithDoc(previewPaper);
                }}
                className="px-4 py-2 rounded-xl border border-white bg-white text-xs font-medium text-black hover:bg-zinc-200 transition"
              >
                Start Chat with Document
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmPaper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-rose-500/20 bg-zinc-950 p-6 space-y-4 shadow-2xl">
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-white">Delete Document</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Are you sure you want to delete <span className="text-white font-medium">"{deleteConfirmPaper.title}"</span>? This will permanently remove the document and purge its vector embeddings from MongoDB Atlas.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmPaper(null)}
                className="px-4 py-2 rounded-xl border border-white/10 bg-zinc-900 text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeletePaper(deleteConfirmPaper.id)}
                disabled={deletingId === deleteConfirmPaper.id}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-medium text-white transition disabled:opacity-50"
              >
                {deletingId === deleteConfirmPaper.id ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
