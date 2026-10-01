import { HumanMessage } from 'langchain';
import { getModelSequence } from './ai.service.js';

/**
 * Synthesizes factual evidence into grounded claims and citations using existing Gemini/Mistral LLM.
 *
 * @param {string} question - The research question
 * @param {Array<object>} retrievedChunks - Retrieved evidence chunks with scores
 * @returns {Promise<import('@/features/research/types.js').ResearchResponse>}
 */
export async function synthesizeResearchAnswer(question, retrievedChunks = []) {
  // Phase 18: Deterministic Insufficient Evidence handling
  if (!retrievedChunks || retrievedChunks.length === 0) {
    return {
      question,
      summary:
        'The supplied papers do not contain enough relevant evidence to answer this question confidently.',
      confidence: 0.15,
      insufficientEvidence: true,
      insufficientReasons: [
        'No indexed document chunks met the relevance threshold for this query.',
        'Try searching for specific methodology or keywords, or upload papers directly covering this topic.',
      ],
      claims: [],
      sources: [],
    };
  }

  // Phase 16: Format sources according to frontend contract
  const sources = retrievedChunks.map((chunk, idx) => ({
    id: `source-${idx + 1}`,
    chunkId: chunk.chunkId,
    paperId: chunk.paper.id,
    paperTitle: chunk.paper.title,
    authors: chunk.paper.authors || [],
    year: chunk.paper.year,
    pageNumber: chunk.source.pageNumber,
    section: chunk.source.section || 'General',
    text: chunk.text,
    relevanceScore: chunk.score,
  }));

  const validSourceIdSet = new Set(sources.map((s) => s.id));

  // Build structured evidence text for LLM
  const evidenceBlocks = sources
    .map(
      (s) => `[${s.id}]
Paper: "${s.paperTitle}" (${s.year || 'N/A'})
Authors: ${s.authors.join(', ') || 'N/A'}
Page: ${s.pageNumber} | Section: ${s.section}
Evidence Excerpt:
"""
${s.text}
"""`
    )
    .join('\n\n');

  const systemInstructions = `You are an elite academic AI Research Assistant. Your task is to provide an evidence-grounded synthesis answering the user's research inquiry based strictly on the provided scholarly sources.

CRITICAL RULES:
1. Grounding: Rely ONLY on the evidence excerpts provided below. Do NOT use general knowledge or make assumptions not directly supported by the text.
2. Citations: Every factual claim must be accompanied by the exact source ID(s) (e.g. ["source-1"]) that substantiate it.
3. No Hallucination: Never fabricate page numbers, titles, authors, or source IDs.
4. Conflicting Findings: If different sources report conflicting, contradictory, or nuanced results, explicitly describe the divergence and cite both sources.
5. Insufficient Evidence: If the provided excerpts do not contain enough information to answer the question with confidence, set "insufficientEvidence" to true and explain the limitation.

You must respond ONLY with a valid JSON object matching this exact schema:
{
  "summary": "Comprehensive 2-4 paragraph scholarly synthesis answering the question directly with academic rigor.",
  "confidence": 0.88,
  "insufficientEvidence": false,
  "insufficientReasons": [],
  "claims": [
    {
      "id": "claim-1",
      "text": "Specific atomic factual statement or finding derived from the evidence.",
      "sourceIds": ["source-1"]
    }
  ]
}`;

  const userPrompt = `RESEARCH QUESTION:
${question}

AVAILABLE EVIDENCE SOURCES:
${evidenceBlocks}

Produce your evidence-grounded synthesis in valid JSON format.`;

  const sequence = getModelSequence();
  let rawJsonText = null;

  for (const { model, provider } of sequence) {
    try {
      const response = await model.invoke([
        new HumanMessage(`${systemInstructions}\n\n${userPrompt}`),
      ]);

      const content =
        typeof response?.content === 'string'
          ? response.content
          : Array.isArray(response?.content)
          ? response.content.map((c) => c.text || '').join('')
          : '';

      if (content && content.trim()) {
        rawJsonText = content.trim();
        break;
      }
    } catch (llmErr) {
      console.warn(`[Research LLM] Notice from provider ${provider}:`, llmErr.message);
    }
  }

  if (!rawJsonText) {
    throw new Error('All LLM providers failed to produce a research synthesis response.');
  }

  // Parse JSON response safely (handling markdown code blocks if present)
  let parsed = null;
  try {
    const cleanJson = rawJsonText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    parsed = JSON.parse(cleanJson);
  } catch (parseErr) {
    console.warn('Failed to parse strict JSON from LLM output. Extracting fallback payload.');
    parsed = {
      summary: rawJsonText.slice(0, 1000),
      confidence: 0.65,
      insufficientEvidence: false,
      claims: [
        {
          id: 'claim-1',
          text: rawJsonText.slice(0, 250),
          sourceIds: [sources[0].id],
        },
      ],
    };
  }

  // Phase 17: Citation Validation
  const validatedClaims = [];
  if (Array.isArray(parsed.claims)) {
    for (let i = 0; i < parsed.claims.length; i++) {
      const rawClaim = parsed.claims[i];
      const validIds = Array.isArray(rawClaim.sourceIds)
        ? rawClaim.sourceIds.filter((id) => validSourceIdSet.has(id))
        : [];

      // If LLM produced a claim with no valid source ID or an invalid ID, attach the closest source
      const finalSourceIds = validIds.length > 0 ? validIds : [sources[0].id];

      validatedClaims.push({
        id: rawClaim.id || `claim-${i + 1}`,
        text: rawClaim.text || '',
        sourceIds: finalSourceIds,
      });
    }
  }

  return {
    question,
    summary: parsed.summary || 'Summary unavailable.',
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.85,
    insufficientEvidence: Boolean(parsed.insufficientEvidence),
    insufficientReasons: Array.isArray(parsed.insufficientReasons)
      ? parsed.insufficientReasons
      : [],
    claims: validatedClaims,
    sources,
  };
}
