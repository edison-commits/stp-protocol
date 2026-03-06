import { useState, useEffect, useRef, useCallback } from "react";

// ─── CONFIDENCE PROPAGATION ENGINE ───────────────────────────────────────────
//
// Core principle: confidence is not a property of a claim alone.
// It is a property of a claim + its entire citation chain.
//
// Rules:
// 1. DECAY     — each hop in a citation chain multiplies confidence by a decay factor
// 2. CORROBORATION — multiple independent sources citing the same claim raises confidence
// 3. DOMAIN PENALTY — cross-domain citations incur an additional decay (physics citing finance = suspicious)
// 4. AGE DECAY — older sources decay confidence slightly over time
// 5. CYCLE DETECTION — circular citations are detected and penalized

const DECAY_FACTOR = 0.88;          // per citation hop
const CORROBORATION_BOOST = 0.06;   // per independent corroborating source
const CROSS_DOMAIN_PENALTY = 0.12;  // applied when source domain ≠ claim domain
const AGE_DECAY_PER_YEAR = 0.015;   // per year since publication
const CYCLE_PENALTY = 0.40;         // if a circular citation chain is detected
const MAX_CORROBORATION_BOOST = 0.20;

function yearsSince(dateStr) {
  const then = new Date(dateStr);
  const now = new Date("2026-03-05");
  return Math.max(0, (now - then) / (1000 * 60 * 60 * 24 * 365));
}

function computeConfidence(node, allNodes, visited = new Set()) {
  // Cycle detection
  if (visited.has(node.id)) {
    return node.base_confidence * (1 - CYCLE_PENALTY);
  }
  visited.add(node.id);

  let conf = node.base_confidence;

  // Age decay
  const age = yearsSince(node.published);
  conf *= (1 - AGE_DECAY_PER_YEAR * age);

  // No citations — return base confidence adjusted for age
  if (!node.cites || node.cites.length === 0) {
    return Math.max(0.01, Math.min(1.0, conf));
  }

  // Propagate through citation chain
  let citationContribution = 0;
  let independentSources = 0;
  const seenDomains = new Set();

  for (const cite of node.cites) {
    const sourceNode = allNodes.find(n => n.id === cite.source_id);
    if (!sourceNode) continue;

    // Recurse — get source's own propagated confidence
    const sourceConf = computeConfidence(sourceNode, allNodes, new Set(visited));

    // Decay per hop
    let hopConf = sourceConf * DECAY_FACTOR;

    // Cross-domain penalty
    if (sourceNode.domain !== node.domain) {
      hopConf *= (1 - CROSS_DOMAIN_PENALTY);
    }

    // Weight by citation strength
    hopConf *= cite.strength;

    citationContribution += hopConf;

    // Count independent corroborating sources
    if (!seenDomains.has(sourceNode.domain)) {
      seenDomains.add(sourceNode.domain);
      independentSources++;
    }
  }

  // Average citation contribution
  if (node.cites.length > 0) {
    citationContribution /= node.cites.length;
  }

  // Blend base confidence with citation-propagated confidence
  conf = conf * 0.4 + citationContribution * 0.6;

  // Corroboration boost from independent sources
  const boost = Math.min(
    MAX_CORROBORATION_BOOST,
    (independentSources - 1) * CORROBORATION_BOOST
  );
  conf = Math.min(1.0, conf + boost);

  return Math.max(0.01, conf);
}

function traceChain(nodeId, allNodes, depth = 0, visited = new Set()) {
  if (visited.has(nodeId) || depth > 6) return null;
  visited.add(nodeId);
  const node = allNodes.find(n => n.id === nodeId);
  if (!node) return null;

  const children = (node.cites || []).map(c => ({
    cite: c,
    child: traceChain(c.source_id, allNodes, depth + 1, new Set(visited))
  })).filter(x => x.child !== null);

  return {
    ...node,
    propagated: computeConfidence(node, allNodes),
    depth,
    isCycle: visited.has(nodeId),
    children
  };
}

// ─── SAMPLE NETWORK ──────────────────────────────────────────────────────────

const INITIAL_NODES = [
  {
    id: "n001",
    label: "Transformer Architecture Survey",
    domain: "ai.ml",
    claim: "Transformer models require attention mechanisms to function.",
    base_confidence: 0.95,
    published: "2024-03-01",
    source_type: "primary_research",
    cites: [],
  },
  {
    id: "n002",
    label: "Attention Is All You Need (2017)",
    domain: "ai.ml",
    claim: "Self-attention replaces recurrence for sequence modeling.",
    base_confidence: 0.98,
    published: "2017-06-12",
    source_type: "primary_research",
    cites: [],
  },
  {
    id: "n003",
    label: "LLM Capabilities Overview",
    domain: "ai.ml",
    claim: "Large language models emerge from scaling transformer architectures.",
    base_confidence: 0.91,
    published: "2024-08-15",
    source_type: "review_paper",
    cites: [
      { source_id: "n001", strength: 0.92 },
      { source_id: "n002", strength: 0.88 },
    ],
  },
  {
    id: "n004",
    label: "AI Agent Design Patterns",
    domain: "ai.agents",
    claim: "Agents built on LLMs inherit transformer confidence characteristics.",
    base_confidence: 0.84,
    published: "2025-01-20",
    source_type: "technical_blog",
    cites: [
      { source_id: "n003", strength: 0.85 },
    ],
  },
  {
    id: "n005",
    label: "Quantum-AI Convergence Forecast",
    domain: "physics.quantum",
    claim: "Quantum processors will accelerate transformer inference by 2030.",
    base_confidence: 0.62,
    published: "2025-06-10",
    source_type: "speculative_analysis",
    cites: [
      { source_id: "n003", strength: 0.70 },
      { source_id: "n004", strength: 0.55 },
    ],
  },
  {
    id: "n006",
    label: "STP Protocol White Paper",
    domain: "systems.network",
    claim: "Semantic protocols require canonical concept registries for agent interoperability.",
    base_confidence: 0.88,
    published: "2026-01-01",
    source_type: "primary_research",
    cites: [
      { source_id: "n004", strength: 0.80 },
    ],
  },
  {
    id: "n007",
    label: "Web Agent Efficiency Study",
    domain: "ai.agents",
    claim: "Agents using structured semantic layers reduce parsing time by 10x.",
    base_confidence: 0.79,
    published: "2025-11-05",
    source_type: "empirical_study",
    cites: [
      { source_id: "n004", strength: 0.88 },
      { source_id: "n006", strength: 0.75 },
    ],
  },
  {
    id: "n008",
    label: "Finance AI Application Note",
    domain: "finance.ai",
    claim: "LLM-based trading agents outperform rule-based systems.",
    base_confidence: 0.71,
    published: "2025-09-20",
    source_type: "industry_report",
    cites: [
      { source_id: "n003", strength: 0.65 },
    ],
  },
];

// ─── COLORS ───────────────────────────────────────────────────────────────────
const DOMAIN_COLORS = {
  "ai.ml":           "#60a5fa",
  "ai.agents":       "#a78bfa",
  "ai.search":       "#34d399",
  "data.graph":      "#fb923c",
  "systems.network": "#f472b6",
  "physics.quantum": "#facc15",
  "finance.ai":      "#4ade80",
};

const SOURCE_TYPE_COLORS = {
  primary_research:   "#34d399",
  review_paper:       "#60a5fa",
  empirical_study:    "#a78bfa",
  technical_blog:     "#fb923c",
  industry_report:    "#facc15",
  speculative_analysis: "#f43f5e",
};

function confidenceColor(conf) {
  if (conf >= 0.85) return "#34d399";
  if (conf >= 0.70) return "#60a5fa";
  if (conf >= 0.55) return "#facc15";
  if (conf >= 0.40) return "#fb923c";
  return "#f43f5e";
}

function confidenceLabel(conf) {
  if (conf >= 0.85) return "HIGH";
  if (conf >= 0.70) return "MODERATE";
  if (conf >= 0.55) return "LOW";
  if (conf >= 0.40) return "WEAK";
  return "UNRELIABLE";
}

// ─── COMPONENTS ───────────────────────────────────────────────────────────────

function ConfBar({ value, max = 1, width = 80 }) {
  const pct = (value / max) * 100;
  const col = confidenceColor(value);
  return (
    <div style={{
      width, height: 4, background: "#1a1a2a", borderRadius: 2, overflow: "hidden"
    }}>
      <div style={{
        width: `${pct}%`, height: "100%",
        background: col,
        boxShadow: `0 0 4px ${col}`,
        borderRadius: 2,
        transition: "width 0.6s ease"
      }} />
    </div>
  );
}

function NodeCard({ node, propagated, selected, onClick, allNodes }) {
  const dc = DOMAIN_COLORS[node.domain] || "#94a3b8";
  const decay = propagated - node.base_confidence;
  const age = yearsSince(node.published);

  return (
    <div
      onClick={onClick}
      style={{
        background: selected ? "rgba(12,12,22,0.9)" : "#0a0a14",
        border: `1px solid ${selected ? dc + "55" : "#18182a"}`,
        borderRadius: 6, padding: "12px 14px",
        cursor: "pointer", transition: "all 0.2s",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
        <div style={{
          width: 7, height: 7, borderRadius: "50%", marginTop: 4,
          background: dc, boxShadow: `0 0 5px ${dc}`, flexShrink: 0
        }} />
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 12, fontWeight: 700, color: "#d0d0e8",
            fontFamily: "'Syne',sans-serif", marginBottom: 3, lineHeight: 1.3
          }}>
            {node.label}
          </div>
          <div style={{ fontSize: 9, color: "#2a2a40", marginBottom: 6 }}>
            {node.domain} · {node.published} · {node.source_type.replace(/_/g, " ")}
          </div>
          <p style={{ fontSize: 10, color: "#4a4a68", lineHeight: 1.6, marginBottom: 8, fontStyle: "italic" }}>
            "{node.claim}"
          </p>

          {/* Confidence comparison */}
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 8, color: "#2a2a40", letterSpacing: "0.12em", marginBottom: 3 }}>
                BASE
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <ConfBar value={node.base_confidence} width={60} />
                <span style={{ fontSize: 10, color: "#4a4a68" }}>
                  {Math.round(node.base_confidence * 100)}%
                </span>
              </div>
            </div>
            <div style={{ color: "#1a1a2a", fontSize: 12 }}>→</div>
            <div>
              <div style={{ fontSize: 8, color: "#2a2a40", letterSpacing: "0.12em", marginBottom: 3 }}>
                PROPAGATED
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <ConfBar value={propagated} width={60} />
                <span style={{ fontSize: 10, color: confidenceColor(propagated), fontWeight: 700 }}>
                  {Math.round(propagated * 100)}%
                </span>
              </div>
            </div>
            <div style={{ marginLeft: "auto" }}>
              <span style={{
                fontSize: 9, padding: "2px 7px",
                background: `${confidenceColor(propagated)}12`,
                border: `1px solid ${confidenceColor(propagated)}30`,
                borderRadius: 3, color: confidenceColor(propagated),
                letterSpacing: "0.1em"
              }}>
                {confidenceLabel(propagated)}
              </span>
            </div>
          </div>

          {/* Decay breakdown */}
          {decay !== 0 && (
            <div style={{
              marginTop: 8, fontSize: 9, color: "#2a2a40",
              display: "flex", gap: 10
            }}>
              <span>Δ <span style={{ color: decay < 0 ? "#f43f5e" : "#34d399" }}>
                {decay >= 0 ? "+" : ""}{Math.round(decay * 100)}%
              </span></span>
              <span>age decay: <span style={{ color: "#3a3a58" }}>
                -{Math.round(age * AGE_DECAY_PER_YEAR * 100)}%
              </span></span>
              {node.cites?.length > 0 && (
                <span>citations: <span style={{ color: "#3a3a58" }}>{node.cites.length}</span></span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ChainTree({ chain, depth = 0 }) {
  if (!chain) return null;
  const dc = DOMAIN_COLORS[chain.domain] || "#94a3b8";
  const conf = chain.propagated;

  return (
    <div style={{ paddingLeft: depth * 20 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "6px 0", borderBottom: "1px solid #0e0e18",
        fontSize: 10
      }}>
        {depth > 0 && (
          <div style={{ color: "#2a2a40", marginRight: 2, fontSize: 9 }}>└─</div>
        )}
        <div style={{
          width: 5, height: 5, borderRadius: "50%",
          background: dc, flexShrink: 0
        }} />
        <span style={{ color: "#8888b0", flex: 1 }}>{chain.label}</span>
        <span style={{ color: "#2a2a40", fontSize: 9 }}>{chain.domain}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <ConfBar value={conf} width={40} />
          <span style={{ color: confidenceColor(conf), fontSize: 10, fontWeight: 700, minWidth: 28 }}>
            {Math.round(conf * 100)}%
          </span>
        </div>
      </div>
      {chain.children?.map((c, i) => (
        <div key={i}>
          {c.cite && (
            <div style={{
              paddingLeft: (depth + 1) * 20,
              fontSize: 9, color: "#2a2a40",
              padding: "2px 0 2px " + ((depth + 1) * 20) + "px",
              display: "flex", gap: 8
            }}>
              <span>cite strength: <span style={{ color: "#3a3a58" }}>{Math.round(c.cite.strength * 100)}%</span></span>
              <span>×decay {Math.round(DECAY_FACTOR * 100)}%</span>
              {chain.domain !== c.child?.domain && (
                <span style={{ color: "#fb923c" }}>⚠ cross-domain −{Math.round(CROSS_DOMAIN_PENALTY * 100)}%</span>
              )}
            </div>
          )}
          <ChainTree chain={c.child} depth={depth + 1} />
        </div>
      ))}
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function ConfidencePropagation() {
  const [nodes, setNodes] = useState(INITIAL_NODES);
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState("network"); // network | chain | simulator
  const [simDecay, setSimDecay] = useState(DECAY_FACTOR);
  const [simAge, setSimAge] = useState(AGE_DECAY_PER_YEAR);
  const [simCross, setSimCross] = useState(CROSS_DOMAIN_PENALTY);

  // Compute all propagated confidences
  const propagated = nodes.map(n => ({
    ...n,
    propagated: computeConfidence(n, nodes)
  }));

  const selectedProp = selected
    ? propagated.find(n => n.id === selected.id)
    : null;

  const chain = selected
    ? traceChain(selected.id, nodes)
    : null;

  const sorted = [...propagated].sort((a, b) => b.propagated - a.propagated);

  return (
    <div style={{
      fontFamily: "'DM Mono', monospace",
      background: "#06060e",
      minHeight: "100vh",
      color: "#b0b0c8",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Mono:wght@300;400&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{
        borderBottom: "1px solid #12121e",
        padding: "13px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "rgba(4,4,10,0.92)",
        position: "sticky", top: 0, zIndex: 10,
        backdropFilter: "blur(10px)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{
            fontSize: 13, fontWeight: 800, letterSpacing: "0.2em",
            color: "#d0d0f0", fontFamily: "'Syne',sans-serif"
          }}>STP</span>
          <span style={{ fontSize: 10, color: "#2a2a3e", letterSpacing: "0.15em" }}>
            CONFIDENCE PROPAGATION / v1.0
          </span>
        </div>
        <div style={{ display: "flex", gap: 2 }}>
          {["network", "chain", "simulator"].map(t => (
            <button key={t} onClick={() => setActiveTab(t)} style={{
              background: activeTab === t ? "rgba(96,165,250,0.1)" : "transparent",
              border: `1px solid ${activeTab === t ? "rgba(96,165,250,0.3)" : "#12121e"}`,
              color: activeTab === t ? "#60a5fa" : "#2a2a40",
              padding: "4px 12px", borderRadius: 4, cursor: "pointer",
              fontSize: 10, letterSpacing: "0.1em", fontFamily: "inherit"
            }}>{t.toUpperCase()}</button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", height: "calc(100vh - 49px)", overflow: "hidden" }}>

        {/* Left — node list */}
        <div style={{
          width: 280, borderRight: "1px solid #12121e",
          overflowY: "auto", padding: "14px",
          background: "rgba(4,4,8,0.6)",
          display: "flex", flexDirection: "column", gap: 2
        }}>
          <div style={{
            fontSize: 9, letterSpacing: "0.2em", color: "#1e1e30",
            marginBottom: 8, padding: "0 2px"
          }}>
            SOURCE NODES · {nodes.length} · RANKED BY PROPAGATED CONFIDENCE
          </div>

          {sorted.map(n => (
            <div
              key={n.id}
              onClick={() => setSelected(selected?.id === n.id ? null : n)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "7px 10px", borderRadius: 4, cursor: "pointer",
                background: selected?.id === n.id ? "rgba(12,12,24,0.8)" : "transparent",
                border: `1px solid ${selected?.id === n.id ? "#20203a" : "transparent"}`,
                transition: "all 0.15s"
              }}
            >
              <div style={{
                width: 5, height: 5, borderRadius: "50%",
                background: DOMAIN_COLORS[n.domain] || "#94a3b8",
                flexShrink: 0
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 10, color: "#9090b0",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
                }}>
                  {n.label}
                </div>
                <div style={{ fontSize: 9, color: "#2a2a40" }}>{n.domain}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
                <span style={{ fontSize: 10, color: confidenceColor(n.propagated), fontWeight: 700 }}>
                  {Math.round(n.propagated * 100)}%
                </span>
                <ConfBar value={n.propagated} width={40} />
              </div>
            </div>
          ))}
        </div>

        {/* Main panel */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>

          {/* ── NETWORK TAB ── */}
          {activeTab === "network" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{
                display: "grid", gridTemplateColumns: "repeat(4,1fr)",
                gap: 8, marginBottom: 8
              }}>
                {[
                  { label: "AVG PROPAGATED", val: Math.round(propagated.reduce((a,n)=>a+n.propagated,0)/propagated.length*100) + "%", color: "#60a5fa" },
                  { label: "HIGHEST", val: Math.round(Math.max(...propagated.map(n=>n.propagated))*100) + "%", color: "#34d399" },
                  { label: "LOWEST", val: Math.round(Math.min(...propagated.map(n=>n.propagated))*100) + "%", color: "#f43f5e" },
                  { label: "DECAY FACTOR", val: Math.round(DECAY_FACTOR*100) + "%/hop", color: "#fb923c" },
                ].map((s,i) => (
                  <div key={i} style={{
                    background: "#0a0a14", border: "1px solid #14142a",
                    borderRadius: 5, padding: "10px 12px"
                  }}>
                    <div style={{ fontSize: 8, color: "#2a2a40", letterSpacing: "0.15em", marginBottom: 5 }}>{s.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: s.color, fontFamily: "'Syne',sans-serif" }}>{s.val}</div>
                  </div>
                ))}
              </div>

              {propagated.map(n => (
                <NodeCard
                  key={n.id}
                  node={n}
                  propagated={n.propagated}
                  selected={selected?.id === n.id}
                  onClick={() => setSelected(selected?.id === n.id ? null : n)}
                  allNodes={nodes}
                />
              ))}
            </div>
          )}

          {/* ── CHAIN TAB ── */}
          {activeTab === "chain" && (
            <div>
              {!selected ? (
                <div style={{
                  padding: "60px 20px", textAlign: "center",
                  color: "#1e1e30", fontSize: 12, letterSpacing: "0.1em"
                }}>
                  SELECT A NODE FROM THE LEFT TO TRACE ITS CITATION CHAIN
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{
                    background: "#0a0a14", border: "1px solid #14142a",
                    borderRadius: 6, padding: "14px 16px"
                  }}>
                    <div style={{ fontSize: 9, color: "#2a2a40", letterSpacing: "0.15em", marginBottom: 8 }}>
                      CITATION CHAIN · {selectedProp?.label}
                    </div>

                    <div style={{
                      display: "grid", gridTemplateColumns: "repeat(3,1fr)",
                      gap: 10, marginBottom: 14
                    }}>
                      {[
                        { label: "BASE CONFIDENCE", val: Math.round(selected.base_confidence * 100) + "%", color: "#6060a0" },
                        { label: "PROPAGATED", val: Math.round((selectedProp?.propagated || 0) * 100) + "%", color: confidenceColor(selectedProp?.propagated || 0) },
                        { label: "NET CHANGE", val: (((selectedProp?.propagated || 0) - selected.base_confidence) * 100).toFixed(1) + "%", color: (selectedProp?.propagated || 0) >= selected.base_confidence ? "#34d399" : "#f43f5e" },
                      ].map((s, i) => (
                        <div key={i} style={{
                          background: "#06060c", border: "1px solid #10101e",
                          borderRadius: 4, padding: "8px 10px"
                        }}>
                          <div style={{ fontSize: 8, color: "#2a2a40", letterSpacing: "0.12em", marginBottom: 4 }}>{s.label}</div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: s.color, fontFamily: "'Syne',sans-serif" }}>{s.val}</div>
                        </div>
                      ))}
                    </div>

                    {/* Decay factor breakdown */}
                    <div style={{
                      background: "#06060c", border: "1px solid #10101e",
                      borderRadius: 4, padding: "10px 12px", marginBottom: 12
                    }}>
                      <div style={{ fontSize: 9, color: "#2a2a40", letterSpacing: "0.12em", marginBottom: 8 }}>
                        DECAY FACTORS APPLIED
                      </div>
                      {[
                        { label: "Age decay", desc: `${yearsSince(selected.published).toFixed(1)} years × ${AGE_DECAY_PER_YEAR * 100}%/yr`, val: -(yearsSince(selected.published) * AGE_DECAY_PER_YEAR * 100).toFixed(1) + "%" },
                        { label: "Citation hop decay", desc: `${DECAY_FACTOR * 100}% per hop`, val: selected.cites?.length > 0 ? `-${((1 - DECAY_FACTOR) * 100).toFixed(0)}%/hop` : "N/A (primary source)" },
                        { label: "Cross-domain penalty", desc: "Applied when source domain differs", val: selected.cites?.some(c => nodes.find(n => n.id === c.source_id)?.domain !== selected.domain) ? `-${(CROSS_DOMAIN_PENALTY * 100).toFixed(0)}%` : "None" },
                        { label: "Corroboration boost", desc: "Per independent domain citing same claim", val: selected.cites?.length > 1 ? `+${Math.min(MAX_CORROBORATION_BOOST, (new Set(selected.cites?.map(c => nodes.find(n => n.id === c.source_id)?.domain)).size - 1) * CORROBORATION_BOOST * 100).toFixed(0)}%` : "N/A" },
                      ].map((f, i) => (
                        <div key={i} style={{
                          display: "flex", justifyContent: "space-between",
                          padding: "4px 0", borderBottom: "1px solid #0e0e18",
                          fontSize: 10
                        }}>
                          <span style={{ color: "#5a5a78" }}>{f.label}</span>
                          <span style={{ color: "#3a3a58", fontSize: 9, margin: "0 8px", flex: 1, textAlign: "center" }}>{f.desc}</span>
                          <span style={{ color: f.val.startsWith("-") ? "#f43f5e" : f.val.startsWith("+") ? "#34d399" : "#3a3a58" }}>
                            {f.val}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Chain tree */}
                    <div style={{ fontSize: 9, color: "#2a2a40", letterSpacing: "0.12em", marginBottom: 8 }}>
                      FULL CITATION TREE
                    </div>
                    <div style={{
                      background: "#06060c", border: "1px solid #10101e",
                      borderRadius: 4, padding: "10px"
                    }}>
                      {chain && <ChainTree chain={chain} depth={0} />}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── SIMULATOR TAB ── */}
          {activeTab === "simulator" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{
                background: "#0a0a14", border: "1px solid #14142a",
                borderRadius: 6, padding: "16px"
              }}>
                <div style={{ fontSize: 9, color: "#2a2a40", letterSpacing: "0.15em", marginBottom: 14 }}>
                  PARAMETER SIMULATOR · ADJUST DECAY RULES · SEE LIVE IMPACT
                </div>

                {[
                  { label: "DECAY PER HOP", key: "decay", val: simDecay, set: setSimDecay, min: 0.5, max: 1.0, step: 0.01, desc: "How much confidence decays at each citation hop. Lower = more skeptical of second-hand claims." },
                  { label: "AGE DECAY / YEAR", key: "age", val: simAge, set: setSimAge, min: 0, max: 0.05, step: 0.005, desc: "How much older sources decay. Prevents stale references from maintaining high confidence." },
                  { label: "CROSS-DOMAIN PENALTY", key: "cross", val: simCross, set: setSimCross, min: 0, max: 0.4, step: 0.01, desc: "Extra decay when a source's domain differs from the claim's domain." },
                ].map(param => {
                  const pct = ((param.val - param.min) / (param.max - param.min)) * 100;
                  return (
                    <div key={param.key} style={{ marginBottom: 20 }}>
                      <div style={{
                        display: "flex", justifyContent: "space-between",
                        marginBottom: 8
                      }}>
                        <span style={{ fontSize: 10, color: "#6060a0", letterSpacing: "0.1em" }}>{param.label}</span>
                        <span style={{ fontSize: 12, fontWeight: 800, color: "#60a5fa", fontFamily: "'Syne',sans-serif" }}>
                          {(param.val * 100).toFixed(1)}%
                        </span>
                      </div>
                      <input
                        type="range" min={param.min} max={param.max} step={param.step}
                        value={param.val}
                        onChange={e => param.set(parseFloat(e.target.value))}
                        style={{ width: "100%", accentColor: "#60a5fa", cursor: "pointer" }}
                      />
                      <div style={{ fontSize: 9, color: "#2a2a40", marginTop: 4 }}>{param.desc}</div>
                    </div>
                  );
                })}
              </div>

              {/* Live results with sim params */}
              <div style={{ fontSize: 9, color: "#2a2a40", letterSpacing: "0.15em", marginBottom: 4 }}>
                SIMULATED CONFIDENCE · ALL NODES
              </div>
              {nodes.map(n => {
                // Recompute with sim params
                const simConf = (() => {
                  let conf = n.base_confidence;
                  const age = yearsSince(n.published);
                  conf *= (1 - simAge * age);
                  if (!n.cites || n.cites.length === 0) return Math.max(0.01, Math.min(1, conf));
                  let citConf = 0;
                  let indep = 0;
                  const seenD = new Set();
                  for (const c of n.cites) {
                    const src = nodes.find(x => x.id === c.source_id);
                    if (!src) continue;
                    let hc = src.base_confidence * simDecay;
                    if (src.domain !== n.domain) hc *= (1 - simCross);
                    hc *= c.strength;
                    citConf += hc;
                    if (!seenD.has(src.domain)) { seenD.add(src.domain); indep++; }
                  }
                  citConf /= n.cites.length;
                  conf = conf * 0.4 + citConf * 0.6;
                  conf = Math.min(1.0, conf + Math.min(MAX_CORROBORATION_BOOST, (indep - 1) * CORROBORATION_BOOST));
                  return Math.max(0.01, conf);
                })();

                const original = propagated.find(p => p.id === n.id)?.propagated || n.base_confidence;
                const diff = simConf - original;

                return (
                  <div key={n.id} style={{
                    background: "#0a0a14", border: "1px solid #14142a",
                    borderRadius: 5, padding: "10px 14px",
                    display: "flex", alignItems: "center", gap: 12
                  }}>
                    <div style={{
                      width: 5, height: 5, borderRadius: "50%",
                      background: DOMAIN_COLORS[n.domain] || "#94a3b8", flexShrink: 0
                    }} />
                    <span style={{ fontSize: 10, color: "#7070a0", flex: 1 }}>{n.label}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 9, color: "#2a2a40" }}>
                        {Math.round(original * 100)}%
                      </span>
                      <span style={{ color: "#1a1a30", fontSize: 10 }}>→</span>
                      <ConfBar value={simConf} width={60} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: confidenceColor(simConf), minWidth: 32 }}>
                        {Math.round(simConf * 100)}%
                      </span>
                      <span style={{
                        fontSize: 9, minWidth: 36, textAlign: "right",
                        color: diff > 0.005 ? "#34d399" : diff < -0.005 ? "#f43f5e" : "#2a2a40"
                      }}>
                        {diff >= 0 ? "+" : ""}{(diff * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right — detail panel */}
        {selected && activeTab === "network" && (
          <div style={{
            width: 260, borderLeft: "1px solid #12121e",
            background: "rgba(4,4,10,0.7)",
            overflowY: "auto", padding: "14px",
            display: "flex", flexDirection: "column", gap: 10
          }}>
            <div style={{
              display: "flex", justifyContent: "space-between",
              fontSize: 9, letterSpacing: "0.15em", color: "#2a2a40"
            }}>
              <span>NODE DETAIL</span>
              <button onClick={() => setSelected(null)} style={{
                background: "transparent", border: "none",
                color: "#2a2a40", cursor: "pointer", fontFamily: "inherit"
              }}>✕</button>
            </div>

            <div style={{
              background: "#0a0a14", border: "1px solid #16162a",
              borderRadius: 5, padding: "10px"
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#d0d0e8", fontFamily: "'Syne',sans-serif", marginBottom: 6 }}>
                {selected.label}
              </div>
              <div style={{ fontSize: 9, color: "#2a2a40", marginBottom: 8 }}>
                {selected.id} · {selected.source_type.replace(/_/g," ")}
              </div>
              <div style={{
                display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8
              }}>
                <span style={{
                  fontSize: 9, padding: "1px 6px",
                  background: `${DOMAIN_COLORS[selected.domain] || "#94a3b8"}15`,
                  border: `1px solid ${DOMAIN_COLORS[selected.domain] || "#94a3b8"}30`,
                  borderRadius: 3, color: DOMAIN_COLORS[selected.domain] || "#94a3b8"
                }}>{selected.domain}</span>
                <span style={{
                  fontSize: 9, padding: "1px 6px",
                  background: `${SOURCE_TYPE_COLORS[selected.source_type] || "#94a3b8"}15`,
                  border: `1px solid ${SOURCE_TYPE_COLORS[selected.source_type] || "#94a3b8"}30`,
                  borderRadius: 3, color: SOURCE_TYPE_COLORS[selected.source_type] || "#94a3b8"
                }}>{selected.source_type.replace(/_/g," ")}</span>
              </div>
              <p style={{ fontSize: 10, color: "#4a4a60", lineHeight: 1.6, fontStyle: "italic" }}>
                "{selected.claim}"
              </p>
            </div>

            {selected.cites?.length > 0 && (
              <div>
                <div style={{ fontSize: 9, letterSpacing: "0.15em", color: "#2a2a40", marginBottom: 6 }}>
                  CITES
                </div>
                {selected.cites.map((c, i) => {
                  const src = nodes.find(n => n.id === c.source_id);
                  const srcProp = propagated.find(n => n.id === c.source_id);
                  return src ? (
                    <div key={i} style={{
                      padding: "6px 8px", borderBottom: "1px solid #0e0e18",
                      fontSize: 10, cursor: "pointer"
                    }}
                      onClick={() => setSelected(src)}
                    >
                      <div style={{ color: "#6060a0", marginBottom: 3 }}>{src.label}</div>
                      <div style={{ display: "flex", gap: 8, fontSize: 9, color: "#2a2a40" }}>
                        <span>strength: {Math.round(c.strength * 100)}%</span>
                        <span>conf: <span style={{ color: confidenceColor(srcProp?.propagated || 0) }}>
                          {Math.round((srcProp?.propagated || 0) * 100)}%
                        </span></span>
                        {src.domain !== selected.domain && (
                          <span style={{ color: "#fb923c" }}>⚠ cross-domain</span>
                        )}
                      </div>
                    </div>
                  ) : null;
                })}
              </div>
            )}

            <div>
              <div style={{ fontSize: 9, letterSpacing: "0.15em", color: "#2a2a40", marginBottom: 6 }}>
                CITED BY
              </div>
              {nodes.filter(n => n.cites?.some(c => c.source_id === selected.id)).map(n => {
                const np = propagated.find(p => p.id === n.id);
                return (
                  <div key={n.id} style={{
                    padding: "6px 8px", borderBottom: "1px solid #0e0e18",
                    fontSize: 10, cursor: "pointer"
                  }}
                    onClick={() => setSelected(n)}
                  >
                    <div style={{ color: "#6060a0", marginBottom: 2 }}>{n.label}</div>
                    <span style={{ fontSize: 9, color: confidenceColor(np?.propagated || 0) }}>
                      {Math.round((np?.propagated || 0) * 100)}% propagated
                    </span>
                  </div>
                );
              })}
              {!nodes.some(n => n.cites?.some(c => c.source_id === selected.id)) && (
                <div style={{ fontSize: 9, color: "#1e1e30" }}>NOT CITED BY ANY NODE</div>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:#18182a;border-radius:2px}
        input[type=range]{height:3px;border-radius:2px}
        button:hover{opacity:0.8}
      `}</style>
    </div>
  );
}
