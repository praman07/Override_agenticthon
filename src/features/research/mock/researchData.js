/**
 * Sample research mock dataset for frontend development.
 * Clearly marked mock/demo data for RAG interface testing.
 */

export const MOCK_PAPERS = [
  {
    id: "paper-sleep-mem-2006",
    title: "Sleep-Dependent Memory Consolidation and Synaptic Plasticity",
    authors: ["Matthew P. Walker", "Robert Stickgold"],
    year: 2006,
    journal: "Neuron (Vol 44, Issue 1)",
    doi: "10.1016/j.neuron.2006.08.012",
    pageCount: 18,
    status: "indexed",
    chunkCount: 64,
    tags: ["Neuroscience", "Memory", "Sleep Architecture", "Synaptic Plasticity"],
    sourceUrl: "https://doi.org/10.1016/j.neuron.2006.08.012",
    abstract: "Sleep has long been suspected of playing a role in memory formation. Recent empirical evidence demonstrates that sleep supports memory consolidation across multiple declarative and procedural domains, modulated by specific slow-wave and REM sleep oscillations that facilitate long-term hippocampal-neocortical synaptic transfer.",
    sections: {
      "Abstract": "Sleep has long been suspected of playing a role in memory formation. Recent empirical evidence demonstrates that sleep supports memory consolidation across multiple declarative and procedural domains...",
      "Introduction": "Over the past decade, cognitive neuroscience has shifted from viewing sleep as a passive recovery state to recognizing it as an active neurobiological phase of information processing. Post-learning sleep promotes structural synaptic remodeling...",
      "Methods": "Eighty-four healthy adult participants were assigned to sleep-deprived and normal-sleep cohorts. Memory testing used hippocampal-dependent paired-associate word tasks and finger-tapping procedural motor tests...",
      "Results": "The normal sleep group exhibited a 22.4% higher recall accuracy after a 24-hour interval compared with the sleep-deprived group (p < 0.001). Slow-wave sleep (SWS) delta band power correlated strongly with hippocampal retention indexes (r = 0.68).",
      "Discussion": "These findings directly support the two-stage memory consolidation model, wherein unstable hippocampal engrams are consolidated into distributed neocortical networks during deep NREM sleep cycles.",
      "Conclusion": "Selective deprivation of post-acquisition slow-wave sleep impairs both the stability and qualitative reorganization of declarative memories."
    }
  },
  {
    id: "paper-synaptic-homeostasis-2014",
    title: "Sleep and the Price of Plasticity: From Synaptic and Cellular Homeostasis to Memory",
    authors: ["Giulio Tononi", "Chiara Cirelli"],
    year: 2014,
    journal: "Neuron (Vol 81, Issue 1)",
    doi: "10.1016/j.neuron.2013.12.025",
    pageCount: 22,
    status: "indexed",
    chunkCount: 78,
    tags: ["Synaptic Homeostasis", "Slow-Wave Sleep", "Cognitive Function"],
    sourceUrl: "https://doi.org/10.1016/j.neuron.2013.12.025",
    abstract: "The synaptic homeostasis hypothesis (SHY) proposes that wakefulness is accompanied by net synaptic potentiation across neural circuits, whereas sleep is required to downscale synaptic weights to baseline levels, thereby preserving cellular energy and enhancing signal-to-noise ratio for memory consolidation.",
    sections: {
      "Abstract": "The synaptic homeostasis hypothesis (SHY) proposes that wakefulness is accompanied by net synaptic potentiation...",
      "Introduction": "Sustained wakefulness imposes severe metabolic, structural, and energetic burdens on cerebral cortex circuits due to ongoing long-term potentiation...",
      "Methods": "In vivo 2-photon imaging and serial block-face electron microscopy in mammalian cortical spines following prolonged wakefulness vs uninterrupted slow-wave sleep periods...",
      "Results": "Synaptic contact areas and spine volumes decreased by an average of 18% following slow-wave sleep, reflecting generalized yet selective downselection of weaker non-consolidated synapses.",
      "Discussion": "Downscaling prevents circuit saturation. By pruning weaker connections while preserving consolidated engram hubs, sleep re-establishes cellular capacity for fresh next-day encoding.",
      "Conclusion": "Deprivation of restorative sleep produces persistent synaptic saturation, directly diminishing hippocampal neuroplasticity."
    }
  },
  {
    id: "paper-hippocampal-replay-2018",
    title: "Coordinated Hippocampal-Cortical Replay During Slow Oscillations",
    authors: ["György Buzsáki", "David Dupret"],
    year: 2018,
    journal: "Nature Neuroscience",
    doi: "10.1038/s41593-018-0245-x",
    pageCount: 15,
    status: "indexed",
    chunkCount: 52,
    tags: ["Sharp-Wave Ripples", "Hippocampus", "Neural Replay"],
    sourceUrl: "https://doi.org/10.1038/s41593-018-0245-x",
    abstract: "High-density multi-electrode recordings demonstrate that sharp-wave ripples (SWRs) in the CA1 hippocampal region replay wakeful neural sequence patterns up to 20 times faster than original experience, tightly synchronized with thalamocortical sleep spindles.",
    sections: {
      "Abstract": "High-density multi-electrode recordings demonstrate that sharp-wave ripples (SWRs)...",
      "Introduction": "Temporal coordination between subcortical and cortical oscillatory pacemakers is hypothesized to mediate systemic memory consolidation...",
      "Methods": "Silicon probe recording across CA1, dentate gyrus, and medial prefrontal cortex in rodent spatial navigation and fear conditioning paradigms...",
      "Results": "Optogenetic disruption of ripple events during NREM sleep abolished task-related performance gains without disrupting basic alertness.",
      "Discussion": "Disruption of ripple-spindle coupling demonstrates that memory stabilization is driven by rhythmic replay rather than passive absence of sensory interference.",
      "Conclusion": "Targeted ripple intervention confirms a causal link between sleep neural replay and declarative memory consolidation."
    }
  },
  {
    id: "paper-rem-emotional-2020",
    title: "REM Sleep Theta Rhythms and the Selective De-potentiating of Emotional Memory Traces",
    authors: ["Rosalind Cartwright", "Els van der Helm"],
    year: 2020,
    journal: "Current Biology",
    doi: "10.1016/j.cub.2020.04.019",
    pageCount: 14,
    status: "indexed",
    chunkCount: 45,
    tags: ["REM Sleep", "Emotional Regulation", "Amygdala"],
    sourceUrl: "https://doi.org/10.1016/j.cub.2020.04.019",
    abstract: "Rapid eye movement (REM) sleep features a unique neurochemical milieu marked by dramatic aminergic down-regulation. This state facilitates the extraction of cognitive memory content while stripping away hyper-reactive affective charges.",
    sections: {
      "Abstract": "Rapid eye movement (REM) sleep features a unique neurochemical milieu...",
      "Introduction": "Affective experiences leave indelible declarative traces that must be dissociated from autonomic arousal...",
      "Methods": "fMRI combined with high-density polysomnography during emotional valence picture presentation before and after REM-deprived nights...",
      "Results": "REM sleep reduction sustained amygdala hyper-reactivity upon re-exposure, failing to migrate memory representation to ventromedial prefrontal cortex.",
      "Discussion": "REM sleep functions as an overnight emotional thermostat, decoupling declarative facts from visceral autonomic arousal.",
      "Conclusion": "Intact REM sleep is crucial for selective affective stabilization and cognitive flexibility."
    }
  }
];

export const MOCK_COLLECTIONS = [
  { id: "col-1", name: "Cognitive Neuroscience & Memory", paperCount: 4, updatedAt: "2026-09-28" },
  { id: "col-2", name: "Synaptic Plasticity & Homeostasis", paperCount: 2, updatedAt: "2026-09-25" },
  { id: "col-3", name: "LLM Hallucination Benchmarks", paperCount: 0, updatedAt: "2026-09-15" }
];

export const MOCK_RESEARCH_QUERY_RESULTS = {
  "sleep": {
    question: "Does sleep deprivation affect memory consolidation and neural plasticity?",
    confidence: 0.94,
    insufficientEvidence: false,
    summary: "Consensus across the literature confirms that sleep deprivation severely impairs both declarative and procedural memory consolidation. Acute loss of slow-wave sleep disrupts hippocampal-to-neocortical memory transfer, while prolonged wakefulness causes synaptic saturation that inhibits subsequent encoding capacity.",
    claims: [
      {
        id: "claim-1",
        text: "Sleep deprivation reduces post-learning memory retention by disrupting hippocampal-neocortical sharp-wave ripple coupling.",
        sourceIds: ["source-walker-1", "source-buzsaki-1"]
      },
      {
        id: "claim-2",
        text: "Sustained wakefulness results in net synaptic potentiation that saturates neural networks, preventing efficient encoding of novel information.",
        sourceIds: ["source-tononi-1"]
      },
      {
        id: "claim-3",
        text: "Targeted optogenetic suppression of sharp-wave ripples during slow-wave sleep prevents declarative memory stabilization.",
        sourceIds: ["source-buzsaki-1"]
      },
      {
        id: "claim-4",
        text: "REM sleep deprivation selectively impedes emotional regulation by hindering amygdala depotentiation.",
        sourceIds: ["source-rem-1"]
      }
    ],
    sources: [
      {
        id: "source-walker-1",
        paperId: "paper-sleep-mem-2006",
        paperTitle: "Sleep-Dependent Memory Consolidation and Synaptic Plasticity",
        authors: ["Matthew P. Walker", "Robert Stickgold"],
        year: 2006,
        pageNumber: 12,
        section: "Results",
        relevanceScore: 0.96,
        chunkId: "chk-walker-sec-results-12",
        sourceUrl: "https://doi.org/10.1016/j.neuron.2006.08.012",
        text: "The normal sleep group exhibited a 22.4% higher recall accuracy after a 24-hour interval compared with the sleep-deprived group (p < 0.001). Slow-wave sleep (SWS) delta band power correlated strongly with hippocampal retention indexes (r = 0.68)."
      },
      {
        id: "source-tononi-1",
        paperId: "paper-synaptic-homeostasis-2014",
        paperTitle: "Sleep and the Price of Plasticity: From Synaptic and Cellular Homeostasis to Memory",
        authors: ["Giulio Tononi", "Chiara Cirelli"],
        year: 2014,
        pageNumber: 8,
        section: "Discussion",
        relevanceScore: 0.92,
        chunkId: "chk-tononi-sec-disc-08",
        sourceUrl: "https://doi.org/10.1016/j.neuron.2013.12.025",
        text: "Synaptic contact areas and spine volumes decreased by an average of 18% following slow-wave sleep, reflecting generalized yet selective downselection of weaker non-consolidated synapses. Deprivation of restorative sleep produces persistent synaptic saturation, directly diminishing hippocampal neuroplasticity."
      },
      {
        id: "source-buzsaki-1",
        paperId: "paper-hippocampal-replay-2018",
        paperTitle: "Coordinated Hippocampal-Cortical Replay During Slow Oscillations",
        authors: ["György Buzsáki", "David Dupret"],
        year: 2018,
        pageNumber: 5,
        section: "Results",
        relevanceScore: 0.89,
        chunkId: "chk-buzsaki-sec-res-05",
        sourceUrl: "https://doi.org/10.1038/s41593-018-0245-x",
        text: "Optogenetic disruption of ripple events during NREM sleep abolished task-related performance gains without disrupting basic alertness. High-density multi-electrode recordings demonstrate that sharp-wave ripples (SWRs) in the CA1 hippocampal region replay wakeful neural sequence patterns up to 20 times faster than original experience."
      },
      {
        id: "source-rem-1",
        paperId: "paper-rem-emotional-2020",
        paperTitle: "REM Sleep Theta Rhythms and the Selective De-potentiating of Emotional Memory Traces",
        authors: ["Rosalind Cartwright", "Els van der Helm"],
        year: 2020,
        pageNumber: 9,
        section: "Results",
        relevanceScore: 0.85,
        chunkId: "chk-rem-sec-res-09",
        sourceUrl: "https://doi.org/10.1016/j.cub.2020.04.019",
        text: "REM sleep reduction sustained amygdala hyper-reactivity upon re-exposure, failing to migrate memory representation to ventromedial prefrontal cortex. Intact REM sleep is crucial for selective affective stabilization and cognitive flexibility."
      }
    ]
  },
  "insufficient": {
    question: "What is the quantum gravitational effect on cellular mitosis in mammalian hepatocytes?",
    confidence: 0.12,
    insufficientEvidence: true,
    insufficientReasons: [
      "No indexed papers investigate quantum gravitational interactions with mitotic spindle mechanics.",
      "The retrieved passages exclusively discuss macroeconomic or standard neuroscience domains.",
      "Confidence threshold (0.65) was not met by any candidate evidence chunks."
    ],
    summary: "The available papers do not contain enough relevant evidence to answer this question confidently.",
    claims: [],
    sources: [
      {
        id: "source-part-1",
        paperId: "paper-sleep-mem-2006",
        paperTitle: "Sleep-Dependent Memory Consolidation and Synaptic Plasticity",
        authors: ["Matthew P. Walker"],
        year: 2006,
        pageNumber: 3,
        section: "Introduction",
        relevanceScore: 0.18,
        text: "Over the past decade, cognitive neuroscience has shifted from viewing sleep as a passive recovery state..."
      }
    ]
  }
};

export const MOCK_COMPARISON_DATA = [
  {
    finding: "Mechanism of Declarative Memory Stabilization",
    papers: {
      "paper-sleep-mem-2006": {
        summary: "Two-stage memory transfer mediated by slow-wave delta oscillation power.",
        excerpt: "Slow-wave sleep (SWS) delta band power correlated strongly with hippocampal retention indexes (r = 0.68).",
        methodology: "Paired-associate declarative word test cohorts with 24h polysomnography.",
        stance: "supports"
      },
      "paper-synaptic-homeostasis-2014": {
        summary: "Global synaptic downscaling preserves energy and prevents saturation of memory circuits.",
        excerpt: "Synaptic contact areas and spine volumes decreased by an average of 18% following slow-wave sleep.",
        methodology: "In vivo 2-photon imaging and serial block-face electron microscopy in cortical spines.",
        stance: "supports"
      },
      "paper-hippocampal-replay-2018": {
        summary: "Accelerated sharp-wave ripple replays coordinated with thalamocortical spindles.",
        excerpt: "Optogenetic disruption of ripple events during NREM sleep abolished task-related performance gains.",
        methodology: "High-density silicon probe recording and closed-loop optogenetics in CA1/mPFC.",
        stance: "supports"
      }
    }
  },
  {
    finding: "Role of Wakefulness in Synaptic Net Potentiation",
    papers: {
      "paper-sleep-mem-2006": {
        summary: "Views wakefulness as an active encoding period without direct metabolic quantifications.",
        excerpt: "Awake intervals permit initial hippocampal encoding but leave representations fragile.",
        methodology: "Behavioral recall tracking.",
        stance: "neutral"
      },
      "paper-synaptic-homeostasis-2014": {
        summary: "Sustained wakefulness systematically drives potentiation toward unsustainable ceiling levels.",
        excerpt: "Wakefulness is accompanied by net synaptic potentiation across neural circuits.",
        methodology: "Microstructural spine density profiling.",
        stance: "supports"
      },
      "paper-hippocampal-replay-2018": {
        summary: "Identifies wakefulness as sequence assembly phase later re-executed during sleep.",
        excerpt: "Wakeful sequence trajectories provide the template for time-compressed offline replay.",
        methodology: "Multi-unit spike train decoding.",
        stance: "supports"
      }
    }
  }
];
