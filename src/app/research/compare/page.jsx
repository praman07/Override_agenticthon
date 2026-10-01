'use client';

import React, { useEffect, useState } from 'react';
import ResearchHeader from '@/components/research/ResearchHeader.jsx';
import researchService from '@/features/research/researchService.js';

export default function PaperComparePage() {
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCompare() {
      try {
        const data = await researchService.getComparisonData();
        setComparison(data);
      } finally {
        setLoading(false);
      }
    }
    loadCompare();
  }, []);

  return (
    <div className="flex-1 flex flex-col">
      <ResearchHeader
        title="Scholarly Paper Comparison"
        description="Cross-examine key findings, methodological paradigms, and points of agreement vs disagreement across multiple papers."
      />

      <div className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-8">
        {loading ? (
          <div className="py-20 text-center text-xs text-zinc-500">
            Constructing comparative evidence matrix...
          </div>
        ) : !comparison ? (
          <div className="py-12 text-center text-xs text-zinc-500">
            No comparison data available.
          </div>
        ) : (
          <div className="space-y-8">
            {/* Active Papers Compared Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {comparison.papers.map((p, idx) => (
                <div
                  key={p.id}
                  className="rounded-2xl border border-white/10 bg-zinc-950 p-4 space-y-1.5"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-zinc-800 text-[11px] font-bold text-amber-300">
                      Paper {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="text-[11px] font-mono text-zinc-500">{p.year}</span>
                  </div>
                  <h4 className="text-xs font-semibold text-zinc-100 line-clamp-1">
                    {p.title}
                  </h4>
                  <p className="text-[11px] text-zinc-400 truncate">
                    {p.authors?.join(', ')}
                  </p>
                </div>
              ))}
            </div>

            {/* Findings Matrix */}
            <div className="space-y-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
                Comparative Evidence Findings
              </h3>

              {comparison.comparisonRows.map((row, rowIdx) => (
                <div
                  key={rowIdx}
                  className="rounded-3xl border border-white/10 bg-zinc-950 overflow-hidden shadow-xl"
                >
                  <div className="bg-zinc-900/80 px-6 py-4 border-b border-white/5 flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-zinc-100">
                      {row.finding}
                    </h4>
                    <span className="rounded-full bg-emerald-950/50 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-mono text-emerald-400">
                      High Consensus
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/5">
                    {comparison.papers.map((paper) => {
                      const data = row.papers[paper.id];
                      if (!data) return <div key={paper.id} className="p-5 text-xs text-zinc-500">No data</div>;

                      return (
                        <div key={paper.id} className="p-5 space-y-3 text-xs text-left">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-zinc-300">
                              {paper.authors?.[0]?.split(' ')?.[1] || 'Author'} et al.
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono ${
                                data.stance === 'supports'
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/40'
                                  : 'bg-zinc-800 text-zinc-400'
                              }`}
                            >
                              {data.stance}
                            </span>
                          </div>

                          <p className="text-zinc-200 font-medium leading-relaxed">
                            {data.summary}
                          </p>

                          <div className="bg-black/50 p-2.5 rounded-xl border border-white/5 space-y-1">
                            <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">
                              Methodology
                            </span>
                            <p className="text-[11px] text-zinc-400">{data.methodology}</p>
                          </div>

                          <blockquote className="border-l-2 border-amber-400/50 pl-2.5 text-[11px] italic text-zinc-400">
                            &ldquo;{data.excerpt}&rdquo;
                          </blockquote>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
