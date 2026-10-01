'use client';

import React from 'react';
import CitationBadge from './CitationBadge.jsx';

/**
 * Renders an evidence-grounded answer with interactive claim citations.
 */
export default function EvidenceAnswer({
  response,
  activeSourceId,
  onSelectCitation,
}) {
  if (!response) return null;

  const { question, summary, claims = [], sources = [], confidence = 0.9 } = response;

  const getSourceNumber = (sourceId) => {
    const idx = sources.findIndex((s) => s.id === sourceId);
    return idx !== -1 ? idx + 1 : 1;
  };

  const getSourceByNumber = (sourceId) => {
    return sources.find((s) => s.id === sourceId);
  };

  return (
    <article className="space-y-6 text-left">
      {/* Question Header Card */}
      <div className="rounded-3xl border border-white/10 bg-[#0f0f12] p-6 shadow-xl space-y-3">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800/90 border border-white/10 px-3 py-1 text-[11px] font-medium text-zinc-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Empirical Synthesis
          </span>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-zinc-500 font-mono text-[11px]">Confidence:</span>
            <span className="font-mono text-emerald-400 font-semibold">
              {Math.round(confidence * 100)}%
            </span>
          </div>
        </div>

        <h2 className="text-xl md:text-2xl font-semibold text-zinc-100 leading-snug">
          {question}
        </h2>
      </div>

      {/* Answer Summary Card */}
      <div className="rounded-3xl border border-white/10 bg-zinc-950 p-6 md:p-8 space-y-6 shadow-2xl">
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Executive Evidence Summary
          </h3>
          <p className="text-base text-zinc-200 leading-relaxed font-normal">
            {summary}
          </p>
        </div>

        {/* Claims & Citations Section */}
        {claims.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-white/5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Grounded Key Claims &amp; Proof
              </h3>
              <span className="text-[11px] text-zinc-500 italic">
                Click any citation badge to view exact source location
              </span>
            </div>

            <div className="space-y-3">
              {claims.map((claim, idx) => {
                const isClaimActive = claim.sourceIds.includes(activeSourceId);

                return (
                  <div
                    key={claim.id || idx}
                    className={`rounded-2xl border p-4 transition-all duration-150 ${
                      isClaimActive
                        ? 'border-amber-400/50 bg-amber-950/10'
                        : 'border-white/5 bg-zinc-900/40 hover:border-zinc-800'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xs font-mono font-bold text-zinc-500 mt-0.5">
                        {String(idx + 1).padStart(2, '0')}.
                      </span>

                      <div className="flex-1 space-y-2 text-sm leading-relaxed text-zinc-200">
                        <p>
                          {claim.text}
                          <span className="ml-1.5 inline-flex items-center align-middle">
                            {claim.sourceIds.map((sourceId) => {
                              const sNum = getSourceNumber(sourceId);
                              const src = getSourceByNumber(sourceId);
                              return (
                                <CitationBadge
                                  key={sourceId}
                                  index={sNum}
                                  isActive={activeSourceId === sourceId}
                                  sourceTitle={src?.paperTitle}
                                  onClick={() => onSelectCitation && onSelectCitation(sourceId)}
                                />
                              );
                            })}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
