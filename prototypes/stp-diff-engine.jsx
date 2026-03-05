import { useState, useRef, useEffect } from "react";

// ─── STP DIFF ENGINE ─────────────────────────────────────────────────────────
//
// When a page updates its STP block, what changed?
// Which relations were added, removed, confidence-revised?
// Which concepts appeared, disappeared, or shifted weight?
//
// Agents revisiting pages need to know what's new without reprocessing
// everything. This is git for semantic graphs.

const SYSTEM_PROMPT = `You are an STP (Semantic Transfer Protocol) diff engine. Given two STP blocks (VERSION A = old, VERSION B = new), you compute a precise semantic diff.

Output ONLY valid JSON — no markdown, no explanation.

OUTPUT FORMAT:
{
  "diff_summary": {
    "total_changes": <n>,
    "severity": "<BREAKING|SIGNIFICANT|MINOR|COSMETIC>",
    "one_line": "<concise description of what changed in 12 words or less>"
  },
  "concepts": {
    "added":   [ { "ref": "...", "id": "...", "weight": 0.0, "significance": "<why this matters>" } ],
    "removed": [ { "ref": "...", "id": "...", "weight": 0.0, "significance": "<why this matters>" } ],
    "modified": [
      {
        "ref": "...",
        "weight_before": 0.0, "weight_after": 0.0,
        "id_changed": false,
        "significance": "<why this matters>"
      }
    ]
  },
  "relations": {
    "added": [
      { "from": "...", "type": "...", "to": "...", "confidence": 0.0, "significance": "<why this matters>" }
    ],
    "removed": [
      { "from": "...", "type": "...", "to": "...", "confidence": 0.0, "significance": "<why this matters>" }
    ],
    "modified": [
      {
        "from": "...", "type": "...", "to": "...",
        "confidence_before": 0.0, "confidence_after": 0.0,
        "type_changed": false, "type_before": null, "type_after": null,
        "conditions_changed": false,
        "significance": "<why this matters>"
      }
    ]
  },
  "claims": {
    "added":   [ { "concept": "...", "assertion": "...", "confidence": 0.0 } ],
    "removed": [ { "concept": "...", "assertion": "...", "confidence": 0.0 } ],
    "revised": [ { "concept": "...", "assertion_before": "...", "assertion_after": "...", "confidence_before": 0.0, "confidence_after": 0.0 } ]
  },
  "agent_action": {
    "must_invalidate_cache": <boolean>,
    "affected_downstream_concepts": ["<concept_refs that agents relying on this page should re-evaluate>"],
    "recommended_action": "<REPROCESS_FULL|UPDATE_DELTA|IGNORE|FLAG_FOR_REVIEW>",
    "reason": "<why>"
  }
}

SEVERITY LEVELS:
- BREAKING: core concepts removed, fundamental relations changed type, confidence dropped >0.2
- SIGNIFICANT: new important relations, confidence shifts >0.1, new concepts added
- MINOR: small confidence adjustments, alias updates, cosmetic concept weight changes
- COSMETIC: metadata only, no semantic change

Only output valid JSON. No markdown.`;

// ─── EXAMPLE BLOCK PAIRS ─────────────────────────────────────────────────────

const EXAMPLES = [
  {
    label: "LLM Paper Update",
    description: "Research paper revises claims after peer review",
    a: {
      stp_version: "0.1",
      title: "Large Language Models: Capabilities and Limitations",
      domain: "ai.ml",
      source_type: "preprint",
      generated_at: "2025-09-01T00:00:00Z",
      concepts: [
        { id: "stp:ai.ml.006", ref: "large_language_model", weight: 0.99 },
        { id: "stp:ai.ml.004", ref: "transformer",          weight: 0.88 },
        { id: "stp:ai.agents.001", ref: "agent",            weight: 0.75 },
        { id: "stp:ai.ml.010", ref: "emergent_behavior",    weight: 0.82 },
      ],
      relations: [
        { from: "large_language_model", to: "agent",            type: "supports",   confidence: 0.91 },
        { from: "large_language_model", to: "emergent_behavior",type: "causes",     confidence: 0.88 },
        { from: "transformer",          to: "large_language_model", type: "requires", confidence: 0.98 },
        { from: "emergent_behavior",    to: "large_language_model", type: "requires", confidence: 0.72 },
      ],
      claims: [
        { concept: "large_language_model", assertion: "LLMs demonstrate emergent capabilities at scale above 100B parameters", confidence: 0.88 },
        { concept: "agent", assertion: "LLM-based agents can complete multi-step tasks without human intervention", confidence: 0.91 },
      ],
    },
    b: {
      stp_version: "0.1",
      title: "Large Language Models: Capabilities and Limitations (Revised)",
      domain: "ai.ml",
      source_type: "review_paper",
      generated_at: "2026-01-15T00:00:00Z",
      concepts: [
        { id: "stp:ai.ml.006", ref: "large_language_model", weight: 0.99 },
        { id: "stp:ai.ml.004", ref: "transformer",          weight: 0.88 },
        { id: "stp:ai.agents.001", ref: "agent",            weight: 0.82 },
        { id: "stp:ai.ml.010", ref: "emergent_behavior",    weight: 0.61 },
        { id: "stp:ai.ml.011", ref: "reasoning",            weight: 0.79 },
      ],
      relations: [
        { from: "large_language_model", to: "agent",            type: "supports",   confidence: 0.85, conditions: ["tool_use_enabled","context_window_gte_128k"] },
        { from: "large_language_model", to: "emergent_behavior",type: "relates_to", confidence: 0.61 },
        { from: "transformer",          to: "large_language_model", type: "requires", confidence: 0.98 },
        { from: "large_language_model", to: "reasoning",       type: "supports",   confidence: 0.79 },
      ],
      claims: [
        { concept: "large_language_model", assertion: "Emergent capabilities may be artifacts of evaluation methodology rather than genuine phase transitions", confidence: 0.74 },
        { concept: "agent", assertion: "LLM-based agents require explicit tool access and sufficient context to complete multi-step tasks", confidence: 0.85 },
        { concept: "reasoning", assertion: "LLMs exhibit systematic reasoning failures on novel logical structures not present in training data", confidence: 0.81 },
      ],
    },
  },
  {
    label: "E-commerce Product",
    description: "Product page updates pricing, availability, specs",
    a: {
      stp_version: "0.1",
      title: "Ultralight Runner X9 — Product Page",
      domain: "ecommerce",
      source_type: "industry_report",
      generated_at: "2026-01-01T00:00:00Z",
      concepts: [
        { id: "stp:commerce.product.001", ref: "running_shoe", weight: 0.99 },
        { id: "stp:commerce.product.002", ref: "cushioning",   weight: 0.82 },
        { id: "stp:commerce.product.003", ref: "breathability", weight: 0.76 },
      ],
      relations: [
        { from: "running_shoe", to: "cushioning",   type: "requires", confidence: 0.88 },
        { from: "running_shoe", to: "breathability",type: "supports", confidence: 0.79 },
      ],
      claims: [
        { concept: "running_shoe", assertion: "Ultralight Runner X9 weighs 218g and is available in sizes 7-14", confidence: 0.99 },
        { concept: "running_shoe", assertion: "Priced at $129.99 with free 2-day shipping", confidence: 0.99 },
        { concept: "cushioning",   assertion: "Features 12mm heel drop with ZeroForm foam midsole", confidence: 0.95 },
      ],
    },
    b: {
      stp_version: "0.1",
      title: "Ultralight Runner X9 — Product Page",
      domain: "ecommerce",
      source_type: "industry_report",
      generated_at: "2026-03-01T00:00:00Z",
      concepts: [
        { id: "stp:commerce.product.001", ref: "running_shoe", weight: 0.99 },
        { id: "stp:commerce.product.002", ref: "cushioning",   weight: 0.82 },
        { id: "stp:commerce.product.003", ref: "breathability", weight: 0.76 },
        { id: "stp:commerce.product.004", ref: "sustainability", weight: 0.71 },
      ],
      relations: [
        { from: "running_shoe", to: "cushioning",    type: "requires",  confidence: 0.88 },
        { from: "running_shoe", to: "breathability", type: "supports",  confidence: 0.79 },
        { from: "running_shoe", to: "sustainability",type: "supports",  confidence: 0.71 },
      ],
      claims: [
        { concept: "running_shoe", assertion: "Ultralight Runner X9 weighs 218g and is available in sizes 7-14", confidence: 0.99 },
        { concept: "running_shoe", assertion: "Priced at $149.99 with free 2-day shipping", confidence: 0.99 },
        { concept: "cushioning",   assertion: "Features 12mm heel drop with ZeroForm foam midsole", confidence: 0.95 },
        { concept: "sustainability", assertion: "Upper made from 70% recycled ocean plastic", confidence: 0.97 },
      ],
    },
  },
  {
    label: "API Documentation",
    description: "Breaking API change — endpoint deprecated, new auth model",
    a: {
      stp_version: "0.1",
      title: "Payments API v2 Documentation",
      domain: "technical_report",
      source_type: "documentation",
      generated_at: "2025-06-01T00:00:00Z",
      concepts: [
        { id: "stp:api.payments.001", ref: "payment_processing", weight: 0.99 },
        { id: "stp:api.auth.001",     ref: "api_key_auth",       weight: 0.91 },
        { id: "stp:api.payments.002", ref: "webhook",            weight: 0.83 },
        { id: "stp:api.payments.003", ref: "idempotency",        weight: 0.77 },
      ],
      relations: [
        { from: "payment_processing", to: "api_key_auth",  type: "requires",  confidence: 0.99 },
        { from: "payment_processing", to: "webhook",       type: "supports",  confidence: 0.88 },
        { from: "payment_processing", to: "idempotency",   type: "requires",  confidence: 0.94 },
      ],
      claims: [
        { concept: "payment_processing", assertion: "POST /v2/charges endpoint accepts card tokens and returns charge objects", confidence: 0.99 },
        { concept: "api_key_auth",        assertion: "Authentication via Bearer token in Authorization header", confidence: 0.99 },
        { concept: "webhook",             assertion: "Webhooks delivered within 30 seconds of event with 3 retry attempts", confidence: 0.91 },
      ],
    },
    b: {
      stp_version: "0.1",
      title: "Payments API v3 Documentation",
      domain: "technical_report",
      source_type: "documentation",
      generated_at: "2026-02-01T00:00:00Z",
      concepts: [
        { id: "stp:api.payments.001", ref: "payment_processing", weight: 0.99 },
        { id: "stp:api.auth.002",     ref: "oauth2",             weight: 0.95 },
        { id: "stp:api.payments.002", ref: "webhook",            weight: 0.83 },
        { id: "stp:api.payments.003", ref: "idempotency",        weight: 0.77 },
        { id: "stp:api.payments.004", ref: "payment_intent",     weight: 0.91 },
      ],
      relations: [
        { from: "payment_processing", to: "oauth2",          type: "requires",  confidence: 0.99 },
        { from: "payment_processing", to: "webhook",         type: "supports",  confidence: 0.88 },
        { from: "payment_processing", to: "idempotency",     type: "requires",  confidence: 0.94 },
        { from: "payment_processing", to: "payment_intent",  type: "requires",  confidence: 0.97 },
        { from: "payment_intent",     to: "payment_processing", type: "supports", confidence: 0.91 },
      ],
      claims: [
        { concept: "payment_processing", assertion: "POST /v2/charges is DEPRECATED — migrate to /v3/payment-intents before 2026-09-01", confidence: 0.99 },
        { concept: "oauth2",             assertion: "v3 API requires OAuth2 client credentials flow — API keys no longer accepted", confidence: 0.99 },
        { concept: "webhook",            assertion: "Webhooks delivered within 30 seconds of event with 3 retry attempts", confidence: 0.91 },
        { concept: "payment_intent",     assertion: "Payment intents separate authorization from capture for improved reliability", confidence: 0.95 },
      ],
    },
  },
];

// ─── COLORS ──────────────────────────────────────────────────────────────────
const C = {
  bg:      "#0c0c14",
  surface: "#101018",
  card:    "#14141e",
  border:  "#1c1c28",
  text:    "#5858a0",
  bright:  "#d0d0f0",
  muted:   "#2a2a42",
  dim:     "#1e1e2e",

  added:    "#34d399",
  removed:  "#f43f5e",
  modified: "#facc15",
  neutral:  "#60a5fa",

  BREAKING:     "#f43f5e",
  SIGNIFICANT:  "#fb923c",
  MINOR:        "#facc15",
  COSMETIC:     "#60a5fa",

  REL: {
    requires:   "#60a5fa",
    supports:   "#34d399",
    is_type_of: "#a78bfa",
    causes:     "#fb923c",
    contradicts:"#f43f5e",
    precedes:   "#0f766e",
    relates_to: "#5a5a80",
    refutes:    "#f43f5e",
  },
};

// ─── SUBCOMPONENTS ────────────────────────────────────────────────────────────

function DiffBadge({ type }) {
  const map = {
    added:    { label: "ADDED",    color: C.added },
    removed:  { label: "REMOVED",  color: C.removed },
    modified: { label: "MODIFIED", color: C.modified },
    revised:  { label: "REVISED",  color: C.modified },
  };
  const { label, color } = map[type] || { label: type.toUpperCase(), color: C.neutral };
  return (
    <span style={{
      fontSize: 8, padding: "1px 6px",
      background: color + "15", border: `1px solid ${color}35`,
      borderRadius: 3, color,
      fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em",
    }}>{label}</span>
  );
}

function ConfidenceDelta({ before, after }) {
  const delta = after - before;
  const sign  = delta > 0 ? "+" : "";
  const color = delta > 0.05 ? C.added : delta < -0.05 ? C.removed : C.modified;
  return (
    <span style={{ fontSize: 9, fontFamily: "'DM Mono', monospace" }}>
      <span style={{ color: C.text }}>{(before*100).toFixed(0)}%</span>
      <span style={{ color: C.muted }}> → </span>
      <span style={{ color: C.bright }}>{(after*100).toFixed(0)}%</span>
      <span style={{ color, marginLeft: 4 }}>({sign}{(delta*100).toFixed(0)}%)</span>
    </span>
  );
}

function RelationChip({ from, type, to, confidence }) {
  const c = C.REL[type] || C.muted;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
      <span style={{ fontSize: 9, color: C.bright, fontFamily: "'DM Mono', monospace" }}>{from?.replace(/_/g," ")}</span>
      <span style={{ fontSize: 8, padding: "1px 6px", background: c+"15", border:`1px solid ${c}30`, borderRadius: 3, color: c, fontFamily:"'DM Mono', monospace" }}>{type}</span>
      <span style={{ fontSize: 9, color: C.bright, fontFamily: "'DM Mono', monospace" }}>{to?.replace(/_/g," ")}</span>
      {confidence !== undefined && (
        <span style={{ fontSize: 8, color: C.text, fontFamily: "'DM Mono', monospace" }}>{(confidence*100).toFixed(0)}%</span>
      )}
    </span>
  );
}

function SectionHeader({ label, count, color }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8, marginBottom: 8,
    }}>
      <div style={{ width: 3, height: 14, background: color, borderRadius: 2 }} />
      <span style={{ fontSize: 9, color, letterSpacing: "0.15em", fontFamily: "'DM Mono', monospace" }}>
        {label}
      </span>
      <span style={{
        fontSize: 9, padding: "0 6px",
        background: color + "15", border: `1px solid ${color}30`,
        borderRadius: 10, color,
        fontFamily: "'DM Mono', monospace",
      }}>{count}</span>
    </div>
  );
}

function BlockEditor({ value, onChange, label, timestamp }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, height: "100%" }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div style={{
          fontSize: 9, color: C.muted, letterSpacing: "0.15em",
          fontFamily: "'DM Mono', monospace",
        }}>{label}</div>
        {timestamp && (
          <span style={{ fontSize: 8, color: C.muted, fontFamily: "'DM Mono', monospace" }}>
            {timestamp}
          </span>
        )}
      </div>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        spellCheck={false}
        style={{
          flex: 1, minHeight: 280,
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 6, padding: "12px 14px",
          fontSize: 9.5, color: "#b0b0d0",
          fontFamily: "'DM Mono', monospace",
          lineHeight: 1.65, resize: "none",
          outline: "none",
        }}
        onFocus={e => e.target.style.borderColor = "#3a3a60"}
        onBlur={e => e.target.style.borderColor = C.border}
      />
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function DiffEngine() {
  const [blockA, setBlockA]   = useState(JSON.stringify(EXAMPLES[0].a, null, 2));
  const [blockB, setBlockB]   = useState(JSON.stringify(EXAMPLES[0].b, null, 2));
  const [diffResult, setDiffResult] = useState(null);
  const [computing, setComputing]   = useState(false);
  const [error, setError]           = useState(null);
  const [apiKey, setApiKey] = useState(import.meta.env.VITE_ANTHROPIC_API_KEY || "");
  const [activeExample, setActiveExample] = useState(0);
  const [view, setView]             = useState("diff"); // diff | split
  const [expandedSections, setExpandedSections] = useState({
    concepts: true, relations: true, claims: true, agent: true,
  });

  const toggleSection = (s) =>
    setExpandedSections(p => ({ ...p, [s]: !p[s] }));

  const loadExample = (idx) => {
    setActiveExample(idx);
    setBlockA(JSON.stringify(EXAMPLES[idx].a, null, 2));
    setBlockB(JSON.stringify(EXAMPLES[idx].b, null, 2));
    setDiffResult(null);
    setError(null);
  };

  const computeDiff = async () => {
    let parsedA, parsedB;
    try { parsedA = JSON.parse(blockA); } catch { setError("Version A: invalid JSON"); return; }
    try { parsedB = JSON.parse(blockB); } catch { setError("Version B: invalid JSON"); return; }

    setComputing(true);
    setDiffResult(null);
    setError(null);

    try {
      const resp = await fetch("/anthropic/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          messages: [{
            role: "user",
            content: `Compute the semantic diff between these two STP blocks.

VERSION A (old):
${JSON.stringify(parsedA, null, 2)}

VERSION B (new):
${JSON.stringify(parsedB, null, 2)}

Output ONLY the diff JSON object.`,
          }],
        }),
      });

      const data = await resp.json();
      const raw  = data.content?.[0]?.text || "";
      const clean = raw.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
      setDiffResult(JSON.parse(clean));
    } catch (e) {
      setError(`Diff failed: ${e.message}`);
    } finally {
      setComputing(false);
    }
  };

  const severityColor = diffResult ? C[diffResult.diff_summary?.severity] || C.neutral : C.neutral;
  const totalChanges = diffResult?.diff_summary?.total_changes || 0;

  // Count changes per section
  const conceptChanges = diffResult ? (
    (diffResult.concepts?.added?.length || 0) +
    (diffResult.concepts?.removed?.length || 0) +
    (diffResult.concepts?.modified?.length || 0)
  ) : 0;
  const relChanges = diffResult ? (
    (diffResult.relations?.added?.length || 0) +
    (diffResult.relations?.removed?.length || 0) +
    (diffResult.relations?.modified?.length || 0)
  ) : 0;
  const claimChanges = diffResult ? (
    (diffResult.claims?.added?.length || 0) +
    (diffResult.claims?.removed?.length || 0) +
    (diffResult.claims?.revised?.length || 0)
  ) : 0;

  return (
    <div style={{
      fontFamily: "'DM Mono', monospace",
      background: C.bg, minHeight: "100vh", color: C.text,
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Mono:ital,wght@0,300;0,400;1,300&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{
        borderBottom: `1px solid ${C.border}`,
        padding: "12px 22px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "rgba(8,8,14,0.98)",
        position: "sticky", top: 0, zIndex: 10,
        backdropFilter: "blur(12px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{
            fontSize: 14, fontWeight: 800, letterSpacing: "0.2em",
            color: "#d8d8f8", fontFamily: "'Syne', sans-serif",
          }}>STP</span>
          <span style={{ fontSize: 10, color: C.muted, letterSpacing: "0.15em" }}>
            DIFF ENGINE
          </span>
          {diffResult && (
            <span style={{
              fontSize: 9, padding: "2px 10px",
              background: severityColor + "15",
              border: `1px solid ${severityColor}35`,
              borderRadius: 3, color: severityColor,
              letterSpacing: "0.1em",
            }}>
              {diffResult.diff_summary?.severity} · {totalChanges} CHANGES
            </span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* View toggle */}
          {diffResult && (
            <div style={{ display: "flex", gap: 0 }}>
              {["diff", "split"].map(v => (
                <button key={v} onClick={() => setView(v)} style={{
                  background: view === v ? C.card : "transparent",
                  border: `1px solid ${C.border}`,
                  borderRight: v === "diff" ? "none" : undefined,
                  color: view === v ? C.bright : C.muted,
                  padding: "4px 10px",
                  borderRadius: v === "diff" ? "4px 0 0 4px" : "0 4px 4px 0",
                  cursor: "pointer", fontSize: 9, fontFamily: "inherit",
                  letterSpacing: "0.08em",
                }}>{v === "diff" ? "DIFF VIEW" : "SPLIT VIEW"}</button>
              ))}
            </div>
          )}

          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="sk-ant-... (Anthropic API key)"
            style={{
              width: "100%", padding: "6px 10px", marginBottom: 8,
              background: "rgba(0,0,0,0.3)", border: `1px solid ${C.border}`,
              borderRadius: 4, fontSize: 10, color: C.bright,
              fontFamily: "inherit", outline: "none",
            }}
          />
          <button
            onClick={computeDiff}
            disabled={computing || !apiKey.trim()}
            style={{
              background: computing ? C.muted : "rgba(96,165,250,0.12)",
              border: `1px solid ${computing ? C.border : "#60a5fa40"}`,
              color: computing ? C.muted : "#60a5fa",
              padding: "6px 16px", borderRadius: 4, cursor: computing ? "default" : "pointer",
              fontSize: 10, letterSpacing: "0.12em", fontFamily: "inherit",
              display: "flex", alignItems: "center", gap: 8,
              transition: "all 0.2s",
            }}
          >
            {computing ? (
              <>
                <div style={{
                  width: 10, height: 10, borderRadius: "50%",
                  border: `1.5px solid ${C.muted}`,
                  borderTopColor: "#60a5fa",
                  animation: "spin 0.7s linear infinite",
                }} />
                COMPUTING…
              </>
            ) : "COMPUTE DIFF →"}
          </button>
        </div>
      </div>

      {/* Example selector */}
      <div style={{
        borderBottom: `1px solid ${C.border}`,
        padding: "10px 22px",
        display: "flex", gap: 6, alignItems: "center",
        background: "rgba(6,6,12,0.9)",
      }}>
        <span style={{ fontSize: 9, color: C.muted, marginRight: 4 }}>EXAMPLES:</span>
        {EXAMPLES.map((ex, i) => (
          <button key={i} onClick={() => loadExample(i)} style={{
            background: activeExample === i ? "rgba(96,165,250,0.12)" : "transparent",
            border: `1px solid ${activeExample === i ? "#60a5fa40" : C.border}`,
            color: activeExample === i ? "#60a5fa" : C.muted,
            padding: "4px 12px", borderRadius: 4, cursor: "pointer",
            fontSize: 9, fontFamily: "inherit", letterSpacing: "0.06em",
            display: "flex", flexDirection: "column", gap: 1, alignItems: "flex-start",
          }}>
            <span>{ex.label}</span>
            <span style={{ fontSize: 7, opacity: 0.6 }}>{ex.description}</span>
          </button>
        ))}
      </div>

      <div style={{ display: "flex", height: "calc(100vh - 102px)", overflow: "hidden" }}>

        {/* ── EDITOR PANEL ── */}
        <div style={{
          width: diffResult ? 340 : "50%",
          minWidth: 280,
          borderRight: `1px solid ${C.border}`,
          padding: "16px 14px",
          display: "flex", flexDirection: "column", gap: 12,
          background: "rgba(4,4,10,0.7)",
          transition: "width 0.3s ease",
          overflowY: "auto",
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
            <BlockEditor
              label="VERSION A — BEFORE"
              value={blockA}
              onChange={setBlockA}
              timestamp={(() => { try { return JSON.parse(blockA).generated_at?.slice(0,10); } catch { return null; } })()}
            />
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "6px 0",
            }}>
              <div style={{ flex: 1, height: 1, background: C.border }} />
              <span style={{ fontSize: 9, color: C.muted }}>→</span>
              <div style={{ flex: 1, height: 1, background: C.border }} />
            </div>
            <BlockEditor
              label="VERSION B — AFTER"
              value={blockB}
              onChange={setBlockB}
              timestamp={(() => { try { return JSON.parse(blockB).generated_at?.slice(0,10); } catch { return null; } })()}
            />
          </div>

          {error && (
            <div style={{
              padding: "8px 12px",
              background: "#f43f5e08", border: "1px solid #f43f5e25",
              borderRadius: 5, fontSize: 9, color: "#f43f5e",
            }}>{error}</div>
          )}

          <div style={{ fontSize: 8, color: C.muted, lineHeight: 1.7, borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
            Paste any two STP blocks. The diff engine identifies semantic changes — not just JSON diffs — and tells agents exactly what to re-evaluate.
          </div>
        </div>

        {/* ── RESULTS PANEL ── */}
        {!diffResult && !computing && (
          <div style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
            color: C.muted, fontSize: 11, letterSpacing: "0.1em",
            flexDirection: "column", gap: 10,
          }}>
            <div style={{ fontSize: 32, opacity: 0.3 }}>⇄</div>
            <div>SELECT AN EXAMPLE AND COMPUTE DIFF</div>
            <div style={{ fontSize: 9, opacity: 0.5 }}>Or paste your own STP blocks</div>
          </div>
        )}

        {computing && (
          <div style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
            color: C.muted, fontSize: 11, letterSpacing: "0.1em",
            flexDirection: "column", gap: 12,
          }}>
            <div style={{
              width: 24, height: 24, borderRadius: "50%",
              border: `2px solid ${C.muted}`,
              borderTopColor: "#60a5fa",
              animation: "spin 0.8s linear infinite",
            }} />
            <div>COMPUTING SEMANTIC DIFF</div>
          </div>
        )}

        {diffResult && !computing && (
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Summary */}
            <div style={{
              background: severityColor + "08",
              border: `1px solid ${severityColor}25`,
              borderRadius: 8, padding: "14px 18px",
              display: "flex", justifyContent: "space-between", alignItems: "flex-start",
            }}>
              <div>
                <div style={{
                  fontSize: 9, color: severityColor, letterSpacing: "0.15em", marginBottom: 5,
                }}>
                  {diffResult.diff_summary?.severity} DIFF
                </div>
                <div style={{
                  fontSize: 15, fontWeight: 800, color: C.bright,
                  fontFamily: "'Syne', sans-serif", lineHeight: 1.3,
                }}>
                  {diffResult.diff_summary?.one_line}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                {[
                  { label: "CONCEPTS", val: conceptChanges, color: C.neutral },
                  { label: "RELATIONS", val: relChanges,  color: "#a78bfa" },
                  { label: "CLAIMS",   val: claimChanges, color: C.modified },
                ].map((s, i) => (
                  <div key={i} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: s.color, fontFamily: "'Syne', sans-serif", lineHeight: 1 }}>
                      {s.val}
                    </div>
                    <div style={{ fontSize: 7, color: C.muted, letterSpacing: "0.1em" }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Agent action */}
            {diffResult.agent_action && (() => {
              const act = diffResult.agent_action;
              const recColor = {
                REPROCESS_FULL: "#f43f5e",
                UPDATE_DELTA:   "#facc15",
                IGNORE:         "#34d399",
                FLAG_FOR_REVIEW:"#fb923c",
              }[act.recommended_action] || C.neutral;
              return (
                <div
                  onClick={() => toggleSection("agent")}
                  style={{
                    background: recColor + "08",
                    border: `1px solid ${recColor}25`,
                    borderRadius: 6, padding: "12px 14px",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <SectionHeader label="AGENT ACTION" count={act.recommended_action} color={recColor} />
                    <span style={{ color: C.muted, fontSize: 10 }}>
                      {expandedSections.agent ? "−" : "+"}
                    </span>
                  </div>
                  {expandedSections.agent && (
                    <div style={{ fontSize: 9, color: C.text, lineHeight: 1.7, marginTop: 6 }}>
                      <div style={{ marginBottom: 6 }}>
                        <span style={{ color: C.muted }}>Cache invalidation: </span>
                        <span style={{ color: act.must_invalidate_cache ? "#f43f5e" : "#34d399" }}>
                          {act.must_invalidate_cache ? "REQUIRED" : "NOT REQUIRED"}
                        </span>
                      </div>
                      <div style={{ marginBottom: 6 }}>
                        <span style={{ color: C.muted }}>Reason: </span>
                        <span style={{ color: C.text }}>{act.reason}</span>
                      </div>
                      {act.affected_downstream_concepts?.length > 0 && (
                        <div>
                          <span style={{ color: C.muted }}>Re-evaluate: </span>
                          {act.affected_downstream_concepts.map((c, i) => (
                            <span key={i} style={{
                              fontSize: 8, padding: "1px 6px", marginLeft: 4,
                              background: "#facc1515", border: "1px solid #facc1530",
                              borderRadius: 3, color: "#facc15",
                            }}>{c.replace(/_/g," ")}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Concepts diff */}
            {conceptChanges > 0 && (
              <div style={{
                background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: 6, padding: "12px 14px",
              }}>
                <div
                  onClick={() => toggleSection("concepts")}
                  style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  <SectionHeader label="CONCEPTS" count={conceptChanges} color={C.neutral} />
                  <span style={{ color: C.muted, fontSize: 10 }}>{expandedSections.concepts ? "−" : "+"}</span>
                </div>
                {expandedSections.concepts && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                    {diffResult.concepts?.added?.map((c, i) => (
                      <div key={i} style={{
                        display: "flex", gap: 8, alignItems: "flex-start",
                        padding: "8px 10px",
                        background: C.added + "08", border: `1px solid ${C.added}25`,
                        borderRadius: 5, borderLeft: `3px solid ${C.added}`,
                      }}>
                        <DiffBadge type="added" />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 10, color: C.bright, fontFamily: "'DM Mono', monospace", marginBottom: 2 }}>
                            {c.ref?.replace(/_/g," ")}
                          </div>
                          <div style={{ fontSize: 8, color: C.muted }}>{c.id}</div>
                          {c.significance && <div style={{ fontSize: 9, color: C.added, marginTop: 3 }}>{c.significance}</div>}
                        </div>
                        <span style={{ fontSize: 9, color: C.added, fontFamily: "'DM Mono', monospace" }}>
                          {c.weight ? `${(c.weight*100).toFixed(0)}%` : ""}
                        </span>
                      </div>
                    ))}
                    {diffResult.concepts?.removed?.map((c, i) => (
                      <div key={i} style={{
                        display: "flex", gap: 8, alignItems: "flex-start",
                        padding: "8px 10px",
                        background: C.removed + "08", border: `1px solid ${C.removed}25`,
                        borderRadius: 5, borderLeft: `3px solid ${C.removed}`,
                      }}>
                        <DiffBadge type="removed" />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 10, color: C.bright, fontFamily: "'DM Mono', monospace", textDecoration: "line-through", marginBottom: 2 }}>
                            {c.ref?.replace(/_/g," ")}
                          </div>
                          {c.significance && <div style={{ fontSize: 9, color: C.removed, marginTop: 3 }}>{c.significance}</div>}
                        </div>
                      </div>
                    ))}
                    {diffResult.concepts?.modified?.map((c, i) => (
                      <div key={i} style={{
                        display: "flex", gap: 8, alignItems: "flex-start",
                        padding: "8px 10px",
                        background: C.modified + "08", border: `1px solid ${C.modified}25`,
                        borderRadius: 5, borderLeft: `3px solid ${C.modified}`,
                      }}>
                        <DiffBadge type="modified" />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 10, color: C.bright, fontFamily: "'DM Mono', monospace", marginBottom: 4 }}>
                            {c.ref?.replace(/_/g," ")}
                          </div>
                          {c.weight_before !== undefined && c.weight_after !== undefined && (
                            <div style={{ fontSize: 9, color: C.text, marginBottom: 2 }}>
                              weight: <ConfidenceDelta before={c.weight_before} after={c.weight_after} />
                            </div>
                          )}
                          {c.significance && <div style={{ fontSize: 9, color: C.modified, marginTop: 3 }}>{c.significance}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Relations diff */}
            {relChanges > 0 && (
              <div style={{
                background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: 6, padding: "12px 14px",
              }}>
                <div
                  onClick={() => toggleSection("relations")}
                  style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  <SectionHeader label="RELATIONS" count={relChanges} color="#a78bfa" />
                  <span style={{ color: C.muted, fontSize: 10 }}>{expandedSections.relations ? "−" : "+"}</span>
                </div>
                {expandedSections.relations && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                    {diffResult.relations?.added?.map((r, i) => (
                      <div key={i} style={{
                        padding: "8px 10px",
                        background: C.added + "08", border: `1px solid ${C.added}25`,
                        borderRadius: 5, borderLeft: `3px solid ${C.added}`,
                      }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                          <DiffBadge type="added" />
                          <RelationChip from={r.from} type={r.type} to={r.to} confidence={r.confidence} />
                        </div>
                        {r.significance && <div style={{ fontSize: 9, color: C.added, marginLeft: 60 }}>{r.significance}</div>}
                      </div>
                    ))}
                    {diffResult.relations?.removed?.map((r, i) => (
                      <div key={i} style={{
                        padding: "8px 10px",
                        background: C.removed + "08", border: `1px solid ${C.removed}25`,
                        borderRadius: 5, borderLeft: `3px solid ${C.removed}`,
                      }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                          <DiffBadge type="removed" />
                          <RelationChip from={r.from} type={r.type} to={r.to} confidence={r.confidence} />
                        </div>
                        {r.significance && <div style={{ fontSize: 9, color: C.removed, marginLeft: 60 }}>{r.significance}</div>}
                      </div>
                    ))}
                    {diffResult.relations?.modified?.map((r, i) => (
                      <div key={i} style={{
                        padding: "8px 10px",
                        background: C.modified + "08", border: `1px solid ${C.modified}25`,
                        borderRadius: 5, borderLeft: `3px solid ${C.modified}`,
                      }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 4, flexWrap: "wrap" }}>
                          <DiffBadge type="modified" />
                          <RelationChip from={r.from} type={r.type_after || r.type} to={r.to} />
                        </div>
                        <div style={{ marginLeft: 0, fontSize: 9, color: C.text, lineHeight: 1.8 }}>
                          {r.confidence_before !== undefined && r.confidence_after !== undefined && (
                            <div>confidence: <ConfidenceDelta before={r.confidence_before} after={r.confidence_after} /></div>
                          )}
                          {r.type_changed && (
                            <div style={{ color: C.removed }}>
                              type: <span style={{ fontFamily: "'DM Mono', monospace" }}>{r.type_before}</span>
                              <span style={{ color: C.muted }}> → </span>
                              <span style={{ fontFamily: "'DM Mono', monospace", color: C.added }}>{r.type_after}</span>
                            </div>
                          )}
                          {r.conditions_changed && (
                            <div style={{ color: C.modified }}>conditions changed</div>
                          )}
                        </div>
                        {r.significance && <div style={{ fontSize: 9, color: C.modified, marginTop: 4 }}>{r.significance}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Claims diff */}
            {claimChanges > 0 && (
              <div style={{
                background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: 6, padding: "12px 14px",
              }}>
                <div
                  onClick={() => toggleSection("claims")}
                  style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  <SectionHeader label="CLAIMS" count={claimChanges} color={C.modified} />
                  <span style={{ color: C.muted, fontSize: 10 }}>{expandedSections.claims ? "−" : "+"}</span>
                </div>
                {expandedSections.claims && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                    {diffResult.claims?.added?.map((cl, i) => (
                      <div key={i} style={{
                        padding: "8px 10px",
                        background: C.added + "08", border: `1px solid ${C.added}25`,
                        borderRadius: 5, borderLeft: `3px solid ${C.added}`,
                        fontSize: 9, lineHeight: 1.6,
                      }}>
                        <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                          <DiffBadge type="added" />
                          <span style={{ color: "#a78bfa", fontFamily: "'DM Mono', monospace" }}>{cl.concept}</span>
                          <span style={{ color: C.added, marginLeft: "auto" }}>{cl.confidence ? `${(cl.confidence*100).toFixed(0)}%` : ""}</span>
                        </div>
                        <div style={{ color: C.bright }}>{cl.assertion}</div>
                      </div>
                    ))}
                    {diffResult.claims?.removed?.map((cl, i) => (
                      <div key={i} style={{
                        padding: "8px 10px",
                        background: C.removed + "08", border: `1px solid ${C.removed}25`,
                        borderRadius: 5, borderLeft: `3px solid ${C.removed}`,
                        fontSize: 9, lineHeight: 1.6,
                      }}>
                        <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                          <DiffBadge type="removed" />
                          <span style={{ color: "#a78bfa", fontFamily: "'DM Mono', monospace" }}>{cl.concept}</span>
                        </div>
                        <div style={{ color: C.text, textDecoration: "line-through" }}>{cl.assertion}</div>
                      </div>
                    ))}
                    {diffResult.claims?.revised?.map((cl, i) => (
                      <div key={i} style={{
                        padding: "8px 10px",
                        background: C.modified + "08", border: `1px solid ${C.modified}25`,
                        borderRadius: 5, borderLeft: `3px solid ${C.modified}`,
                        fontSize: 9, lineHeight: 1.6,
                      }}>
                        <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                          <DiffBadge type="revised" />
                          <span style={{ color: "#a78bfa", fontFamily: "'DM Mono', monospace" }}>{cl.concept}</span>
                          {cl.confidence_before !== undefined && cl.confidence_after !== undefined && (
                            <span style={{ marginLeft: "auto" }}>
                              <ConfidenceDelta before={cl.confidence_before} after={cl.confidence_after} />
                            </span>
                          )}
                        </div>
                        <div style={{
                          color: C.text, textDecoration: "line-through",
                          marginBottom: 4, opacity: 0.7,
                        }}>{cl.assertion_before}</div>
                        <div style={{ color: C.bright }}>{cl.assertion_after}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {totalChanges === 0 && (
              <div style={{
                padding: "24px", textAlign: "center",
                background: C.added + "08", border: `1px solid ${C.added}20`,
                borderRadius: 6, color: C.added, fontSize: 11,
              }}>
                ✓ NO SEMANTIC CHANGES DETECTED — blocks are equivalent
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1e1e30; border-radius: 2px; }
        button:hover:not(:disabled) { opacity: 0.82; }
      `}</style>
    </div>
  );
}
