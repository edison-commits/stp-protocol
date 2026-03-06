import { useState, useMemo } from "react";

// ─── CANONICAL REGISTRY ──────────────────────────────────────────────────────
// This is the source of truth. Every STP concept ref resolves to an entry here.
// Structure: id, canonical_ref, label, domain, aliases, related, defined_at, version

const REGISTRY = [
  // ── AI / MACHINE LEARNING ─────────────────────────────────────
  {
    id: "stp:ai.ml.001",
    ref: "machine_learning",
    label: "Machine Learning",
    domain: "ai.ml",
    definition: "Statistical methods enabling systems to learn patterns from data without explicit programming.",
    aliases: ["ML", "statistical_learning", "supervised_learning_general"],
    related: [
      { ref: "deep_learning",      type: "is_type_of",   strength: 0.95 },
      { ref: "neural_network",     type: "requires",     strength: 0.88 },
      { ref: "training_data",      type: "requires",     strength: 0.97 },
    ],
    version: "1.0",
    defined_at: "2024-01-01",
    stability: "stable",
  },
  {
    id: "stp:ai.ml.002",
    ref: "deep_learning",
    label: "Deep Learning",
    domain: "ai.ml",
    definition: "Machine learning using multi-layer neural networks to learn hierarchical representations.",
    aliases: ["DL", "deep_neural_network", "DNN"],
    related: [
      { ref: "machine_learning",   type: "is_type_of",   strength: 0.97 },
      { ref: "neural_network",     type: "requires",     strength: 0.99 },
      { ref: "transformer",        type: "relates_to",   strength: 0.85 },
    ],
    version: "1.0",
    defined_at: "2024-01-01",
    stability: "stable",
  },
  {
    id: "stp:ai.ml.003",
    ref: "neural_network",
    label: "Neural Network",
    domain: "ai.ml",
    definition: "Computational graph of interconnected nodes (neurons) organized in layers that process information.",
    aliases: ["ANN", "artificial_neural_network", "network_model"],
    related: [
      { ref: "deep_learning",      type: "supports",     strength: 0.95 },
      { ref: "transformer",        type: "is_type_of",   strength: 0.90 },
      { ref: "attention_mechanism",type: "relates_to",   strength: 0.88 },
    ],
    version: "1.0",
    defined_at: "2024-01-01",
    stability: "stable",
  },
  {
    id: "stp:ai.ml.004",
    ref: "transformer",
    label: "Transformer Architecture",
    domain: "ai.ml",
    definition: "Neural network architecture based on self-attention, foundational to modern large language models.",
    aliases: ["transformer_model", "attention_transformer", "self_attention_model"],
    related: [
      { ref: "attention_mechanism",type: "requires",     strength: 0.99 },
      { ref: "neural_network",     type: "is_type_of",   strength: 0.97 },
      { ref: "large_language_model",type: "causes",      strength: 0.95 },
    ],
    version: "1.0",
    defined_at: "2024-01-01",
    stability: "stable",
  },
  {
    id: "stp:ai.ml.005",
    ref: "attention_mechanism",
    label: "Attention Mechanism",
    domain: "ai.ml",
    definition: "Mechanism allowing models to weight the relevance of different input elements when producing output.",
    aliases: ["self_attention", "cross_attention", "scaled_dot_product_attention"],
    related: [
      { ref: "transformer",        type: "supports",     strength: 0.99 },
      { ref: "vector_embedding",   type: "requires",     strength: 0.88 },
    ],
    version: "1.0",
    defined_at: "2024-01-01",
    stability: "stable",
  },
  {
    id: "stp:ai.ml.006",
    ref: "large_language_model",
    label: "Large Language Model",
    domain: "ai.ml",
    definition: "Transformer-based model trained on large text corpora capable of generating and understanding language.",
    aliases: ["LLM", "foundation_model", "language_model"],
    related: [
      { ref: "transformer",        type: "requires",     strength: 0.99 },
      { ref: "inference",          type: "causes",       strength: 0.92 },
      { ref: "agent",              type: "supports",     strength: 0.90 },
    ],
    version: "1.0",
    defined_at: "2024-01-01",
    stability: "stable",
  },
  {
    id: "stp:ai.ml.007",
    ref: "inference",
    label: "Model Inference",
    domain: "ai.ml",
    definition: "Process of running a trained model on new inputs to generate predictions or outputs.",
    aliases: ["model_inference", "forward_pass", "prediction"],
    related: [
      { ref: "large_language_model",type: "requires",   strength: 0.95 },
      { ref: "quantization",       type: "supports",    strength: 0.85 },
    ],
    version: "1.0",
    defined_at: "2024-01-01",
    stability: "stable",
  },
  {
    id: "stp:ai.ml.008",
    ref: "quantization",
    label: "Model Quantization",
    domain: "ai.ml",
    definition: "Technique to reduce model precision (e.g. FP32→INT8) to decrease memory footprint and increase inference speed.",
    aliases: ["model_compression", "weight_quantization", "GGUF", "GPTQ"],
    related: [
      { ref: "inference",          type: "supports",    strength: 0.92 },
      { ref: "large_language_model",type: "relates_to", strength: 0.88 },
    ],
    version: "1.0",
    defined_at: "2024-01-01",
    stability: "stable",
  },
  {
    id: "stp:ai.ml.009",
    ref: "training_data",
    label: "Training Data",
    domain: "ai.ml",
    definition: "Labeled or unlabeled dataset used to train a machine learning model.",
    aliases: ["dataset", "corpus", "training_corpus", "training_set"],
    related: [
      { ref: "machine_learning",   type: "supports",    strength: 0.99 },
      { ref: "fine_tuning",        type: "requires",    strength: 0.95 },
    ],
    version: "1.0",
    defined_at: "2024-01-01",
    stability: "stable",
  },
  {
    id: "stp:ai.ml.010",
    ref: "fine_tuning",
    label: "Fine-Tuning",
    domain: "ai.ml",
    definition: "Adapting a pre-trained model to a specific task or domain using additional targeted training.",
    aliases: ["finetuning", "RLHF", "instruction_tuning", "adapter_training"],
    related: [
      { ref: "large_language_model",type: "relates_to", strength: 0.95 },
      { ref: "training_data",      type: "requires",    strength: 0.97 },
    ],
    version: "1.0",
    defined_at: "2024-01-01",
    stability: "stable",
  },

  // ── AI / AGENTS ───────────────────────────────────────────────
  {
    id: "stp:ai.agents.001",
    ref: "agent",
    label: "AI Agent",
    domain: "ai.agents",
    definition: "Autonomous software entity that perceives its environment, reasons, and takes actions to achieve goals.",
    aliases: ["AI_agent", "autonomous_agent", "software_agent"],
    related: [
      { ref: "large_language_model",type: "requires",   strength: 0.88 },
      { ref: "memory",             type: "requires",    strength: 0.85 },
      { ref: "tool_use",           type: "requires",    strength: 0.90 },
      { ref: "reasoning",          type: "requires",    strength: 0.92 },
    ],
    version: "1.0",
    defined_at: "2024-01-01",
    stability: "stable",
  },
  {
    id: "stp:ai.agents.002",
    ref: "memory",
    label: "Agent Memory",
    domain: "ai.agents",
    definition: "Mechanism for an agent to persist, retrieve, and reason over past interactions and facts.",
    aliases: ["agent_memory", "context_memory", "episodic_memory", "working_memory"],
    related: [
      { ref: "agent",              type: "supports",    strength: 0.92 },
      { ref: "retrieval",          type: "requires",    strength: 0.88 },
      { ref: "vector_embedding",   type: "relates_to",  strength: 0.82 },
    ],
    version: "1.0",
    defined_at: "2024-01-01",
    stability: "stable",
  },
  {
    id: "stp:ai.agents.003",
    ref: "tool_use",
    label: "Tool Use",
    domain: "ai.agents",
    definition: "Agent capability to invoke external functions, APIs, or services to extend its reasoning.",
    aliases: ["function_calling", "tool_calling", "API_use", "plugin_use"],
    related: [
      { ref: "agent",              type: "supports",    strength: 0.95 },
      { ref: "reasoning",          type: "requires",    strength: 0.88 },
    ],
    version: "1.0",
    defined_at: "2024-01-01",
    stability: "stable",
  },
  {
    id: "stp:ai.agents.004",
    ref: "reasoning",
    label: "Chain of Thought Reasoning",
    domain: "ai.agents",
    definition: "Step-by-step reasoning process where intermediate steps are made explicit before reaching a conclusion.",
    aliases: ["chain_of_thought", "CoT", "step_by_step_reasoning", "deliberative_reasoning"],
    related: [
      { ref: "agent",              type: "supports",    strength: 0.90 },
      { ref: "large_language_model",type: "requires",  strength: 0.92 },
    ],
    version: "1.0",
    defined_at: "2024-01-01",
    stability: "stable",
  },
  {
    id: "stp:ai.agents.005",
    ref: "multi_agent",
    label: "Multi-Agent System",
    domain: "ai.agents",
    definition: "System of multiple coordinating AI agents that communicate and divide work to accomplish complex tasks.",
    aliases: ["agent_swarm", "agent_network", "multi_agent_system", "MAS"],
    related: [
      { ref: "agent",              type: "is_type_of",  strength: 0.97 },
      { ref: "protocol",           type: "requires",    strength: 0.88 },
    ],
    version: "1.0",
    defined_at: "2024-01-01",
    stability: "stable",
  },

  // ── AI / SEARCH ───────────────────────────────────────────────
  {
    id: "stp:ai.search.001",
    ref: "semantic_search",
    label: "Semantic Search",
    domain: "ai.search",
    definition: "Search that matches by meaning and context rather than exact keyword matching.",
    aliases: ["meaning_search", "vector_search", "dense_retrieval"],
    related: [
      { ref: "vector_embedding",   type: "requires",    strength: 0.97 },
      { ref: "retrieval",          type: "is_type_of",  strength: 0.95 },
      { ref: "knowledge_graph",    type: "relates_to",  strength: 0.80 },
    ],
    version: "1.0",
    defined_at: "2024-01-01",
    stability: "stable",
  },
  {
    id: "stp:ai.search.002",
    ref: "vector_embedding",
    label: "Vector Embedding",
    domain: "ai.search",
    definition: "Dense numerical representation of semantic meaning in high-dimensional space.",
    aliases: ["embedding", "dense_vector", "semantic_vector", "word_vector"],
    related: [
      { ref: "semantic_search",    type: "supports",    strength: 0.97 },
      { ref: "attention_mechanism",type: "requires",    strength: 0.88 },
      { ref: "knowledge_graph",    type: "supports",    strength: 0.78 },
    ],
    version: "1.0",
    defined_at: "2024-01-01",
    stability: "stable",
  },
  {
    id: "stp:ai.search.003",
    ref: "retrieval",
    label: "Retrieval System",
    domain: "ai.search",
    definition: "System that fetches relevant information from a corpus in response to a query.",
    aliases: ["information_retrieval", "IR", "document_retrieval", "RAG_retrieval"],
    related: [
      { ref: "semantic_search",    type: "is_type_of",  strength: 0.88 },
      { ref: "memory",             type: "supports",    strength: 0.85 },
      { ref: "knowledge_graph",    type: "relates_to",  strength: 0.80 },
    ],
    version: "1.0",
    defined_at: "2024-01-01",
    stability: "stable",
  },
  {
    id: "stp:ai.search.004",
    ref: "rag",
    label: "Retrieval-Augmented Generation",
    domain: "ai.search",
    definition: "Pattern combining retrieval of relevant documents with generative model output for grounded responses.",
    aliases: ["RAG", "retrieval_augmented_generation", "grounded_generation"],
    related: [
      { ref: "retrieval",          type: "requires",    strength: 0.99 },
      { ref: "large_language_model",type: "requires",  strength: 0.97 },
      { ref: "vector_embedding",   type: "requires",   strength: 0.92 },
    ],
    version: "1.0",
    defined_at: "2024-01-01",
    stability: "stable",
  },

  // ── DATA ──────────────────────────────────────────────────────
  {
    id: "stp:data.graph.001",
    ref: "knowledge_graph",
    label: "Knowledge Graph",
    domain: "data.graph",
    definition: "Graph structure encoding entities and the typed relationships between them.",
    aliases: ["KG", "entity_graph", "semantic_graph", "ontology_graph"],
    related: [
      { ref: "semantic_search",    type: "supports",    strength: 0.85 },
      { ref: "vector_embedding",   type: "relates_to",  strength: 0.78 },
      { ref: "retrieval",          type: "supports",    strength: 0.82 },
    ],
    version: "1.0",
    defined_at: "2024-01-01",
    stability: "stable",
  },

  // ── SYSTEMS ───────────────────────────────────────────────────
  {
    id: "stp:systems.network.001",
    ref: "protocol",
    label: "Communication Protocol",
    domain: "systems.network",
    definition: "Formal rules governing data exchange between systems.",
    aliases: ["network_protocol", "wire_protocol", "communication_standard"],
    related: [
      { ref: "multi_agent",        type: "supports",    strength: 0.90 },
      { ref: "agent",              type: "requires",    strength: 0.75 },
    ],
    version: "1.0",
    defined_at: "2024-01-01",
    stability: "stable",
  },

  // ── PHYSICS / QUANTUM ─────────────────────────────────────────
  {
    id: "stp:physics.quantum.001",
    ref: "quantum_computing",
    label: "Quantum Computing",
    domain: "physics.quantum",
    definition: "Computing paradigm exploiting quantum mechanical phenomena such as superposition and entanglement.",
    aliases: ["quantum_computer", "quantum_processor", "QC"],
    related: [
      { ref: "error_correction",   type: "requires",    strength: 0.95 },
    ],
    version: "1.0",
    defined_at: "2024-01-01",
    stability: "stable",
  },
  {
    id: "stp:physics.quantum.002",
    ref: "error_correction",
    label: "Quantum Error Correction",
    domain: "physics.quantum",
    definition: "Techniques to protect quantum information from decoherence and other quantum noise.",
    aliases: ["QEC", "quantum_error_correction", "fault_tolerant_computing"],
    related: [
      { ref: "quantum_computing",  type: "supports",    strength: 0.95 },
    ],
    version: "1.0",
    defined_at: "2024-01-01",
    stability: "stable",
  },
];

// ─── DOMAIN TAXONOMY ──────────────────────────────────────────────────────────
const DOMAINS = {
  "ai": {
    label: "Artificial Intelligence",
    children: {
      "ai.ml":      { label: "Machine Learning" },
      "ai.agents":  { label: "AI Agents" },
      "ai.search":  { label: "Search & Retrieval" },
    }
  },
  "data": {
    label: "Data Systems",
    children: {
      "data.graph": { label: "Graph & Knowledge" },
    }
  },
  "systems": {
    label: "Systems",
    children: {
      "systems.network": { label: "Networking & Protocols" },
    }
  },
  "physics": {
    label: "Physics",
    children: {
      "physics.quantum": { label: "Quantum" },
    }
  },
};

// ─── REGISTRY ENGINE ─────────────────────────────────────────────────────────
function resolve(query) {
  const q = query.toLowerCase().trim();
  // exact ref match
  let match = REGISTRY.find(c => c.ref === q);
  if (match) return { concept: match, via: 'exact_ref' };
  // alias match
  match = REGISTRY.find(c => c.aliases.some(a => a.toLowerCase() === q));
  if (match) return { concept: match, via: 'alias' };
  // partial label match
  match = REGISTRY.find(c => c.label.toLowerCase().includes(q));
  if (match) return { concept: match, via: 'label_partial' };
  // partial ref match
  match = REGISTRY.find(c => c.ref.includes(q));
  if (match) return { concept: match, via: 'ref_partial' };
  return null;
}

function getRelated(concept) {
  return concept.related.map(r => {
    const found = REGISTRY.find(c => c.ref === r.ref);
    return { ...r, concept: found || null };
  });
}

// ─── UI ───────────────────────────────────────────────────────────────────────
const DOMAIN_COLORS = {
  "ai.ml":           "#60a5fa",
  "ai.agents":       "#a78bfa",
  "ai.search":       "#34d399",
  "data.graph":      "#fb923c",
  "systems.network": "#f472b6",
  "physics.quantum": "#facc15",
};

const STABILITY_COLORS = { stable: "#34d399", draft: "#facc15", deprecated: "#f43f5e" };

const REL_COLORS = {
  requires: "#60a5fa", supports: "#34d399", is_type_of: "#a78bfa",
  causes: "#fb923c", relates_to: "#94a3b8", contradicts: "#f43f5e",
  precedes: "#f472b6", refutes: "#f87171"
};

function ConceptCard({ concept, compact = false, onClick }) {
  const dc = DOMAIN_COLORS[concept.domain] || "#94a3b8";
  return (
    <div
      onClick={onClick}
      style={{
        background: "#0c0c14",
        border: `1px solid #1c1c28`,
        borderRadius: 6,
        padding: compact ? "10px 12px" : "14px 16px",
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.2s",
      }}
      onMouseEnter={e => onClick && (e.currentTarget.style.borderColor = dc + "66")}
      onMouseLeave={e => onClick && (e.currentTarget.style.borderColor = "#1c1c28")}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: compact ? 4 : 8 }}>
        <div style={{
          width: 6, height: 6, borderRadius: "50%",
          background: dc, boxShadow: `0 0 5px ${dc}`,
          flexShrink: 0
        }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: "#e0e0f0", fontFamily: "'Syne', sans-serif" }}>
          {concept.label}
        </span>
        <span style={{
          marginLeft: "auto", fontSize: 9, padding: "1px 6px",
          background: `${dc}15`, border: `1px solid ${dc}33`,
          borderRadius: 3, color: dc, letterSpacing: "0.1em"
        }}>
          {concept.domain}
        </span>
      </div>

      <div style={{ fontSize: 9, color: "#2a2a40", letterSpacing: "0.12em", marginBottom: compact ? 0 : 6 }}>
        {concept.id}
      </div>

      {!compact && (
        <>
          <p style={{ fontSize: 11, color: "#5a5a78", lineHeight: 1.7, marginBottom: 10 }}>
            {concept.definition}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {concept.aliases.map((a, i) => (
              <span key={i} style={{
                fontSize: 9, padding: "1px 6px",
                background: "#0f0f1c", border: "1px solid #1a1a2a",
                borderRadius: 3, color: "#3a3a58", letterSpacing: "0.08em"
              }}>
                {a}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function RelationBadge({ type }) {
  const c = REL_COLORS[type] || "#94a3b8";
  return (
    <span style={{
      fontSize: 9, padding: "1px 7px",
      background: `${c}12`, border: `1px solid ${c}30`,
      borderRadius: 3, color: c, letterSpacing: "0.08em",
      fontFamily: "'DM Mono', monospace"
    }}>
      {type}
    </span>
  );
}

export default function STPRegistry() {
  const [query, setQuery] = useState("");
  const [resolved, setResolved] = useState(null);
  const [selected, setSelected] = useState(null);
  const [activeDomain, setActiveDomain] = useState(null);
  const [tab, setTab] = useState("browse"); // browse | lookup | graph

  const handleResolve = (q) => {
    const r = q || query;
    if (!r.trim()) return;
    const result = resolve(r);
    setResolved(result);
    if (result) setSelected(result.concept);
  };

  const filteredConcepts = useMemo(() => {
    if (activeDomain) return REGISTRY.filter(c => c.domain === activeDomain);
    if (query && tab === "browse") {
      return REGISTRY.filter(c =>
        c.label.toLowerCase().includes(query.toLowerCase()) ||
        c.ref.includes(query.toLowerCase()) ||
        c.aliases.some(a => a.toLowerCase().includes(query.toLowerCase()))
      );
    }
    return REGISTRY;
  }, [activeDomain, query, tab]);

  const domainCounts = useMemo(() => {
    const counts = {};
    REGISTRY.forEach(c => { counts[c.domain] = (counts[c.domain] || 0) + 1; });
    return counts;
  }, []);

  return (
    <div style={{
      fontFamily: "'DM Mono', monospace",
      background: "#07070e",
      minHeight: "100vh",
      color: "#c0c0d8",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{
        borderBottom: "1px solid #13131e",
        padding: "14px 22px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "rgba(5,5,10,0.9)",
        position: "sticky", top: 0, zIndex: 10,
        backdropFilter: "blur(10px)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: "0.2em", color: "#e0e0f8", fontFamily: "'Syne',sans-serif" }}>
            STP
          </span>
          <span style={{ fontSize: 10, color: "#2a2a40", letterSpacing: "0.15em" }}>
            CONCEPT REGISTRY / v1.0
          </span>
          <div style={{
            fontSize: 10, padding: "2px 8px",
            background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)",
            borderRadius: 3, color: "#34d399"
          }}>
            {REGISTRY.length} CONCEPTS
          </div>
        </div>
        <div style={{ display: "flex", gap: 2 }}>
          {["browse", "lookup", "graph"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              background: tab === t ? "rgba(96,165,250,0.1)" : "transparent",
              border: `1px solid ${tab === t ? "rgba(96,165,250,0.3)" : "#13131e"}`,
              color: tab === t ? "#60a5fa" : "#2a2a48",
              padding: "4px 12px", borderRadius: 4, cursor: "pointer",
              fontSize: 10, letterSpacing: "0.1em", fontFamily: "inherit"
            }}>
              {t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", height: "calc(100vh - 49px)", overflow: "hidden" }}>

        {/* Sidebar */}
        <div style={{
          width: 220, borderRight: "1px solid #13131e",
          padding: "16px 12px", overflowY: "auto",
          background: "rgba(4,4,10,0.5)",
          display: "flex", flexDirection: "column", gap: 4
        }}>
          <div style={{ fontSize: 9, letterSpacing: "0.2em", color: "#1e1e30", marginBottom: 8 }}>
            DOMAIN TAXONOMY
          </div>

          <div
            onClick={() => setActiveDomain(null)}
            style={{
              padding: "6px 10px", borderRadius: 4, cursor: "pointer",
              background: !activeDomain ? "rgba(255,255,255,0.04)" : "transparent",
              border: `1px solid ${!activeDomain ? "#2a2a3a" : "transparent"}`,
              fontSize: 10, color: !activeDomain ? "#c0c0d8" : "#3a3a58",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              transition: "all 0.15s"
            }}
          >
            <span>ALL</span>
            <span style={{ color: "#2a2a40" }}>{REGISTRY.length}</span>
          </div>

          {Object.entries(DOMAINS).map(([topKey, topVal]) => (
            <div key={topKey}>
              <div style={{
                fontSize: 9, letterSpacing: "0.15em", color: "#1e1e2e",
                padding: "8px 10px 4px", marginTop: 4
              }}>
                {topVal.label.toUpperCase()}
              </div>
              {Object.entries(topVal.children).map(([domKey, domVal]) => {
                const dc = DOMAIN_COLORS[domKey] || "#94a3b8";
                const isActive = activeDomain === domKey;
                return (
                  <div
                    key={domKey}
                    onClick={() => setActiveDomain(isActive ? null : domKey)}
                    style={{
                      padding: "5px 10px", borderRadius: 4, cursor: "pointer",
                      background: isActive ? `${dc}10` : "transparent",
                      border: `1px solid ${isActive ? dc + "30" : "transparent"}`,
                      fontSize: 10, color: isActive ? dc : "#3a3a58",
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      transition: "all 0.15s", marginBottom: 1
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{
                        width: 4, height: 4, borderRadius: "50%",
                        background: isActive ? dc : "#2a2a3a"
                      }} />
                      {domVal.label}
                    </div>
                    <span style={{ color: "#2a2a40", fontSize: 9 }}>{domCounts[domKey] || 0}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Main panel */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* Content */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>

            {/* Search bar */}
            <div style={{
              display: "flex", gap: 8, marginBottom: 16,
              background: "#0c0c14", border: "1px solid #1a1a26",
              borderRadius: 6, padding: "8px 14px",
              alignItems: "center"
            }}>
              <span style={{ color: "#2a2a40", fontSize: 12 }}>›</span>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && tab === "lookup" && handleResolve()}
                placeholder={tab === "lookup" ? "resolve concept: try 'LLM', 'ML', 'RAG', 'CoT'..." : "filter concepts..."}
                style={{
                  flex: 1, background: "transparent", border: "none",
                  color: "#a0a0c0", fontSize: 11, fontFamily: "inherit",
                  outline: "none", letterSpacing: "0.05em"
                }}
              />
              {tab === "lookup" && (
                <button onClick={() => handleResolve()} style={{
                  background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.25)",
                  color: "#60a5fa", padding: "3px 10px", borderRadius: 3,
                  cursor: "pointer", fontSize: 9, letterSpacing: "0.12em", fontFamily: "inherit"
                }}>
                  RESOLVE
                </button>
              )}
            </div>

            {/* Lookup result */}
            {tab === "lookup" && resolved && (
              <div style={{
                background: "#0c0c14", border: "1px solid #1e1e30",
                borderRadius: 6, padding: "12px 16px", marginBottom: 14
              }}>
                <div style={{ fontSize: 9, letterSpacing: "0.15em", color: "#2a2a40", marginBottom: 8 }}>
                  RESOLVED VIA: <span style={{ color: "#34d399" }}>{resolved.via}</span>
                </div>
                <ConceptCard concept={resolved.concept} onClick={() => setSelected(resolved.concept)} />
              </div>
            )}

            {tab === "lookup" && resolved === null && query && (
              <div style={{
                background: "rgba(244,63,94,0.05)", border: "1px solid rgba(244,63,94,0.15)",
                borderRadius: 6, padding: "12px 16px", marginBottom: 14,
                fontSize: 11, color: "#f43f5e"
              }}>
                NO MATCH: "{query}" — not in registry. Consider submitting a new concept definition.
              </div>
            )}

            {/* Browse grid */}
            {(tab === "browse" || tab === "lookup") && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {filteredConcepts.map(c => (
                  <ConceptCard
                    key={c.id}
                    concept={c}
                    compact={false}
                    onClick={() => setSelected(c)}
                  />
                ))}
              </div>
            )}

            {/* Graph tab — relation map */}
            {tab === "graph" && (
              <div>
                <div style={{ fontSize: 9, letterSpacing: "0.15em", color: "#2a2a40", marginBottom: 12 }}>
                  RELATION MAP · ALL CROSS-CONCEPT EDGES
                </div>
                {REGISTRY.map(c => (
                  c.related.length > 0 && (
                    <div key={c.id} style={{
                      background: "#0c0c14", border: "1px solid #13131e",
                      borderRadius: 6, padding: "10px 14px", marginBottom: 8
                    }}>
                      <div style={{
                        display: "flex", alignItems: "center", gap: 8, marginBottom: 8,
                        cursor: "pointer"
                      }} onClick={() => setSelected(c)}>
                        <div style={{
                          width: 5, height: 5, borderRadius: "50%",
                          background: DOMAIN_COLORS[c.domain] || "#94a3b8",
                          flexShrink: 0
                        }} />
                        <span style={{ fontSize: 11, color: "#c0c0d8", fontFamily: "'Syne',sans-serif", fontWeight: 700 }}>
                          {c.label}
                        </span>
                        <span style={{ fontSize: 9, color: "#2a2a3a" }}>{c.domain}</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingLeft: 13 }}>
                        {c.related.map((r, i) => {
                          const target = REGISTRY.find(x => x.ref === r.ref);
                          return (
                            <div key={i} style={{
                              display: "flex", alignItems: "center", gap: 8,
                              fontSize: 10, padding: "2px 0",
                              borderBottom: "1px solid #0e0e18"
                            }}>
                              <RelationBadge type={r.type} />
                              <span
                                style={{ color: target ? "#6060a0" : "#3a3a58", cursor: target ? "pointer" : "default" }}
                                onClick={() => target && setSelected(target)}
                              >
                                {target?.label || r.ref}
                              </span>
                              <div style={{
                                marginLeft: "auto", width: 40, height: 2,
                                background: `linear-gradient(to right, ${REL_COLORS[r.type] || "#60a5fa"} ${r.strength * 100}%, #1a1a2a 0)`,
                                borderRadius: 1
                              }} />
                              <span style={{ fontSize: 9, color: "#2a2a3a" }}>{Math.round(r.strength * 100)}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )
                ))}
              </div>
            )}
          </div>

          {/* Detail panel */}
          {selected && (
            <div style={{
              width: 300, borderLeft: "1px solid #13131e",
              background: "rgba(4,4,10,0.6)",
              overflowY: "auto", padding: "14px",
              display: "flex", flexDirection: "column", gap: 10
            }}>
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                marginBottom: 4
              }}>
                <div style={{ fontSize: 9, letterSpacing: "0.2em", color: "#2a2a40" }}>CONCEPT DETAIL</div>
                <button onClick={() => setSelected(null)} style={{
                  background: "transparent", border: "none",
                  color: "#2a2a40", cursor: "pointer", fontSize: 14, fontFamily: "inherit"
                }}>✕</button>
              </div>

              <div style={{
                background: "#0c0c14", border: `1px solid ${(DOMAIN_COLORS[selected.domain] || "#60a5fa") + "33"}`,
                borderRadius: 6, padding: "12px"
              }}>
                <div style={{
                  fontSize: 9, letterSpacing: "0.12em",
                  color: DOMAIN_COLORS[selected.domain] || "#60a5fa",
                  marginBottom: 4
                }}>
                  {selected.id}
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#e0e0f0", fontFamily: "'Syne',sans-serif", marginBottom: 8 }}>
                  {selected.label}
                </div>
                <p style={{ fontSize: 11, color: "#4a4a68", lineHeight: 1.7, marginBottom: 10 }}>
                  {selected.definition}
                </p>
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{
                    fontSize: 9, padding: "1px 6px",
                    background: `${STABILITY_COLORS[selected.stability]}15`,
                    border: `1px solid ${STABILITY_COLORS[selected.stability]}30`,
                    borderRadius: 3, color: STABILITY_COLORS[selected.stability]
                  }}>
                    {selected.stability}
                  </span>
                  <span style={{ fontSize: 9, color: "#2a2a40" }}>v{selected.version}</span>
                  <span style={{ fontSize: 9, color: "#2a2a40" }}>{selected.defined_at}</span>
                </div>
              </div>

              {/* Aliases */}
              <div>
                <div style={{ fontSize: 9, letterSpacing: "0.15em", color: "#2a2a40", marginBottom: 6 }}>
                  RESOLVES FROM ALIASES
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {selected.aliases.map((a, i) => (
                    <span key={i} style={{
                      fontSize: 9, padding: "2px 7px",
                      background: "#0f0f1c", border: "1px solid #1a1a28",
                      borderRadius: 3, color: "#3a3a58",
                      cursor: "pointer"
                    }}
                      onClick={() => { setQuery(a); setTab("lookup"); handleResolve(a); }}
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </div>

              {/* Relations */}
              <div>
                <div style={{ fontSize: 9, letterSpacing: "0.15em", color: "#2a2a40", marginBottom: 6 }}>
                  SEMANTIC RELATIONS
                </div>
                {getRelated(selected).map((r, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 7,
                    padding: "5px 0", borderBottom: "1px solid #0e0e18",
                    fontSize: 10, cursor: r.concept ? "pointer" : "default"
                  }}
                    onClick={() => r.concept && setSelected(r.concept)}
                  >
                    <RelationBadge type={r.type} />
                    <span style={{ color: r.concept ? "#6060a0" : "#3a3a58" }}>
                      {r.concept?.label || r.ref}
                    </span>
                    <div style={{
                      marginLeft: "auto", width: 30, height: 2,
                      background: `linear-gradient(to right, ${REL_COLORS[r.type] || "#60a5fa"} ${r.strength * 100}%, #1a1a2a 0)`,
                      borderRadius: 1
                    }} />
                  </div>
                ))}
              </div>

              {/* Raw STP */}
              <div>
                <div style={{ fontSize: 9, letterSpacing: "0.15em", color: "#2a2a40", marginBottom: 6 }}>
                  STP REFERENCE BLOCK
                </div>
                <pre style={{
                  background: "#060609", border: "1px solid #13131e",
                  borderRadius: 4, padding: "10px", fontSize: 9,
                  color: "#3a3a58", whiteSpace: "pre-wrap", wordBreak: "break-all",
                  lineHeight: 1.7
                }}>
{`{ "id": "${selected.id}",\n  "ref": "${selected.ref}",\n  "weight": 0.90 }`}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:#1a1a28;border-radius:2px}
        input::placeholder{color:#1e1e30}
        button:hover{opacity:0.85}
      `}</style>
    </div>
  );
}

// helper for sidebar
const domCounts = (() => {
  const counts = {};
  REGISTRY.forEach(c => { counts[c.domain] = (counts[c.domain] || 0) + 1; });
  return counts;
})();
