'use client';

import React from 'react';
import Link from 'next/link';

/**
 * Insufficient Evidence state component.
 * Spec requirement: Must look like an intentional research result, NOT a crash/error.
 */
export default function InsufficientEvidence({
  question,
  reasons = [],
  retrievedCount = 0,
  onRefineQuestion,
}) {
  return (
    <div className="rounded-3xl border border-amber-500/20 bg-gradient-to-b from-amber-950/15 via-zinc-950 to-zinc-950 p-6 md:p-8 space-y-6 text-left shadow-2xl">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <div className="space-y-1">
          <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-medium">
            Evidence Verification Notice
          </span>
          <h3 className="text-xl font-semibold text-zinc-100">
            Insufficient Evidence
          </h3>
          <p className="text-sm text-zinc-400 leading-relaxed">
            The indexed paper repository does not contain enough relevant, high-confidence empirical data to synthesize an authoritative answer.
          </p>
        </div>
      </div>

      {question && (
        <div className="rounded-2xl border border-white/5 bg-zinc-900/60 p-4 text-xs">
          <span className="text-zinc-500 uppercase tracking-wider block mb-1">Inquired Topic</span>
          <span className="text-zinc-200 font-medium">&ldquo;{question}&rdquo;</span>
        </div>
      )}

      {/* Diagnostic details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="rounded-xl border border-white/5 bg-zinc-900/40 p-3.5 space-y-1">
          <span className="text-zinc-500">Retrieved Candidate Chunks</span>
          <p className="text-base font-mono font-semibold text-zinc-200">
            {retrievedCount} partially relevant passages
          </p>
        </div>
        <div className="rounded-xl border border-white/5 bg-zinc-900/40 p-3.5 space-y-1">
          <span className="text-zinc-500">Confidence Threshold</span>
          <p className="text-base font-mono font-semibold text-amber-400">
            &lt; 0.65 (Grounded threshold unmet)
          </p>
        </div>
      </div>

      {/* Suggested next steps */}
      <div className="rounded-2xl border border-white/5 bg-zinc-900/40 p-5 space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
          What you can do:
        </h4>
        <ul className="space-y-2 text-xs text-zinc-400">
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            <span>Search with a broader conceptual scope (e.g. general neurobiology or sleep consolidation).</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            <span>Upload or index additional relevant domain papers to the library.</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            <span>Refine the research question to target specific documented mechanisms.</span>
          </li>
        </ul>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          {onRefineQuestion && (
            <button
              type="button"
              onClick={onRefineQuestion}
              className="rounded-xl bg-zinc-100 px-4 py-2 text-xs font-medium text-zinc-900 hover:bg-zinc-200 transition"
            >
              Refine Question
            </button>
          )}

          <Link
            href="/research/papers"
            className="rounded-xl border border-white/10 bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-700 transition"
          >
            Explore Available Papers
          </Link>
        </div>
      </div>
    </div>
  );
}
