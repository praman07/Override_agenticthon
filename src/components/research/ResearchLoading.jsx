'use client';

import React from 'react';

const STAGES = [
  { label: 'Formulating conceptual query representation...', icon: '🔍' },
  { label: 'Scanning vector index across paper corpus...', icon: '📚' },
  { label: 'Extracting candidate passage chunks...', icon: '📄' },
  { label: 'Validating claim-to-source groundings...', icon: '⚖️' },
  { label: 'Synthesizing evidence summary & citations...', icon: '✨' },
];

/**
 * Polished research pipeline loading indicator with progress steps.
 */
export default function ResearchLoading({ currentStep = 2, message }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-zinc-950 p-8 shadow-2xl max-w-xl mx-auto my-8 space-y-6 text-center animate-in fade-in duration-200">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 border border-white/10 text-xl shadow-lg">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
      </div>

      <div className="space-y-1">
        <h3 className="text-base font-semibold text-zinc-100">
          {message || 'Retrieving Verified Evidence...'}
        </h3>
        <p className="text-xs text-zinc-400">
          Analyzing peer-reviewed passages for factual cross-verification
        </p>
      </div>

      <div className="space-y-2.5 text-left border-t border-white/5 pt-4">
        {STAGES.map((stage, idx) => {
          const isDone = idx < currentStep;
          const isCurrent = idx === currentStep;

          return (
            <div
              key={idx}
              className={`flex items-center gap-3 text-xs transition-opacity duration-200 ${
                isDone
                  ? 'text-zinc-400 opacity-60'
                  : isCurrent
                  ? 'text-amber-300 font-medium'
                  : 'text-zinc-600 opacity-40'
              }`}
            >
              <span className="text-sm">{stage.icon}</span>
              <span className="flex-1">{stage.label}</span>
              {isDone && <span className="text-emerald-400 font-mono text-[10px]">✓</span>}
              {isCurrent && (
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
