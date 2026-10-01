'use client';

import React from 'react';
import Link from 'next/link';

/**
 * Detailed evidence source card highlighting paper origin, page number, section and excerpt.
 */
export default function SourceCard({
  source,
  index,
  isHighlighted = false,
  onSelect,
}) {
  return (
    <div
      id={`source-${source.id}`}
      onClick={onSelect}
      className={`rounded-2xl border p-4 transition-all duration-200 cursor-pointer text-left ${
        isHighlighted
          ? 'border-amber-400/80 bg-zinc-900 shadow-lg shadow-amber-500/10 ring-1 ring-amber-400/50'
          : 'border-white/10 bg-zinc-950/80 hover:border-zinc-700 hover:bg-zinc-900/60'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-zinc-800 text-[11px] font-mono font-bold text-amber-300 border border-amber-400/20">
            {index}
          </span>
          <span className="text-xs font-semibold text-zinc-300 truncate">
            {source.authors?.join(', ') || 'Unknown author'} ({source.year})
          </span>
        </div>

        {source.relevanceScore != null && (
          <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-2 py-0.5 text-[10px] font-mono text-emerald-400">
            {Math.round(source.relevanceScore * 100)}% match
          </span>
        )}
      </div>

      <h4 className="text-sm font-medium text-zinc-100 line-clamp-2 mb-2 leading-snug">
        {source.paperTitle}
      </h4>

      {/* Prominent source location UX: Paper → Page → Section */}
      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-400 mb-3 bg-zinc-900/80 px-2.5 py-1.5 rounded-lg border border-white/5">
        <span className="text-zinc-500">📄</span>
        <span className="font-medium text-zinc-200">Page {source.pageNumber}</span>
        <span className="text-zinc-600">·</span>
        <span className="text-zinc-300">{source.section}</span>
        {source.chunkId && (
          <>
            <span className="text-zinc-600">·</span>
            <span className="font-mono text-zinc-500 text-[10px]">{source.chunkId}</span>
          </>
        )}
      </div>

      {/* Extracted Passage */}
      <blockquote className="text-xs text-zinc-300 bg-black/40 border-l-2 border-amber-400/60 pl-3 py-1.5 italic leading-relaxed mb-3">
        &ldquo;{source.text}&rdquo;
      </blockquote>

      <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px]">
        {source.paperId ? (
          <Link
            href={`/research/papers/${source.paperId}`}
            onClick={(e) => e.stopPropagation()}
            className="text-zinc-400 hover:text-zinc-100 transition flex items-center gap-1"
          >
            <span>View full paper</span>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ) : <span />}

        {source.sourceUrl && (
          <a
            href={source.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-zinc-500 hover:text-zinc-300 transition text-[11px] underline"
          >
            DOI / Link ↗
          </a>
        )}
      </div>
    </div>
  );
}
