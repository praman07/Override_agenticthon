'use client';

import React from 'react';

/**
 * Interactive badge displaying citation index [1], [2], etc.
 * Keyboard accessible with focus ring and active highlight states.
 */
export default function CitationBadge({
  index,
  isActive = false,
  onClick,
  sourceTitle,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Citation [${index}]${sourceTitle ? `: ${sourceTitle}` : ''}`}
      title={sourceTitle ? `Source [${index}]: ${sourceTitle}` : `Citation [${index}]`}
      className={`inline-flex items-center justify-center font-mono text-[11px] font-semibold px-1.5 py-0.5 mx-0.5 rounded transition-all duration-150 select-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-400 ${
        isActive
          ? 'bg-amber-400 text-zinc-950 font-bold scale-105 shadow-md shadow-amber-500/20'
          : 'bg-zinc-800 text-amber-300 hover:bg-zinc-700 hover:text-amber-200 border border-amber-400/20'
      }`}
    >
      [{index}]
    </button>
  );
}
