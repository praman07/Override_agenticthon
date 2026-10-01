'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ResearchHeader from '@/components/research/ResearchHeader.jsx';
import EvidenceAnswer from '@/components/research/EvidenceAnswer.jsx';
import SourcePanel from '@/components/research/SourcePanel.jsx';
import InsufficientEvidence from '@/components/research/InsufficientEvidence.jsx';
import ResearchLoading from '@/components/research/ResearchLoading.jsx';
import researchService from '@/features/research/researchService.js';

function ResearchSearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || 'Does sleep deprivation affect memory consolidation?';

  const [question, setQuestion] = useState(initialQuery);
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSourceId, setActiveSourceId] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const executeSearch = async (queryText) => {
    setLoading(true);
    setActiveSourceId(null);
    try {
      const res = await researchService.searchResearch(queryText);
      setResponse(res);
      if (res?.sources?.length > 0) {
        setActiveSourceId(res.sources[0].id);
      }
    } catch (err) {
      console.error('Search inquiry error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isCancelled = false;
    researchService.searchResearch(initialQuery).then((res) => {
      if (!isCancelled) {
        setResponse(res);
        if (res?.sources?.length > 0) {
          setActiveSourceId(res.sources[0].id);
        }
        setLoading(false);
      }
    }).catch(() => {
      if (!isCancelled) setLoading(false);
    });

    return () => {
      isCancelled = true;
    };
  }, [initialQuery]);

  const handleCitationClick = (sourceId) => {
    setActiveSourceId(sourceId);
    setIsDrawerOpen(true);
    // Smooth scroll to the corresponding source card
    const elem = document.getElementById(`source-${sourceId}`);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <ResearchHeader
        title="Research Search & Evidence Verification"
        description="Pose scholarly inquiries to retrieve evidence-grounded syntheses with interactive citations."
      />

      {/* Query Bar */}
      <div className="border-b border-white/10 bg-zinc-950/60 px-6 py-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            executeSearch(question);
          }}
          className="max-w-4xl mx-auto flex items-center gap-3"
        >
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a scholarly research question..."
            className="flex-1 rounded-2xl border border-white/15 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-amber-400/60"
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="rounded-xl bg-zinc-100 px-5 py-3 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 disabled:opacity-40 transition"
          >
            {loading ? 'Searching...' : 'Search Evidence'}
          </button>
        </form>
      </div>

      {/* Main 2-Column Responsive Layout: Left Evidence, Right Sources */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto p-4 md:p-6 gap-6 overflow-hidden">
        {/* Left Column: Evidence Answer or Insufficient Evidence */}
        <div className="flex-1 overflow-y-auto space-y-6 custom-scrollbar pr-1">
          {loading ? (
            <ResearchLoading currentStep={2} />
          ) : response?.insufficientEvidence ? (
            <InsufficientEvidence
              question={response.question}
              reasons={response.insufficientReasons}
              retrievedCount={response.sources?.length || 0}
              onRefineQuestion={() => {
                setQuestion('Does sleep deprivation affect memory consolidation?');
                executeSearch('Does sleep deprivation affect memory consolidation?');
              }}
            />
          ) : (
            <EvidenceAnswer
              response={response}
              activeSourceId={activeSourceId}
              onSelectCitation={handleCitationClick}
            />
          )}
        </div>

        {/* Right Column (Desktop): Persistent Source Panel */}
        <div className="hidden lg:block w-96 shrink-0 h-[calc(100vh-210px)] sticky top-24 rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
          <SourcePanel
            sources={response?.sources || []}
            highlightedSourceId={activeSourceId}
            onSelectSource={(id) => setActiveSourceId(id)}
          />
        </div>

        {/* Mobile / Tablet Floating Evidence Drawer Toggle */}
        <div className="lg:hidden fixed bottom-6 right-6 z-40">
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="flex items-center gap-2 rounded-full bg-amber-400 text-zinc-950 px-4 py-2.5 text-xs font-bold shadow-2xl border border-amber-300"
          >
            <span>📚</span>
            <span>View Sources ({response?.sources?.length || 0})</span>
          </button>
        </div>

        {/* Mobile Evidence Drawer Modal */}
        {isDrawerOpen && (
          <div
            className="lg:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end"
            onClick={() => setIsDrawerOpen(false)}
          >
            <div
              className="w-full max-w-md h-full bg-zinc-950 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <SourcePanel
                sources={response?.sources || []}
                highlightedSourceId={activeSourceId}
                onSelectSource={(id) => setActiveSourceId(id)}
                onClose={() => setIsDrawerOpen(false)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResearchSearchPage() {
  return (
    <Suspense fallback={<ResearchLoading currentStep={1} />}>
      <ResearchSearchContent />
    </Suspense>
  );
}
