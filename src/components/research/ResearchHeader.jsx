'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { label: 'Overview', href: '/research', icon: '⚡' },
  { label: 'Ask Question', href: '/research/search', icon: '🔎' },
  { label: 'Paper Library', href: '/research/papers', icon: '📚' },
  { label: 'Paper Comparison', href: '/research/compare', icon: '⚖️' },
  { label: 'Workspace', href: '/research/workspace/default', icon: '🔬' },
];

/**
 * Top navigation header for Research Assistant with sub-routes.
 */
export default function ResearchHeader({ title, description, actions }) {
  const pathname = usePathname();

  return (
    <header className="border-b border-white/10 bg-black/90 backdrop-blur-md sticky top-0 z-30 px-6 py-4 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/chat"
              className="text-xs text-zinc-500 hover:text-zinc-300 transition flex items-center gap-1 mr-2"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
              <span>ChatGPT Home</span>
            </Link>
            <span className="text-zinc-600">/</span>
            <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-[10px] font-mono text-amber-400 font-semibold tracking-wide">
              RESEARCH ENGINE
            </span>
          </div>

          <h1 className="text-xl md:text-2xl font-bold text-zinc-100 tracking-tight">
            {title || 'AI Research Paper Discovery & Evidence Assistant'}
          </h1>
          {description && (
            <p className="text-xs text-zinc-400 max-w-2xl">{description}</p>
          )}
        </div>

        {actions && <div className="flex items-center gap-2.5">{actions}</div>}
      </div>

      {/* Sub-navigation tabs */}
      <nav className="flex items-center gap-1 overflow-x-auto custom-scrollbar pt-1 text-xs">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/research' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium transition-all duration-150 shrink-0 ${
                isActive
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-white/10'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
