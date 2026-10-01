'use client';

import React from 'react';
import SourceCard from './SourceCard.jsx';

/**
 * Collapsible or drawer-compatible panel displaying all retrieved evidence sources.
 */
export default function SourcePanel({
  sources = [],
  highlightedSourceId,
  onSelectSource,
  onClose,
}) {
  return (
    <aside className="flex flex-col h-full bg-[#0a0a0b] border-l border-white/10 w-full overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0 bg-zinc-950">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-zinc-100">Retrieved Evidence</span>
          <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-mono text-zinc-300">
            {sources.length}
          </span>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition"
            title="Close source panel"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 chat-scrollbar">
        {sources.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-500">
            No evidence sources attached to this inquiry.
          </div>
        ) : (
          sources.map((src, idx) => (
            <SourceCard
              key={src.id}
              source={src}
              index={idx + 1}
              isHighlighted={highlightedSourceId === src.id}
              onSelect={() => onSelectSource && onSelectSource(src.id)}
            />
          ))
        )}
      </div>
    </aside>
  );
}
