'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ResearchHeader from '@/components/research/ResearchHeader.jsx';
import PaperCard from '@/components/research/PaperCard.jsx';
import researchService from '@/features/research/researchService.js';

export default function ResearchDashboardPage() {
  const router = useRouter();
  const [queryInput, setQueryInput] = useState('');
  const [papers, setPapers] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadInitial() {
      try {
        const [loadedPapers, loadedCollections] = await Promise.all([
          researchService.getPapers(),
          researchService.getCollections(),
        ]);
        setPapers(loadedPapers);
        setCollections(loadedCollections);
      } finally {
        setLoading(false);
      }
    }
    loadInitial();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (queryInput.trim()) {
      router.push(`/research/search?q=${encodeURIComponent(queryInput.trim())}`);
    }
  };

  const sampleQuestions = [
    "Does sleep deprivation affect memory consolidation?",
    "How does synaptic downscaling prevent neural network saturation?",
    "Role of sharp-wave ripples in declarative memory replay?",
  ];

  return (
    <div className="flex-1 flex flex-col">
      <ResearchHeader
        title="Research Paper Discovery & Evidence Assistant"
        description="Ask complex scholarly questions, cross-verify claims against indexed papers, and explore exact passage citations."
        actions={
          <Link
            href="/research/papers"
            className="rounded-xl border border-white/15 bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800 transition"
          >
            + Index New Paper
          </Link>
        }
      />

      <div className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-10">
        {/* Main Hero Question Input Card */}
        <section className="rounded-3xl border border-white/10 bg-gradient-to-b from-zinc-900/90 to-zinc-950 p-6 md:p-10 shadow-2xl space-y-5 text-center max-w-4xl mx-auto">
          <div className="space-y-2">
            <span className="text-xs uppercase tracking-[0.25em] text-amber-400 font-mono font-medium">
              EVIDENCE-GROUNDED REASONING
            </span>
            <h2 className="text-2xl md:text-4xl font-extrabold text-zinc-100 tracking-tight">
              Ask a Research Question
            </h2>
            <p className="text-sm text-zinc-400 max-w-xl mx-auto">
              Synthesize factual answers with verifiable inline citations derived directly from indexed papers.
            </p>
          </div>

          <form onSubmit={handleSearchSubmit} className="relative max-w-2xl mx-auto">
            <input
              type="text"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="e.g. Does sleep deprivation affect memory consolidation?"
              className="w-full rounded-2xl border border-white/15 bg-black/60 pl-5 pr-28 py-4 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition focus:border-amber-400/70 focus:ring-1 focus:ring-amber-400/50"
            />
            <button
              type="submit"
              disabled={!queryInput.trim()}
              className="absolute right-2 top-2 bottom-2 rounded-xl bg-zinc-100 px-5 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 disabled:opacity-40 transition"
            >
              Analyze
            </button>
          </form>

          {/* Quick sample question pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs">
            <span className="text-zinc-500 text-[11px]">Popular inquiries:</span>
            {sampleQuestions.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => {
                  setQueryInput(q);
                  router.push(`/research/search?q=${encodeURIComponent(q)}`);
                }}
                className="rounded-lg border border-white/5 bg-zinc-900/80 px-2.5 py-1 text-[11px] text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition"
              >
                {q}
              </button>
            ))}
          </div>
        </section>

        {/* Dashboard Metrics / Quick Stats */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-white/10 bg-zinc-950 p-4 space-y-1">
            <span className="text-xs text-zinc-500 font-mono">Indexed Papers</span>
            <p className="text-2xl font-bold text-zinc-100">{papers.length}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-zinc-950 p-4 space-y-1">
            <span className="text-xs text-zinc-500 font-mono">Extractable Chunks</span>
            <p className="text-2xl font-bold text-amber-400">239</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-zinc-950 p-4 space-y-1">
            <span className="text-xs text-zinc-500 font-mono">Active Workspaces</span>
            <p className="text-2xl font-bold text-zinc-100">{collections.length}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-zinc-950 p-4 space-y-1">
            <span className="text-xs text-zinc-500 font-mono">Grounding Confidence</span>
            <p className="text-2xl font-bold text-emerald-400">94.2%</p>
          </div>
        </section>

        {/* Two-Column: Collections & Recent Activity */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Research Collections */}
          <div className="lg:col-span-1 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
                Collections &amp; Workspaces
              </h3>
              <span className="text-xs text-zinc-500">{collections.length} total</span>
            </div>

            <div className="space-y-2.5">
              {collections.map((col) => (
                <Link
                  key={col.id}
                  href={`/research/workspace/${col.id}`}
                  className="flex items-center justify-between p-3.5 rounded-2xl border border-white/10 bg-zinc-950 hover:bg-zinc-900 transition group"
                >
                  <div className="space-y-0.5 min-w-0 pr-2">
                    <h4 className="text-xs font-semibold text-zinc-200 group-hover:text-amber-300 truncate">
                      {col.name}
                    </h4>
                    <span className="text-[11px] text-zinc-500 font-mono">
                      {col.paperCount} papers · Updated {col.updatedAt}
                    </span>
                  </div>
                  <span className="text-zinc-500 group-hover:text-zinc-200 text-sm">→</span>
                </Link>
              ))}

              <Link
                href="/research/workspace/default"
                className="block text-center py-2.5 rounded-xl border border-dashed border-white/15 text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition"
              >
                + Open Research Workspace
              </Link>
            </div>
          </div>

          {/* Recently Added Papers */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
                Recently Added Papers
              </h3>
              <Link
                href="/research/papers"
                className="text-xs text-zinc-400 hover:text-zinc-200 transition"
              >
                View full repository →
              </Link>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs text-zinc-500">
                Loading repository index...
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {papers.slice(0, 4).map((paper) => (
                  <PaperCard key={paper.id} paper={paper} />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
