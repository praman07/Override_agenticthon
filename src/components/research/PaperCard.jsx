'use client';

import React from 'react';
import Link from 'next/link';

/**
 * Reusable Paper Card representing an indexed scholarly document in repository.
 */
export default function PaperCard({ paper }) {
  if (!paper) return null;

  return (
    <div className="group rounded-3xl border border-white/10 bg-zinc-950 p-5 md:p-6 transition-all duration-200 hover:border-zinc-700 hover:bg-zinc-900/60 shadow-lg flex flex-col justify-between text-left">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-zinc-900 border border-white/10 px-2 py-0.5 text-[11px] font-mono text-zinc-400">
              {paper.year}
            </span>
            {paper.status === 'indexed' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                <span className="h-1 w-1 rounded-full bg-emerald-400" />
                Indexed ({paper.chunkCount || 0} chunks)
              </span>
            )}
          </div>

          <span className="text-[11px] font-mono text-zinc-500">
            {paper.pageCount} pages
          </span>
        </div>

        <Link href={`/research/papers/${paper.id}`} className="block group-hover:text-amber-300 transition">
          <h3 className="text-base font-semibold text-zinc-100 line-clamp-2 leading-snug">
            {paper.title}
          </h3>
        </Link>

        <p className="text-xs text-zinc-400 font-medium line-clamp-1">
          {paper.authors?.join(', ')}
        </p>

        <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed">
          {paper.abstract}
        </p>

        {paper.tags && paper.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {paper.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-lg bg-zinc-900/90 border border-white/5 px-2 py-0.5 text-[10px] text-zinc-400"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 mt-4 border-t border-white/5 text-xs">
        <Link
          href={`/research/papers/${paper.id}`}
          className="text-zinc-300 hover:text-white font-medium flex items-center gap-1 transition"
        >
          <span>Examine Sections</span>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </Link>

        {paper.sourceUrl && (
          <a
            href={paper.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-500 hover:text-zinc-400 text-[11px] underline"
          >
            Original Publication ↗
          </a>
        )}
      </div>
    </div>
  );
}
