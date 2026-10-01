'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import ResearchHeader from '@/components/research/ResearchHeader.jsx';
import EvidenceAnswer from '@/components/research/EvidenceAnswer.jsx';
import SourcePanel from '@/components/research/SourcePanel.jsx';
import researchService from '@/features/research/researchService.js';

export default function ResearchWorkspacePage({ params }) {
  const unwrappedParams = use(params);
  const workspaceId = unwrappedParams.workspaceId;

  const [response, setResponse] = useState(null);
  const [papers, setPapers] = useState([]);
  const [collections, setCollections] = useState([]);
  const [activeSourceId, setActiveSourceId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadWorkspaceData() {
      try {
        const [res, pList, cList] = await Promise.all([
          researchService.searchResearch('Does sleep deprivation affect memory consolidation?'),
          researchService.getPapers(),
          researchService.getCollections(),
        ]);
        setResponse(res);
        setPapers(pList);
        setCollections(cList);
        if (res?.sources?.length > 0) {
          setActiveSourceId(res.sources[0].id);
        }
      } finally {
        setLoading(false);
      }
    }
    loadWorkspaceData();
  }, [workspaceId]);

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      <ResearchHeader
        title={`Workspace: ${workspaceId === 'default' ? 'Neuroscience & Memory' : workspaceId}`}
        description="Comprehensive 3-pane research cockpit: Collections, Evidence Grounding, and Sources."
      />

      {/* 3-Column Responsive Workspace: LEFT (Navigation/Collections) | CENTER (Evidence) | RIGHT (Sources) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Pane: Collections & Papers Navigator */}
        <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-white/10 bg-[#0c0c0e] p-4 space-y-5 overflow-y-auto chat-scrollbar">
          <div className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Workspace Collections
            </span>
            <div className="space-y-1 text-xs">
              {collections.map((c) => (
                <div
                  key={c.id}
                  className="p-2 rounded-xl bg-zinc-900/60 border border-white/5 flex items-center justify-between"
                >
                  <span className="truncate text-zinc-200">{c.name}</span>
                  <span className="font-mono text-[10px] text-zinc-500">{c.paperCount}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Indexed Workspace Papers
            </span>
            <div className="space-y-1.5 text-xs">
              {papers.map((p) => (
                <Link
                  key={p.id}
                  href={`/research/papers/${p.id}`}
                  className="block p-2.5 rounded-xl border border-white/5 hover:border-zinc-700 bg-zinc-950 hover:bg-zinc-900 transition"
                >
                  <h5 className="font-medium text-zinc-200 line-clamp-1">{p.title}</h5>
                  <span className="text-[10px] text-zinc-500 font-mono">{p.year}</span>
                </Link>
              ))}
            </div>
          </div>
        </aside>

        {/* Center Pane: Active Research Evidence Question & Answer */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 custom-scrollbar bg-black">
          {loading ? (
            <div className="py-24 text-center text-xs text-zinc-500">
              Initializing workspace session...
            </div>
          ) : (
            <EvidenceAnswer
              response={response}
              activeSourceId={activeSourceId}
              onSelectCitation={(id) => setActiveSourceId(id)}
            />
          )}
        </main>

        {/* Right Pane: Sources & Citations */}
        <aside className="hidden xl:block w-80 shrink-0 h-full overflow-hidden border-l border-white/10">
          <SourcePanel
            sources={response?.sources || []}
            highlightedSourceId={activeSourceId}
            onSelectSource={(id) => setActiveSourceId(id)}
          />
        </aside>
      </div>
    </div>
  );
}
