'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import ResearchHeader from '@/components/research/ResearchHeader.jsx';
import researchService from '@/features/research/researchService.js';

export default function PaperDetailPage({ params }) {
  const unwrappedParams = use(params);
  const paperId = unwrappedParams.paperId;

  const [paper, setPaper] = useState(null);
  const [activeSection, setActiveSection] = useState('Abstract');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPaper() {
      try {
        const data = await researchService.getPaperById(paperId);
        setPaper(data);
      } finally {
        setLoading(false);
      }
    }
    loadPaper();
  }, [paperId]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-xs text-zinc-500">
        Loading paper metadata &amp; parsed sections...
      </div>
    );
  }

  if (!paper) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-4">
        <h2 className="text-xl font-bold text-zinc-100">Paper Not Found</h2>
        <p className="text-xs text-zinc-400">The requested paper ID does not exist in the index.</p>
        <Link href="/research/papers" className="rounded-xl bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-900">
          Back to Paper Library
        </Link>
      </div>
    );
  }

  const sectionKeys = paper.sections ? Object.keys(paper.sections) : [];

  return (
    <div className="flex-1 flex flex-col">
      <ResearchHeader
        title={paper.title}
        description={`Published in ${paper.journal || 'Peer-Reviewed Journal'} (${paper.year})`}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={`/research/search?q=${encodeURIComponent(paper.title)}`}
              className="rounded-xl border border-white/10 bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800 transition"
            >
              Analyze in Search 🔎
            </Link>
          </div>
        }
      />

      <div className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-8">
        {/* Paper Metadata Dossier */}
        <section className="rounded-3xl border border-white/10 bg-zinc-950 p-6 md:p-8 space-y-6 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[11px] font-mono uppercase text-amber-400 font-semibold tracking-wider">
                Document Dossier
              </span>
              <h2 className="text-2xl font-bold text-zinc-100">{paper.title}</h2>
              <p className="text-xs text-zinc-400">
                Authors: <span className="text-zinc-200 font-medium">{paper.authors?.join(', ')}</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-950/50 border border-emerald-500/20 px-3 py-1 text-xs text-emerald-400 font-mono">
                Status: {paper.status}
              </span>
              <span className="rounded-full bg-zinc-900 border border-white/10 px-3 py-1 text-xs text-zinc-300 font-mono">
                {paper.pageCount} Pages
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-white/5 text-xs">
            <div className="space-y-1">
              <span className="text-zinc-500 uppercase tracking-wider">DOI</span>
              <p className="font-mono text-zinc-300">{paper.doi || 'N/A'}</p>
            </div>
            <div className="space-y-1">
              <span className="text-zinc-500 uppercase tracking-wider">Indexed Chunks</span>
              <p className="font-mono text-amber-300 font-semibold">{paper.chunkCount || 0} chunks</p>
            </div>
            <div className="space-y-1">
              <span className="text-zinc-500 uppercase tracking-wider">Publication Venue</span>
              <p className="text-zinc-300">{paper.journal || 'Scholarly Archive'}</p>
            </div>
          </div>
        </section>

        {/* Two-Column Section Explorer */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Section Sidebar Navigation */}
          <div className="md:col-span-1 space-y-1.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 px-2 mb-2">
              Document Sections
            </h3>
            {sectionKeys.map((secName) => (
              <button
                key={secName}
                type="button"
                onClick={() => setActiveSection(secName)}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-medium transition ${
                  activeSection === secName
                    ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-white/10 font-semibold'
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                }`}
              >
                {secName}
              </button>
            ))}
          </div>

          {/* Section Content Display */}
          <div className="md:col-span-3 rounded-3xl border border-white/10 bg-zinc-950 p-6 md:p-8 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-base font-semibold text-zinc-100">{activeSection}</h3>
              <span className="text-[11px] font-mono text-zinc-500">Extracted Full Passage</span>
            </div>

            <p className="text-sm text-zinc-300 leading-relaxed font-normal whitespace-pre-line">
              {paper.sections?.[activeSection] || 'No extracted text available for this section.'}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
