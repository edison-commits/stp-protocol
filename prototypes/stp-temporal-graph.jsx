import { useState, useEffect, useRef, useCallback } from "react";

// ─── STP TEMPORAL GRAPH ──────────────────────────────────────────────────────
//
// The AI/ML knowledge graph, month by month, 2022–2026.
// Track how concepts gain and lose confidence as new papers publish.
// Watch relations appear, strengthen, weaken, and get overturned.
// See semantic drift across a domain — in real time.
//
// Nobody has built this before. This is the new thing.

// ─── TIMELINE DATA ───────────────────────────────────────────────────────────
// Each snapshot represents the state of the STP knowledge graph
// at that point in time — built from simulated paper publications.

const CONCEPTS = [
  { id: "transformer",          label: "Transformer",          domain: "architecture" },
  { id: "attention",            label: "Attention",            domain: "architecture" },
  { id: "large_language_model", label: "LLM",                  domain: "models" },
  { id: "emergent_behavior",    label: "Emergent Behavior",    domain: "phenomena" },
  { id: "scaling_laws",         label: "Scaling Laws",         domain: "theory" },
  { id: "fine_tuning",          label: "Fine-Tuning",          domain: "training" },
  { id: "rlhf",                 label: "RLHF",                 domain: "alignment" },
  { id: "agent",                label: "Agent",                domain: "applications" },
  { id: "reasoning",            label: "Reasoning",            domain: "capabilities" },
  { id: "hallucination",        label: "Hallucination",        domain: "failure_modes" },
  { id: "multimodal",           label: "Multimodal",           domain: "modalities" },
  { id: "rag",                  label: "RAG",                  domain: "retrieval" },
  { id: "tool_use",             label: "Tool Use",             domain: "applications" },
  { id: "quantization",         label: "Quantization",         domain: "efficiency" },
  { id: "moe",                  label: "MoE",                  domain: "architecture" },
];

const DOMAIN_COLORS = {
  architecture:  "#60a5fa",
  models:        "#a78bfa",
  phenomena:     "#f43f5e",
  theory:        "#34d399",
  training:      "#fb923c",
  alignment:     "#facc15",
  applications:  "#f472b6",
  capabilities:  "#818cf8",
  failure_modes: "#ef4444",
  modalities:    "#06b6d4",
  retrieval:     "#10b981",
  efficiency:    "#84cc16",
};

// Monthly snapshots: concept confidence + key relations
const TIMELINE = [
  {
    date: "2022-01",
    label: "Jan 2022",
    event: "Pre-ChatGPT era",
    event_type: "baseline",
    papers: 0,
    concepts: {
      transformer:          0.97,
      attention:            0.96,
      large_language_model: 0.71,
      emergent_behavior:    0.44,
      scaling_laws:         0.82,
      fine_tuning:          0.78,
      rlhf:                 0.51,
      agent:                0.38,
      reasoning:            0.52,
      hallucination:        0.61,
      multimodal:           0.42,
      rag:                  0.29,
      tool_use:             0.21,
      quantization:         0.55,
      moe:                  0.48,
    },
    relations: [
      { from: "transformer",          to: "attention",            type: "requires",   conf: 0.99 },
      { from: "large_language_model", to: "transformer",          type: "requires",   conf: 0.97 },
      { from: "large_language_model", to: "hallucination",        type: "causes",     conf: 0.71 },
      { from: "scaling_laws",         to: "large_language_model", type: "supports",   conf: 0.82 },
      { from: "fine_tuning",          to: "large_language_model", type: "supports",   conf: 0.78 },
      { from: "rlhf",                 to: "fine_tuning",          type: "is_type_of", conf: 0.81 },
    ],
    notable: null,
  },
  {
    date: "2022-06",
    label: "Jun 2022",
    event: "Emergent abilities paper (Wei et al.)",
    event_type: "paper",
    papers: 3,
    concepts: {
      transformer:          0.97,
      attention:            0.96,
      large_language_model: 0.75,
      emergent_behavior:    0.81,
      scaling_laws:         0.88,
      fine_tuning:          0.79,
      rlhf:                 0.53,
      agent:                0.41,
      reasoning:            0.64,
      hallucination:        0.63,
      multimodal:           0.44,
      rag:                  0.31,
      tool_use:             0.24,
      quantization:         0.56,
      moe:                  0.50,
    },
    relations: [
      { from: "transformer",          to: "attention",            type: "requires",   conf: 0.99 },
      { from: "large_language_model", to: "transformer",          type: "requires",   conf: 0.97 },
      { from: "large_language_model", to: "emergent_behavior",    type: "causes",     conf: 0.82 },
      { from: "large_language_model", to: "hallucination",        type: "causes",     conf: 0.72 },
      { from: "scaling_laws",         to: "emergent_behavior",    type: "causes",     conf: 0.84 },
      { from: "scaling_laws",         to: "large_language_model", type: "supports",   conf: 0.88 },
      { from: "fine_tuning",          to: "large_language_model", type: "supports",   conf: 0.79 },
      { from: "rlhf",                 to: "fine_tuning",          type: "is_type_of", conf: 0.81 },
    ],
    notable: { concept: "emergent_behavior", delta: +0.37, reason: "Wei et al. paper establishes emergent abilities as real phenomenon" },
  },
  {
    date: "2022-12",
    label: "Dec 2022",
    event: "ChatGPT launch",
    event_type: "product",
    papers: 5,
    concepts: {
      transformer:          0.97,
      attention:            0.96,
      large_language_model: 0.94,
      emergent_behavior:    0.83,
      scaling_laws:         0.89,
      fine_tuning:          0.85,
      rlhf:                 0.88,
      agent:                0.52,
      reasoning:            0.72,
      hallucination:        0.88,
      multimodal:           0.48,
      rag:                  0.44,
      tool_use:             0.38,
      quantization:         0.58,
      moe:                  0.51,
    },
    relations: [
      { from: "transformer",          to: "attention",            type: "requires",   conf: 0.99 },
      { from: "large_language_model", to: "transformer",          type: "requires",   conf: 0.97 },
      { from: "large_language_model", to: "emergent_behavior",    type: "causes",     conf: 0.83 },
      { from: "large_language_model", to: "hallucination",        type: "causes",     conf: 0.88 },
      { from: "rlhf",                 to: "large_language_model", type: "supports",   conf: 0.88 },
      { from: "rlhf",                 to: "fine_tuning",          type: "is_type_of", conf: 0.81 },
      { from: "scaling_laws",         to: "large_language_model", type: "supports",   conf: 0.89 },
      { from: "fine_tuning",          to: "large_language_model", type: "supports",   conf: 0.85 },
    ],
    notable: { concept: "rlhf", delta: +0.37, reason: "ChatGPT reveals RLHF as key to practical LLM deployment" },
  },
  {
    date: "2023-03",
    label: "Mar 2023",
    event: "GPT-4 & tool use papers",
    event_type: "paper",
    papers: 11,
    concepts: {
      transformer:          0.97,
      attention:            0.96,
      large_language_model: 0.97,
      emergent_behavior:    0.84,
      scaling_laws:         0.90,
      fine_tuning:          0.87,
      rlhf:                 0.90,
      agent:                0.71,
      reasoning:            0.81,
      hallucination:        0.91,
      multimodal:           0.74,
      rag:                  0.69,
      tool_use:             0.77,
      quantization:         0.61,
      moe:                  0.54,
    },
    relations: [
      { from: "transformer",          to: "attention",            type: "requires",   conf: 0.99 },
      { from: "large_language_model", to: "transformer",          type: "requires",   conf: 0.97 },
      { from: "large_language_model", to: "reasoning",            type: "supports",   conf: 0.79 },
      { from: "large_language_model", to: "hallucination",        type: "causes",     conf: 0.91 },
      { from: "large_language_model", to: "multimodal",           type: "supports",   conf: 0.74 },
      { from: "tool_use",             to: "agent",                type: "supports",   conf: 0.79 },
      { from: "rag",                  to: "hallucination",        type: "refutes",    conf: 0.71 },
      { from: "rlhf",                 to: "large_language_model", type: "supports",   conf: 0.90 },
      { from: "scaling_laws",         to: "large_language_model", type: "supports",   conf: 0.90 },
    ],
    notable: { concept: "tool_use", delta: +0.53, reason: "GPT-4 + Toolformer papers establish tool use as core agent capability" },
  },
  {
    date: "2023-07",
    label: "Jul 2023",
    event: "Emergent behavior challenged (Schaeffer et al.)",
    event_type: "paper",
    papers: 18,
    concepts: {
      transformer:          0.97,
      attention:            0.96,
      large_language_model: 0.97,
      emergent_behavior:    0.58,
      scaling_laws:         0.91,
      fine_tuning:          0.88,
      rlhf:                 0.91,
      agent:                0.79,
      reasoning:            0.84,
      hallucination:        0.92,
      multimodal:           0.78,
      rag:                  0.81,
      tool_use:             0.84,
      quantization:         0.68,
      moe:                  0.61,
    },
    relations: [
      { from: "transformer",          to: "attention",            type: "requires",   conf: 0.99 },
      { from: "large_language_model", to: "transformer",          type: "requires",   conf: 0.97 },
      { from: "large_language_model", to: "reasoning",            type: "supports",   conf: 0.82 },
      { from: "large_language_model", to: "hallucination",        type: "causes",     conf: 0.92 },
      { from: "scaling_laws",         to: "emergent_behavior",    type: "relates_to", conf: 0.61 },
      { from: "tool_use",             to: "agent",                type: "supports",   conf: 0.84 },
      { from: "rag",                  to: "hallucination",        type: "refutes",    conf: 0.79 },
      { from: "rag",                  to: "large_language_model", type: "supports",   conf: 0.81 },
      { from: "moe",                  to: "large_language_model", type: "supports",   conf: 0.66 },
    ],
    notable: { concept: "emergent_behavior", delta: -0.26, reason: "Schaeffer et al.: emergence may be artifact of metric choice, not real phase transition" },
  },
  {
    date: "2023-12",
    label: "Dec 2023",
    event: "Gemini, Mixtral MoE, agents proliferate",
    event_type: "paper",
    papers: 34,
    concepts: {
      transformer:          0.97,
      attention:            0.96,
      large_language_model: 0.98,
      emergent_behavior:    0.55,
      scaling_laws:         0.92,
      fine_tuning:          0.89,
      rlhf:                 0.91,
      agent:                0.88,
      reasoning:            0.88,
      hallucination:        0.93,
      multimodal:           0.88,
      rag:                  0.87,
      tool_use:             0.90,
      quantization:         0.78,
      moe:                  0.84,
    },
    relations: [
      { from: "transformer",          to: "attention",            type: "requires",   conf: 0.99 },
      { from: "large_language_model", to: "transformer",          type: "requires",   conf: 0.97 },
      { from: "large_language_model", to: "reasoning",            type: "supports",   conf: 0.86 },
      { from: "large_language_model", to: "hallucination",        type: "causes",     conf: 0.93 },
      { from: "large_language_model", to: "multimodal",           type: "supports",   conf: 0.88 },
      { from: "moe",                  to: "large_language_model", type: "supports",   conf: 0.84 },
      { from: "moe",                  to: "quantization",         type: "requires",   conf: 0.71 },
      { from: "tool_use",             to: "agent",                type: "requires",   conf: 0.90 },
      { from: "rag",                  to: "hallucination",        type: "refutes",    conf: 0.82 },
      { from: "agent",                to: "reasoning",            type: "requires",   conf: 0.88 },
    ],
    notable: { concept: "moe", delta: +0.33, reason: "Mixtral proves MoE scales efficiently — suddenly core architecture pattern" },
  },
  {
    date: "2024-04",
    label: "Apr 2024",
    event: "Reasoning models emerge (o1 precursors)",
    event_type: "paper",
    papers: 52,
    concepts: {
      transformer:          0.97,
      attention:            0.96,
      large_language_model: 0.98,
      emergent_behavior:    0.51,
      scaling_laws:         0.93,
      fine_tuning:          0.88,
      rlhf:                 0.90,
      agent:                0.91,
      reasoning:            0.94,
      hallucination:        0.91,
      multimodal:           0.90,
      rag:                  0.88,
      tool_use:             0.92,
      quantization:         0.82,
      moe:                  0.87,
    },
    relations: [
      { from: "transformer",          to: "attention",            type: "requires",   conf: 0.99 },
      { from: "large_language_model", to: "transformer",          type: "requires",   conf: 0.97 },
      { from: "large_language_model", to: "reasoning",            type: "supports",   conf: 0.91 },
      { from: "large_language_model", to: "hallucination",        type: "causes",     conf: 0.91 },
      { from: "reasoning",            to: "hallucination",        type: "refutes",    conf: 0.74 },
      { from: "reasoning",            to: "agent",                type: "supports",   conf: 0.92 },
      { from: "tool_use",             to: "agent",                type: "requires",   conf: 0.92 },
      { from: "rag",                  to: "hallucination",        type: "refutes",    conf: 0.83 },
      { from: "moe",                  to: "large_language_model", type: "supports",   conf: 0.87 },
    ],
    notable: { concept: "reasoning", delta: +0.10, reason: "Chain-of-thought scaling papers push reasoning confidence above 0.9" },
  },
  {
    date: "2024-10",
    label: "Oct 2024",
    event: "o1 launch, agentic frameworks mature",
    event_type: "product",
    papers: 78,
    concepts: {
      transformer:          0.97,
      attention:            0.95,
      large_language_model: 0.98,
      emergent_behavior:    0.48,
      scaling_laws:         0.91,
      fine_tuning:          0.87,
      rlhf:                 0.88,
      agent:                0.95,
      reasoning:            0.97,
      hallucination:        0.90,
      multimodal:           0.92,
      rag:                  0.89,
      tool_use:             0.94,
      quantization:         0.86,
      moe:                  0.89,
    },
    relations: [
      { from: "transformer",          to: "attention",            type: "requires",   conf: 0.99 },
      { from: "large_language_model", to: "transformer",          type: "requires",   conf: 0.97 },
      { from: "large_language_model", to: "reasoning",            type: "supports",   conf: 0.94 },
      { from: "reasoning",            to: "agent",                type: "supports",   conf: 0.95 },
      { from: "reasoning",            to: "hallucination",        type: "refutes",    conf: 0.81 },
      { from: "tool_use",             to: "agent",                type: "requires",   conf: 0.94 },
      { from: "agent",                to: "tool_use",             type: "requires",   conf: 0.93 },
      { from: "rag",                  to: "hallucination",        type: "refutes",    conf: 0.86 },
      { from: "moe",                  to: "large_language_model", type: "supports",   conf: 0.89 },
      { from: "quantization",         to: "large_language_model", type: "supports",   conf: 0.86 },
    ],
    notable: { concept: "agent", delta: +0.07, reason: "o1 + AutoGen + LangGraph push agent confidence to 0.95" },
  },
  {
    date: "2025-03",
    label: "Mar 2025",
    event: "Post-o1: reasoning wars, MoE everywhere",
    event_type: "paper",
    papers: 112,
    concepts: {
      transformer:          0.96,
      attention:            0.95,
      large_language_model: 0.98,
      emergent_behavior:    0.44,
      scaling_laws:         0.89,
      fine_tuning:          0.86,
      rlhf:                 0.85,
      agent:                0.96,
      reasoning:            0.98,
      hallucination:        0.89,
      multimodal:           0.94,
      rag:                  0.88,
      tool_use:             0.95,
      quantization:         0.89,
      moe:                  0.92,
    },
    relations: [
      { from: "transformer",          to: "attention",            type: "requires",   conf: 0.99 },
      { from: "large_language_model", to: "transformer",          type: "requires",   conf: 0.96 },
      { from: "large_language_model", to: "reasoning",            type: "supports",   conf: 0.96 },
      { from: "reasoning",            to: "agent",                type: "supports",   conf: 0.97 },
      { from: "reasoning",            to: "hallucination",        type: "refutes",    conf: 0.84 },
      { from: "tool_use",             to: "agent",                type: "requires",   conf: 0.95 },
      { from: "moe",                  to: "large_language_model", type: "supports",   conf: 0.92 },
      { from: "multimodal",           to: "large_language_model", type: "requires",   conf: 0.88 },
      { from: "quantization",         to: "moe",                  type: "supports",   conf: 0.81 },
    ],
    notable: { concept: "emergent_behavior", delta: -0.04, reason: "Emergent behavior continues slow decline — consensus shifting toward 'artifacts of eval'" },
  },
  {
    date: "2026-03",
    label: "Mar 2026",
    event: "Now — STP era begins",
    event_type: "now",
    papers: 189,
    concepts: {
      transformer:          0.95,
      attention:            0.94,
      large_language_model: 0.98,
      emergent_behavior:    0.41,
      scaling_laws:         0.87,
      fine_tuning:          0.84,
      rlhf:                 0.82,
      agent:                0.97,
      reasoning:            0.99,
      hallucination:        0.87,
      multimodal:           0.95,
      rag:                  0.87,
      tool_use:             0.96,
      quantization:         0.91,
      moe:                  0.93,
    },
    relations: [
      { from: "transformer",          to: "attention",            type: "requires",   conf: 0.99 },
      { from: "large_language_model", to: "transformer",          type: "requires",   conf: 0.95 },
      { from: "large_language_model", to: "reasoning",            type: "supports",   conf: 0.97 },
      { from: "reasoning",            to: "agent",                type: "supports",   conf: 0.98 },
      { from: "reasoning",            to: "hallucination",        type: "refutes",    conf: 0.87 },
      { from: "tool_use",             to: "agent",                type: "requires",   conf: 0.96 },
      { from: "moe",                  to: "large_language_model", type: "supports",   conf: 0.93 },
      { from: "multimodal",           to: "large_language_model", type: "requires",   conf: 0.91 },
      { from: "quantization",         to: "moe",                  type: "supports",   conf: 0.84 },
      { from: "agent",                to: "tool_use",             type: "requires",   conf: 0.96 },
    ],
    notable: { concept: "reasoning", delta: +0.01, reason: "Reasoning reaches 0.99 — now the most confident concept in the graph" },
  },
];

const REL_COLORS = {
  requires:   "#60a5fa",
  supports:   "#34d399",
  is_type_of: "#a78bfa",
  causes:     "#fb923c",
  refutes:    "#f43f5e",
  relates_to: "#5a5a78",
  contradicts:"#f43f5e",
};

const EVENT_COLORS = {
  baseline: "#5a5a78",
  paper:    "#60a5fa",
  product:  "#34d399",
  now:      "#facc15",
};

// ─── COLORS ──────────────────────────────────────────────────────────────────
const C = {
  bg:      "#06060d",
  surface: "#09091a",
  card:    "#0d0d20",
  border:  "#141428",
  text:    "#4848a0",
  bright:  "#d0d0f8",
  muted:   "#222242",
  dim:     "#181830",
};

// ─── GRAPH LAYOUT ────────────────────────────────────────────────────────────
// Fixed positions for visual stability across snapshots
const NODE_POSITIONS = {
  transformer:          { x: 0.50, y: 0.12 },
  attention:            { x: 0.72, y: 0.22 },
  large_language_model: { x: 0.50, y: 0.35 },
  scaling_laws:         { x: 0.18, y: 0.22 },
  emergent_behavior:    { x: 0.20, y: 0.46 },
  fine_tuning:          { x: 0.14, y: 0.60 },
  rlhf:                 { x: 0.04, y: 0.72 },
  moe:                  { x: 0.34, y: 0.58 },
  quantization:         { x: 0.22, y: 0.78 },
  multimodal:           { x: 0.72, y: 0.48 },
  hallucination:        { x: 0.84, y: 0.62 },
  rag:                  { x: 0.68, y: 0.70 },
  reasoning:            { x: 0.50, y: 0.60 },
  agent:                { x: 0.50, y: 0.82 },
  tool_use:             { x: 0.78, y: 0.84 },
};

function ConceptNode({ concept, conf, prevConf, isSelected, isHighlighted, onClick, x, y, W, H }) {
  const pos    = NODE_POSITIONS[concept.id] || { x: 0.5, y: 0.5 };
  const cx     = pos.x * W;
  const cy     = pos.y * H;
  const r      = 10 + conf * 14;
  const color  = DOMAIN_COLORS[concept.domain] || "#5a5a78";
  const delta  = prevConf !== undefined ? conf - prevConf : 0;
  const ring   = isSelected ? 2.5 : isHighlighted ? 1.5 : 0.8;

  return (
    <g onClick={() => onClick(concept.id)} style={{ cursor: "pointer" }}>
      {/* Pulse ring for significant change */}
      {Math.abs(delta) > 0.05 && (
        <circle cx={cx} cy={cy} r={r + 8} fill="none"
          stroke={delta > 0 ? "#34d399" : "#f43f5e"}
          strokeWidth={1} opacity={0.4}
          style={{ animation: "nodePulse 1.5s ease-out infinite" }}
        />
      )}
      {/* Glow */}
      {(isSelected || isHighlighted) && (
        <circle cx={cx} cy={cy} r={r + 5} fill={color} opacity={0.08} />
      )}
      {/* Body */}
      <circle cx={cx} cy={cy} r={r}
        fill={color + "22"}
        stroke={color}
        strokeWidth={ring}
        opacity={isHighlighted || isSelected ? 1 : 0.7}
        style={{ transition: "r 0.5s ease, opacity 0.3s" }}
      />
      {/* Conf text */}
      <text x={cx} y={cy + 3} textAnchor="middle"
        fontSize={7} fill={color} opacity={0.9}
        fontFamily="'DM Mono', monospace" fontWeight={700}>
        {(conf * 100).toFixed(0)}
      </text>
      {/* Label */}
      <text x={cx} y={cy + r + 11} textAnchor="middle"
        fontSize={7.5} fill={isSelected || isHighlighted ? C.bright : C.text}
        fontFamily="'DM Mono', monospace"
        style={{ transition: "fill 0.3s" }}>
        {concept.label}
      </text>
      {/* Delta badge */}
      {Math.abs(delta) > 0.03 && (
        <text x={cx + r + 3} y={cy - r + 3} textAnchor="start"
          fontSize={7} fill={delta > 0 ? "#34d399" : "#f43f5e"}
          fontFamily="'DM Mono', monospace" fontWeight={700}>
          {delta > 0 ? "+" : ""}{(delta * 100).toFixed(0)}
        </text>
      )}
    </g>
  );
}

function RelationEdge({ rel, snapshot, W, H, active }) {
  const fromPos = NODE_POSITIONS[rel.from];
  const toPos   = NODE_POSITIONS[rel.to];
  if (!fromPos || !toPos) return null;

  const fromConf = snapshot.concepts[rel.from] || 0.5;
  const toConf   = snapshot.concepts[rel.to]   || 0.5;
  const fromR    = 10 + fromConf * 14;
  const toR      = 10 + toConf   * 14;

  const x1 = fromPos.x * W, y1 = fromPos.y * H;
  const x2 = toPos.x   * W, y2 = toPos.y   * H;

  // Shorten to node edge
  const dx   = x2 - x1, dy = y2 - y1;
  const dist = Math.sqrt(dx*dx + dy*dy);
  const ux   = dx / dist, uy = dy / dist;
  const sx   = x1 + ux * fromR, sy = y1 + uy * fromR;
  const ex   = x2 - ux * toR,   ey = y2 - uy * toR;

  const color = REL_COLORS[rel.type] || "#5a5a78";
  const opacity = active ? rel.conf * 0.9 : rel.conf * 0.25;
  const width   = active ? 1 + rel.conf * 1.5 : 0.8;

  return (
    <g opacity={opacity} style={{ transition: "opacity 0.4s" }}>
      <line x1={sx} y1={sy} x2={ex} y2={ey}
        stroke={color} strokeWidth={width} />
      {/* Midpoint type label */}
      {active && (
        <text x={(sx+ex)/2} y={(sy+ey)/2 - 4} textAnchor="middle"
          fontSize={6} fill={color} opacity={0.8}
          fontFamily="'DM Mono', monospace">
          {rel.type.slice(0,7)}
        </text>
      )}
    </g>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function TemporalGraph() {
  const [snapIdx, setSnapIdx]     = useState(0);
  const [playing, setPlaying]     = useState(false);
  const [speed, setSpeed]         = useState(1500);
  const [selectedConcept, setSelectedConcept] = useState(null);
  const [hoveredConcept, setHoveredConcept]   = useState(null);
  const [showRelations, setShowRelations]     = useState(true);
  const [filterDomain, setFilterDomain]       = useState(null);
  const timerRef = useRef(null);
  const svgRef   = useRef(null);
  const SVG_W = 560, SVG_H = 480;

  const snapshot = TIMELINE[snapIdx];
  const prevSnap = snapIdx > 0 ? TIMELINE[snapIdx - 1] : null;

  useEffect(() => {
    if (playing) {
      timerRef.current = setInterval(() => {
        setSnapIdx(i => {
          if (i >= TIMELINE.length - 1) { setPlaying(false); return i; }
          return i + 1;
        });
      }, speed);
    }
    return () => clearInterval(timerRef.current);
  }, [playing, speed]);

  const togglePlay = () => {
    if (snapIdx >= TIMELINE.length - 1) setSnapIdx(0);
    setPlaying(p => !p);
  };

  // Concept detail
  const conceptDetail = selectedConcept
    ? CONCEPTS.find(c => c.id === selectedConcept)
    : null;

  const conceptHistory = selectedConcept
    ? TIMELINE.map(snap => ({
        date:  snap.label,
        conf:  snap.concepts[selectedConcept],
        event: snap.event,
      }))
    : [];

  // Biggest movers this snapshot
  const movers = CONCEPTS
    .filter(c => prevSnap)
    .map(c => ({
      ...c,
      curr:  snapshot.concepts[c.id] || 0,
      prev:  prevSnap?.concepts[c.id] || 0,
      delta: (snapshot.concepts[c.id] || 0) - (prevSnap?.concepts[c.id] || 0),
    }))
    .filter(c => Math.abs(c.delta) > 0.01)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 6);

  // Active relations for selected concept
  const activeRelations = showRelations
    ? snapshot.relations.filter(r =>
        !filterDomain ||
        CONCEPTS.find(c => c.id === r.from)?.domain === filterDomain ||
        CONCEPTS.find(c => c.id === r.to)?.domain === filterDomain
      )
    : [];

  const highlightedRelations = selectedConcept
    ? snapshot.relations.filter(r => r.from === selectedConcept || r.to === selectedConcept)
    : activeRelations;

  return (
    <div style={{
      fontFamily: "'DM Mono', monospace",
      background: C.bg, minHeight: "100vh", color: C.text,
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Mono:ital,wght@0,300;0,400;1,300&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{
        borderBottom: `1px solid ${C.border}`,
        padding: "11px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "rgba(3,3,10,0.98)",
        position: "sticky", top: 0, zIndex: 10,
        backdropFilter: "blur(12px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{
            fontSize: 14, fontWeight: 800, letterSpacing: "0.22em",
            color: "#e0e0ff", fontFamily: "'Syne', sans-serif",
          }}>STP</span>
          <span style={{ fontSize: 10, color: C.muted, letterSpacing: "0.15em" }}>
            TEMPORAL GRAPH · AI/ML 2022–2026
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => setShowRelations(r => !r)}
            style={{
              background: showRelations ? "rgba(96,165,250,0.1)" : "transparent",
              border: `1px solid ${showRelations ? "#60a5fa40" : C.border}`,
              color: showRelations ? "#60a5fa" : C.muted,
              padding: "4px 10px", borderRadius: 4, cursor: "pointer",
              fontSize: 9, fontFamily: "inherit", letterSpacing: "0.08em",
            }}>
            {showRelations ? "HIDE EDGES" : "SHOW EDGES"}
          </button>
          <span style={{ fontSize: 9, color: C.muted }}>SPEED</span>
          {[[2000,"0.5×"],[1500,"1×"],[800,"2×"],[300,"4×"]].map(([ms, label]) => (
            <button key={ms} onClick={() => setSpeed(ms)} style={{
              background: speed === ms ? "rgba(96,165,250,0.15)" : "transparent",
              border: `1px solid ${speed === ms ? "#60a5fa40" : C.border}`,
              color: speed === ms ? "#60a5fa" : C.muted,
              padding: "3px 8px", borderRadius: 3, cursor: "pointer",
              fontSize: 9, fontFamily: "inherit",
            }}>{label}</button>
          ))}
          <button onClick={togglePlay} style={{
            background: playing ? "rgba(244,63,94,0.1)" : "rgba(52,211,153,0.12)",
            border: `1px solid ${playing ? "#f43f5e40" : "#34d39940"}`,
            color: playing ? "#f43f5e" : "#34d399",
            padding: "5px 14px", borderRadius: 4, cursor: "pointer",
            fontSize: 10, letterSpacing: "0.12em", fontFamily: "inherit",
          }}>
            {playing ? "◼ PAUSE" : snapIdx >= TIMELINE.length-1 ? "↺ REPLAY" : "▶ PLAY"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", height: "calc(100vh - 49px)", overflow: "hidden" }}>

        {/* ── LEFT: timeline scrubber + movers ── */}
        <div style={{
          width: 200, borderRight: `1px solid ${C.border}`,
          display: "flex", flexDirection: "column",
          background: "rgba(2,2,8,0.8)",
          overflowY: "auto",
        }}>
          {/* Timeline */}
          <div style={{ padding: "12px 10px", flex: "0 0 auto" }}>
            <div style={{ fontSize: 8, letterSpacing: "0.2em", color: C.muted, marginBottom: 10 }}>
              TIMELINE
            </div>
            {TIMELINE.map((snap, i) => {
              const isActive = i === snapIdx;
              const ec = EVENT_COLORS[snap.event_type] || C.muted;
              return (
                <div
                  key={snap.date}
                  onClick={() => { setSnapIdx(i); setPlaying(false); }}
                  style={{
                    display: "flex", gap: 8, alignItems: "flex-start",
                    padding: "7px 8px", cursor: "pointer",
                    background: isActive ? C.card : "transparent",
                    border: `1px solid ${isActive ? ec + "30" : "transparent"}`,
                    borderRadius: 5, marginBottom: 2,
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: ec, flexShrink: 0, marginTop: 3,
                    boxShadow: isActive ? `0 0 6px ${ec}` : "none",
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 9, color: isActive ? C.bright : C.text }}>
                      {snap.label}
                    </div>
                    <div style={{
                      fontSize: 7.5, color: isActive ? ec : C.muted,
                      lineHeight: 1.4, marginTop: 1,
                    }}>
                      {snap.event}
                    </div>
                    {snap.papers > 0 && (
                      <div style={{ fontSize: 7, color: C.muted, marginTop: 1 }}>
                        {snap.papers} papers
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Movers */}
          {movers.length > 0 && (
            <div style={{
              padding: "10px 10px",
              borderTop: `1px solid ${C.border}`,
            }}>
              <div style={{ fontSize: 8, letterSpacing: "0.2em", color: C.muted, marginBottom: 8 }}>
                MOVERS THIS PERIOD
              </div>
              {movers.map((m, i) => {
                const color = DOMAIN_COLORS[m.domain] || C.muted;
                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedConcept(m.id === selectedConcept ? null : m.id)}
                    style={{
                      display: "flex", gap: 8, alignItems: "center",
                      padding: "5px 8px", borderRadius: 4, cursor: "pointer",
                      background: selectedConcept === m.id ? C.card : "transparent",
                      marginBottom: 2, transition: "background 0.15s",
                    }}
                  >
                    <span style={{ fontSize: 9, color, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {m.label}
                    </span>
                    <span style={{
                      fontSize: 9, fontWeight: 700,
                      color: m.delta > 0 ? "#34d399" : "#f43f5e",
                      fontFamily: "'DM Mono', monospace",
                    }}>
                      {m.delta > 0 ? "+" : ""}{(m.delta * 100).toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Domain filter */}
          <div style={{ padding: "10px 10px", borderTop: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 8, letterSpacing: "0.2em", color: C.muted, marginBottom: 8 }}>
              DOMAIN FILTER
            </div>
            <div
              onClick={() => setFilterDomain(null)}
              style={{
                fontSize: 9, padding: "3px 8px", cursor: "pointer",
                color: !filterDomain ? C.bright : C.muted,
                background: !filterDomain ? C.card : "transparent",
                borderRadius: 3, marginBottom: 3,
              }}>ALL</div>
            {Object.entries(DOMAIN_COLORS).map(([domain, color]) => {
              const hasConcepts = CONCEPTS.some(c => c.domain === domain);
              if (!hasConcepts) return null;
              return (
                <div
                  key={domain}
                  onClick={() => setFilterDomain(d => d === domain ? null : domain)}
                  style={{
                    display: "flex", gap: 6, alignItems: "center",
                    fontSize: 9, padding: "3px 8px", cursor: "pointer",
                    color: filterDomain === domain ? color : C.muted,
                    background: filterDomain === domain ? C.card : "transparent",
                    borderRadius: 3, marginBottom: 2,
                  }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
                  {domain.replace(/_/g," ")}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── CENTER: graph ── */}
        <div style={{
          flex: 1,
          background: `radial-gradient(ellipse at 50% 40%, #0a0a1e 0%, ${C.bg} 100%)`,
          position: "relative", overflow: "hidden",
          display: "flex", flexDirection: "column",
        }}>
          {/* Event banner */}
          <div style={{
            padding: "8px 16px",
            borderBottom: `1px solid ${C.border}`,
            display: "flex", alignItems: "center", gap: 12,
            background: "rgba(3,3,10,0.7)",
          }}>
            <div style={{
              width: 7, height: 7, borderRadius: "50%",
              background: EVENT_COLORS[snapshot.event_type],
              boxShadow: `0 0 8px ${EVENT_COLORS[snapshot.event_type]}`,
            }} />
            <span style={{
              fontSize: 12, fontWeight: 800, color: C.bright,
              fontFamily: "'Syne', sans-serif",
            }}>{snapshot.label}</span>
            <span style={{ fontSize: 10, color: C.text }}>{snapshot.event}</span>
            {snapshot.papers > 0 && (
              <span style={{ fontSize: 8, color: C.muted, marginLeft: "auto" }}>
                {snapshot.papers} cumulative papers indexed
              </span>
            )}
          </div>

          {/* Notable change */}
          {snapshot.notable && (
            <div style={{
              padding: "6px 16px",
              borderBottom: `1px solid ${C.border}`,
              display: "flex", gap: 10, alignItems: "center",
              background: snapshot.notable.delta > 0
                ? "rgba(52,211,153,0.05)"
                : "rgba(244,63,94,0.05)",
              fontSize: 9, color: C.text,
            }}>
              <span style={{
                fontWeight: 700,
                color: snapshot.notable.delta > 0 ? "#34d399" : "#f43f5e",
                fontFamily: "'DM Mono', monospace",
              }}>
                {snapshot.notable.concept.replace(/_/g," ")}
                {snapshot.notable.delta > 0 ? " ↑" : " ↓"}
                {(Math.abs(snapshot.notable.delta)*100).toFixed(0)}%
              </span>
              <span>{snapshot.notable.reason}</span>
            </div>
          )}

          {/* SVG graph */}
          <svg
            ref={svgRef}
            width="100%" height="100%"
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            style={{ display: "block", flex: 1 }}
          >
            {/* Edges first */}
            {highlightedRelations.map((rel, i) => (
              <RelationEdge
                key={`${rel.from}-${rel.type}-${rel.to}`}
                rel={rel}
                snapshot={snapshot}
                W={SVG_W} H={SVG_H}
                active={!selectedConcept || rel.from === selectedConcept || rel.to === selectedConcept}
              />
            ))}

            {/* Nodes */}
            {CONCEPTS
              .filter(c => !filterDomain || c.domain === filterDomain)
              .map(concept => (
                <ConceptNode
                  key={concept.id}
                  concept={concept}
                  conf={snapshot.concepts[concept.id] || 0}
                  prevConf={prevSnap?.concepts[concept.id]}
                  isSelected={selectedConcept === concept.id}
                  isHighlighted={
                    !selectedConcept ||
                    selectedConcept === concept.id ||
                    snapshot.relations.some(r =>
                      (r.from === selectedConcept && r.to === concept.id) ||
                      (r.to === selectedConcept && r.from === concept.id)
                    )
                  }
                  onClick={(id) => setSelectedConcept(s => s === id ? null : id)}
                  W={SVG_W} H={SVG_H}
                />
              ))}
          </svg>

          {/* Edge legend */}
          <div style={{
            position: "absolute", bottom: 12, left: 12,
            display: "flex", flexDirection: "column", gap: 3,
            background: "rgba(3,3,10,0.8)", padding: "8px 10px",
            borderRadius: 5, border: `1px solid ${C.border}`,
          }}>
            {Object.entries(REL_COLORS).map(([type, color]) => (
              <div key={type} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 14, height: 1.5, background: color, opacity: 0.8 }} />
                <span style={{ fontSize: 7, color }}>{type}</span>
              </div>
            ))}
          </div>

          {/* Node size legend */}
          <div style={{
            position: "absolute", bottom: 12, right: 12,
            background: "rgba(3,3,10,0.8)", padding: "8px 10px",
            borderRadius: 5, border: `1px solid ${C.border}`,
            fontSize: 7, color: C.muted, lineHeight: 1.8,
          }}>
            Node size = confidence<br />
            Number = confidence %<br />
            <span style={{ color: "#34d399" }}>+N</span> = delta from prev snapshot<br />
            Pulse ring = significant shift
          </div>
        </div>

        {/* ── RIGHT: concept detail ── */}
        <div style={{
          width: 220, borderLeft: `1px solid ${C.border}`,
          overflowY: "auto", padding: "14px",
          background: "rgba(2,2,8,0.7)",
        }}>
          <div style={{ fontSize: 8, letterSpacing: "0.2em", color: C.muted, marginBottom: 12 }}>
            {selectedConcept ? "CONCEPT HISTORY" : "SNAPSHOT STATS"}
          </div>

          {!selectedConcept && (
            <div>
              {/* Top concepts by confidence */}
              <div style={{ fontSize: 8, color: C.muted, letterSpacing: "0.1em", marginBottom: 8 }}>
                CONFIDENCE RANKING
              </div>
              {CONCEPTS
                .map(c => ({ ...c, conf: snapshot.concepts[c.id] || 0 }))
                .sort((a,b) => b.conf - a.conf)
                .map((c, i) => {
                  const color = DOMAIN_COLORS[c.domain] || C.muted;
                  const prev  = prevSnap?.concepts[c.id];
                  const delta = prev !== undefined ? c.conf - prev : 0;
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedConcept(c.id)}
                      style={{
                        display: "flex", gap: 8, alignItems: "center",
                        padding: "5px 8px", borderRadius: 4,
                        cursor: "pointer", marginBottom: 2,
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = C.card}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <span style={{ fontSize: 8, color: C.muted, minWidth: 12 }}>{i+1}</span>
                      <span style={{ fontSize: 9, color, flex: 1 }}>{c.label}</span>
                      <span style={{ fontSize: 9, color: C.bright, fontFamily: "'DM Mono', monospace" }}>
                        {(c.conf*100).toFixed(0)}%
                      </span>
                      {Math.abs(delta) > 0.01 && (
                        <span style={{ fontSize: 8, color: delta > 0 ? "#34d399" : "#f43f5e", fontFamily: "'DM Mono', monospace", minWidth: 24, textAlign: "right" }}>
                          {delta > 0 ? "+" : ""}{(delta*100).toFixed(0)}
                        </span>
                      )}
                    </div>
                  );
                })}

              <div style={{ marginTop: 14, fontSize: 8, color: C.muted, lineHeight: 1.7 }}>
                Click any node or concept to see its full confidence history.
              </div>
            </div>
          )}

          {selectedConcept && conceptDetail && (
            <div>
              <div style={{
                background: C.card, border: `1px solid ${C.border}`,
                borderRadius: 6, padding: "10px 12px", marginBottom: 12,
                borderLeft: `3px solid ${DOMAIN_COLORS[conceptDetail.domain] || C.muted}`,
              }}>
                <div style={{
                  fontSize: 13, fontWeight: 800, color: C.bright,
                  fontFamily: "'Syne', sans-serif", marginBottom: 4,
                }}>{conceptDetail.label}</div>
                <div style={{ fontSize: 8, color: C.muted }}>{conceptDetail.domain}</div>
                <div style={{
                  fontSize: 22, fontWeight: 800, color: DOMAIN_COLORS[conceptDetail.domain],
                  fontFamily: "'Syne', sans-serif", marginTop: 6,
                }}>
                  {(snapshot.concepts[selectedConcept]*100).toFixed(0)}%
                  <span style={{ fontSize: 10, color: C.muted, marginLeft: 6 }}>confidence</span>
                </div>
              </div>

              {/* Sparkline */}
              <div style={{ fontSize: 8, color: C.muted, marginBottom: 6 }}>CONFIDENCE OVER TIME</div>
              <div style={{
                background: C.card, border: `1px solid ${C.border}`,
                borderRadius: 5, padding: "10px 8px", marginBottom: 12,
                height: 80, position: "relative",
              }}>
                <svg width="100%" height="60" viewBox="0 0 180 60" preserveAspectRatio="none">
                  {/* Grid */}
                  {[0.25,0.5,0.75,1.0].map(v => (
                    <line key={v} x1={0} y1={60-(v*60)} x2={180} y2={60-(v*60)}
                      stroke={C.border} strokeWidth={0.5} />
                  ))}
                  {/* Line */}
                  <polyline
                    points={conceptHistory.map((h, i) =>
                      `${i * (180/(conceptHistory.length-1))},${60 - h.conf * 54}`
                    ).join(" ")}
                    fill="none"
                    stroke={DOMAIN_COLORS[conceptDetail.domain] || "#60a5fa"}
                    strokeWidth={1.5}
                  />
                  {/* Current point */}
                  <circle
                    cx={snapIdx * (180/(conceptHistory.length-1))}
                    cy={60 - (conceptHistory[snapIdx]?.conf || 0) * 54}
                    r={3}
                    fill={DOMAIN_COLORS[conceptDetail.domain] || "#60a5fa"}
                  />
                </svg>
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  fontSize: 7, color: C.muted, marginTop: 2,
                }}>
                  <span>2022</span><span>2024</span><span>2026</span>
                </div>
              </div>

              {/* Per-period table */}
              <div style={{ fontSize: 8, color: C.muted, marginBottom: 6 }}>PER PERIOD</div>
              {conceptHistory.map((h, i) => {
                const prev  = i > 0 ? conceptHistory[i-1].conf : h.conf;
                const delta = h.conf - prev;
                const isNow = i === snapIdx;
                return (
                  <div
                    key={h.date}
                    onClick={() => { setSnapIdx(i); setPlaying(false); }}
                    style={{
                      display: "flex", gap: 6, alignItems: "center",
                      padding: "3px 6px", borderRadius: 3,
                      background: isNow ? C.card : "transparent",
                      cursor: "pointer", marginBottom: 1,
                    }}
                  >
                    <span style={{ fontSize: 7, color: C.muted, minWidth: 44 }}>{h.date}</span>
                    <div style={{
                      flex: 1, height: 3, background: C.muted + "30", borderRadius: 2,
                    }}>
                      <div style={{
                        width: `${h.conf*100}%`, height: "100%",
                        background: DOMAIN_COLORS[conceptDetail.domain],
                        borderRadius: 2, transition: "width 0.3s",
                      }} />
                    </div>
                    <span style={{
                      fontSize: 8, color: C.bright, minWidth: 26,
                      fontFamily: "'DM Mono', monospace", textAlign: "right",
                    }}>{(h.conf*100).toFixed(0)}%</span>
                    {Math.abs(delta) > 0.01 && i > 0 && (
                      <span style={{
                        fontSize: 7, minWidth: 20, textAlign: "right",
                        color: delta > 0 ? "#34d399" : "#f43f5e",
                        fontFamily: "'DM Mono', monospace",
                      }}>{delta > 0 ? "+" : ""}{(delta*100).toFixed(0)}</span>
                    )}
                  </div>
                );
              })}

              {/* Current relations */}
              <div style={{ marginTop: 12, fontSize: 8, color: C.muted, marginBottom: 6 }}>
                CURRENT RELATIONS
              </div>
              {snapshot.relations
                .filter(r => r.from === selectedConcept || r.to === selectedConcept)
                .map((r, i) => {
                  const other = r.from === selectedConcept ? r.to : r.from;
                  const dir   = r.from === selectedConcept ? "→" : "←";
                  const color = REL_COLORS[r.type] || C.muted;
                  return (
                    <div key={i} style={{
                      padding: "5px 8px", marginBottom: 3,
                      background: C.card, border: `1px solid ${C.border}`,
                      borderRadius: 4, fontSize: 8,
                      borderLeft: `2px solid ${color}`,
                    }}>
                      <span style={{ color }}>{dir} </span>
                      <span style={{ color: C.bright }}>{other.replace(/_/g," ")}</span>
                      <span style={{
                        float: "right", color,
                        fontFamily: "'DM Mono', monospace",
                      }}>
                        [{r.type.slice(0,5)}] {(r.conf*100).toFixed(0)}%
                      </span>
                    </div>
                  );
                })}

              <button
                onClick={() => setSelectedConcept(null)}
                style={{
                  marginTop: 12, width: "100%",
                  background: "transparent", border: `1px solid ${C.border}`,
                  color: C.muted, padding: "6px", borderRadius: 4,
                  cursor: "pointer", fontSize: 9, fontFamily: "inherit",
                }}
              >← BACK TO RANKING</button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes nodePulse {
          0%   { r: 25; opacity: 0.6; }
          100% { r: 35; opacity: 0; }
        }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #14142a; border-radius: 2px; }
        button:hover { opacity: 0.82; }
      `}</style>
    </div>
  );
}
