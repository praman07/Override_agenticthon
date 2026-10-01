'use client';

import React, { useEffect, useState, useRef } from 'react';
import ResearchHeader from '@/components/research/ResearchHeader.jsx';
import PaperCard from '@/components/research/PaperCard.jsx';
import researchService from '@/features/research/researchService.js';

export default function PaperLibraryPage() {
  const [papers, setPapers] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    let ignore = false;
    async function loadPapers() {
      try {
        const data = await researchService.getPapers({ query: searchQuery, filter });
        if (!ignore) {
          setPapers(data);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    loadPapers();
    return () => {
      ignore = true;
    };
  }, [searchQuery, filter]);

  const reloadPapers = async () => {
    setLoading(true);
    try {
      const data = await researchService.getPapers({ query: searchQuery, filter });
      setPapers(data);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadStatus('Uploading PDF and extracting pages with Mistral OCR...');
    try {
      const formData = new FormData();
      formData.append('file', file);

      setUploadStatus('Extracting pages, detecting sections & generating vector embeddings...');
      await researchService.uploadPaper(formData);

      setUploadStatus('Indexing complete!');
      setTimeout(() => {
        setShowUploadModal(false);
        setUploading(false);
        setUploadStatus('');
        reloadPapers();
      }, 1000);
    } catch (err) {
      alert(`Upload error: ${err.message}`);
      setUploading(false);
      setUploadStatus('');
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <ResearchHeader
        title="Scholarly Paper Repository"
        description="Explore, filter, and review indexed papers available for factual evidence extraction."
        actions={
          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="rounded-xl bg-zinc-100 px-3.5 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 transition"
          >
            + Upload PDF / Document
          </button>
        }
      />

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-zinc-100">Upload Research Paper</h3>
              <button
                type="button"
                onClick={() => !uploading && setShowUploadModal(false)}
                className="text-zinc-400 hover:text-zinc-200 text-sm"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-zinc-400">
              Select a research paper PDF. The document will undergo page-aware extraction, section detection, 768-dim vector embedding, and MongoDB Atlas Vector Search indexing.
            </p>

            <div
              onClick={() => !uploading && fileInputRef.current?.click()}
              className="border-2 border-dashed border-white/20 rounded-2xl p-8 text-center cursor-pointer hover:border-amber-400/50 hover:bg-white/[0.02] transition"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
              />
              <div className="text-3xl mb-2">📄</div>
              <p className="text-xs font-medium text-zinc-200">
                {uploading ? 'Processing Document...' : 'Click to browse PDF file'}
              </p>
              <p className="text-[11px] text-zinc-500 mt-1">Maximum size 25MB • PDF format</p>
            </div>

            {uploadStatus && (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-300 flex items-center gap-2">
                <span className="animate-spin text-sm">⏳</span>
                <span>{uploadStatus}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-6">
        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, author, or keyword..."
              className="w-full rounded-2xl border border-white/15 bg-zinc-900 px-4 py-2.5 text-xs text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-amber-400"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
            {[
              { id: 'all', label: 'All Papers' },
              { id: 'recent', label: 'Recently Added' },
              { id: 'neuro', label: 'Neuroscience' },
              { id: 'plasticity', label: 'Synaptic Plasticity' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl font-medium transition ${
                  filter === tab.id
                    ? 'bg-zinc-100 text-zinc-900'
                    : 'bg-zinc-900 border border-white/5 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Papers List / Grid */}
        {loading ? (
          <div className="py-20 text-center text-xs text-zinc-500">
            Filtering repository index...
          </div>
        ) : papers.length === 0 ? (
          <div className="py-20 text-center rounded-3xl border border-dashed border-white/10 p-8 space-y-3">
            <span className="text-3xl">📭</span>
            <h3 className="text-base font-semibold text-zinc-200">No matching papers found</h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Try adjusting your query or filter criteria, or upload new PDF documents to the repository.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {papers.map((paper) => (
              <PaperCard key={paper.id} paper={paper} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
