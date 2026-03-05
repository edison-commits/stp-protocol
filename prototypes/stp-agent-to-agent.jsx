import { useState, useEffect, useRef, useCallback } from "react";

// ─── STP AGENT-TO-AGENT PROTOCOL ─────────────────────────────────────────────
//
// Two agents. Zero natural language between them.
// Every message is a typed semantic packet: concept refs, relation types,
// confidence values, and structured payloads — nothing else.
//
// Message types:
//   QUERY      — agent requests information about a concept or relation
//   ASSERT     — agent declares a claim with confidence + provenance
//   CHALLENGE  — agent disputes a claim, requests evidence
//   RESOLVE    — agent provides resolution to a challenge
//   DELEGATE   — agent hands off a subtask to the other agent
//   ACK        — minimal acknowledgment, no natural language
//   REJECT     — agent cannot satisfy request, reason code only
//   COMPLETE   — task marked done, result summary in STP form

const MSG_TYPES = {
  QUERY:    { color: "#60a5fa", icon: "?" },
  ASSERT:   { color: "#a78bfa", icon: "!" },
  CHALLENGE:{ color: "#f43f5e", icon: "⚡" },
  RESOLVE:  { color: "#34d399", icon: "✓" },
  DELEGATE: { color: "#fb923c", icon: "→" },
  ACK:      { color: "#3a3a58", icon: "·" },
  REJECT:   { color: "#f43f5e", icon: "✗" },
  COMPLETE: { color: "#34d399", icon: "◆" },
};

// ─── AGENT DEFINITIONS ────────────────────────────────────────────────────────

const AGENTS = {
  ALPHA: {
    id: "agent_alpha",
    label: "ALPHA",
    role: "Orchestrator",
    domain_focus: "ai.ml",
    description: "Task orchestrator. Decomposes goals, delegates subtasks, synthesizes results.",
    color: "#60a5fa",
  },
  BETA: {
    id: "agent_beta",
    label: "BETA",
    role: "Domain Specialist",
    domain_focus: "ai.agents",
    description: "Agent architecture specialist. Resolves queries, challenges weak assertions.",
    color: "#a78bfa",
  },
};

// ─── CONVERSATION SCENARIOS ───────────────────────────────────────────────────

const SCENARIOS = [
  {
    id: "s001",
    title: "LLM Capability Assessment",
    description: "ALPHA queries BETA on whether current LLMs are sufficient for autonomous agent deployment. BETA challenges a weak confidence claim.",
    messages: [
      {
        from: "ALPHA", type: "QUERY", delay: 0,
        packet: {
          query_id: "q_001",
          target_concept: { id: "stp:ai.ml.006", ref: "large_language_model" },
          relation_query: "supports",
          target_relation: { id: "stp:ai.agents.001", ref: "agent" },
          context: { task: "autonomous_deployment_assessment" },
          confidence_threshold: 0.80,
        },
        human_gloss: "Are current LLMs sufficient to support autonomous agent deployment?",
      },
      {
        from: "BETA", type: "ASSERT", delay: 1400,
        packet: {
          response_to: "q_001",
          assertion: {
            from: { id: "stp:ai.ml.006", ref: "large_language_model" },
            relation: "supports",
            to:   { id: "stp:ai.agents.001", ref: "agent" },
            confidence: 0.73,
            conditions: ["tool_use_enabled", "context_window_gte_32k"],
            provenance: { source_id: "src_empirical_2025", source_type: "empirical_study" },
          },
        },
        human_gloss: "Yes, LLMs support agents — but only with tool use enabled and sufficient context window. Confidence 73%.",
      },
      {
        from: "ALPHA", type: "CHALLENGE", delay: 2600,
        packet: {
          challenge_id: "ch_001",
          challenges: "q_001_response",
          reason_code: "CONFIDENCE_BELOW_THRESHOLD",
          threshold_required: 0.80,
          threshold_received: 0.73,
          request: "PROVIDE_HIGHER_CONFIDENCE_SOURCE_OR_REVISE_CONDITIONS",
        },
        human_gloss: "73% is below my 80% threshold. Either provide a stronger source or add more conditions.",
      },
      {
        from: "BETA", type: "RESOLVE", delay: 4000,
        packet: {
          resolves: "ch_001",
          revised_assertion: {
            from: { id: "stp:ai.ml.006", ref: "large_language_model" },
            relation: "supports",
            to: { id: "stp:ai.agents.001", ref: "agent" },
            confidence: 0.85,
            conditions: ["tool_use_enabled", "context_window_gte_128k", "reasoning_model", "memory_augmented"],
            provenance: [
              { source_id: "src_primary_2025a", source_type: "primary_research", confidence: 0.91 },
              { source_id: "src_empirical_2025", source_type: "empirical_study", confidence: 0.82 },
            ],
          },
          delta: "+0.12 confidence via corroboration + tightened conditions",
        },
        human_gloss: "Revised to 85% — added reasoning_model and memory_augmented as required conditions, corroborated with second primary source.",
      },
      {
        from: "ALPHA", type: "ACK", delay: 5200,
        packet: {
          acks: "ch_001_resolution",
          accepted: true,
          stored_as: "stp:ai.ml.006 --[supports:0.85]--> stp:ai.agents.001",
          conditions_logged: true,
        },
        human_gloss: "Accepted. Storing the relation with conditions.",
      },
      {
        from: "ALPHA", type: "COMPLETE", delay: 6400,
        packet: {
          task: "autonomous_deployment_assessment",
          result: {
            verdict: "CONDITIONALLY_SUPPORTED",
            confidence: 0.85,
            key_relation: "stp:ai.ml.006 --[supports:0.85]--> stp:ai.agents.001",
            required_conditions: ["tool_use_enabled","context_window_gte_128k","reasoning_model","memory_augmented"],
            blocking_conditions: ["context_window_lt_32k","no_tool_access"],
          },
          token_cost: { natural_language_equivalent: 847, stp_packet_bytes: 312, compression_ratio: "2.7x" },
        },
        human_gloss: "Task complete. LLM supports agent deployment — conditionally. 4 required capabilities logged.",
      },
    ],
  },

  {
    id: "s002",
    title: "Agent Memory Architecture Dispute",
    description: "BETA asserts memory is required for agents. ALPHA delegates a sub-query. They reach a nuanced resolution.",
    messages: [
      {
        from: "BETA", type: "ASSERT", delay: 0,
        packet: {
          assertion_id: "a_001",
          assertion: {
            from: { id: "stp:ai.agents.001", ref: "agent" },
            relation: "requires",
            to: { id: "stp:ai.agents.002", ref: "memory" },
            confidence: 0.87,
            scope: "long_horizon_tasks",
            provenance: { source_id: "src_longhorizon_2025", source_type: "empirical_study" },
          },
        },
        human_gloss: "Agents require memory — at least for long-horizon tasks. 87% confidence.",
      },
      {
        from: "ALPHA", type: "CHALLENGE", delay: 1600,
        packet: {
          challenge_id: "ch_002",
          challenges: "a_001",
          reason_code: "SCOPE_TOO_NARROW",
          counter_evidence: {
            from: { id: "stp:ai.agents.001", ref: "agent" },
            relation: "requires",
            to: { id: "stp:ai.agents.002", ref: "memory" },
            confidence: 0.61,
            scope: "short_horizon_tasks",
            note: "CONTRADICTS a_001 for short-horizon scope",
          },
          request: "CLARIFY_SCOPE_BOUNDARY",
        },
        human_gloss: "Your claim is too narrow. For short-horizon tasks, memory requirement is only 61%. Define the scope boundary.",
      },
      {
        from: "BETA", type: "DELEGATE", delay: 2800,
        packet: {
          delegate_id: "d_001",
          task: "SCOPE_BOUNDARY_ANALYSIS",
          query: {
            concept: { id: "stp:ai.agents.002", ref: "memory" },
            find: "threshold_condition",
            for_relation: "requires",
            from_concept: { id: "stp:ai.agents.001", ref: "agent" },
          },
          expected_return: "task_horizon_length_threshold",
          deadline_ms: 3000,
        },
        human_gloss: "Delegating scope boundary analysis back to you — you have better short-horizon data.",
      },
      {
        from: "ALPHA", type: "RESOLVE", delay: 4200,
        packet: {
          resolves: "d_001",
          result: {
            threshold_concept: "task_horizon",
            boundary_value: 50,
            boundary_unit: "steps",
            below_threshold: {
              relation: "requires", confidence: 0.58,
              note: "stateless agents sufficient"
            },
            above_threshold: {
              relation: "requires", confidence: 0.91,
              note: "context overflow causes 78% failure rate"
            },
          },
          source: { source_id: "src_stateless_2025", source_type: "primary_research" },
        },
        human_gloss: "Boundary is 50 steps. Below: memory optional (58%). Above: memory required (91%).",
      },
      {
        from: "BETA", type: "ASSERT", delay: 5600,
        packet: {
          assertion_id: "a_002",
          supersedes: "a_001",
          assertion: {
            from: { id: "stp:ai.agents.001", ref: "agent" },
            relation: "requires",
            to: { id: "stp:ai.agents.002", ref: "memory" },
            confidence: 0.91,
            conditions: ["task_horizon_gt_50_steps"],
            anti_conditions: ["task_horizon_lte_50_steps"],
            provenance: ["src_longhorizon_2025", "src_stateless_2025"],
          },
        },
        human_gloss: "Revised assertion: memory required (91%) — but only when task horizon exceeds 50 steps.",
      },
      {
        from: "ALPHA", type: "COMPLETE", delay: 6800,
        packet: {
          task: "agent_memory_architecture_dispute",
          result: {
            verdict: "CONDITIONAL_REQUIREMENT",
            relations_stored: 2,
            relation_a: "agent --[requires:0.91 if steps>50]--> memory",
            relation_b: "agent --[requires:0.58 if steps<=50]--> memory",
            conflict_resolution: "SCOPE_PARTITIONED",
          },
          token_cost: { natural_language_equivalent: 1240, stp_packet_bytes: 489, compression_ratio: "2.5x" },
        },
        human_gloss: "Dispute resolved. Memory requirement is scope-partitioned — two relations stored, not one.",
      },
    ],
  },

  {
    id: "s003",
    title: "Knowledge Graph Construction",
    description: "ALPHA orchestrates rapid knowledge graph construction. BETA fires assertions, ALPHA integrates.",
    messages: [
      {
        from: "ALPHA", type: "QUERY", delay: 0,
        packet: {
          query_id: "q_002",
          mode: "BULK_ASSERT_REQUEST",
          target_domain: "ai.ml",
          seed_concept: { id: "stp:ai.ml.004", ref: "transformer" },
          depth: 2,
          relation_types: ["requires","supports","is_type_of","causes"],
          min_confidence: 0.75,
        },
        human_gloss: "Give me everything you know about transformer — relations depth 2, confidence 75%+.",
      },
      {
        from: "BETA", type: "ASSERT", delay: 900,
        packet: {
          response_to: "q_002",
          bulk_assertions: [
            { from: "transformer", rel: "requires",   to: "attention_mechanism", conf: 0.99, strength: "hard" },
            { from: "transformer", rel: "is_type_of", to: "neural_network",      conf: 0.97, strength: "hard" },
            { from: "transformer", rel: "causes",     to: "large_language_model",conf: 0.95, strength: "emergent" },
            { from: "transformer", rel: "requires",   to: "training_data",       conf: 0.93, strength: "hard" },
          ],
          depth: 1, total: 4,
        },
        human_gloss: "Transformer: requires attention (99%), is_type_of neural_net (97%), causes LLM (95%), requires training_data (93%).",
      },
      {
        from: "BETA", type: "ASSERT", delay: 1800,
        packet: {
          response_to: "q_002",
          bulk_assertions: [
            { from: "attention_mechanism", rel: "supports",   to: "transformer",      conf: 0.99 },
            { from: "attention_mechanism", rel: "requires",   to: "vector_embedding", conf: 0.88 },
            { from: "large_language_model",rel: "supports",   to: "agent",            conf: 0.90 },
            { from: "large_language_model",rel: "requires",   to: "inference",        conf: 0.92 },
            { from: "neural_network",      rel: "supports",   to: "deep_learning",    conf: 0.95 },
          ],
          depth: 2, total: 5,
        },
        human_gloss: "Depth-2 relations: attention↔transformer, attention→embedding, LLM→agent, LLM→inference, neural_net→deep_learning.",
      },
      {
        from: "ALPHA", type: "CHALLENGE", delay: 2800,
        packet: {
          challenge_id: "ch_003",
          challenges: "bulk_assertion_depth2[large_language_model→agent]",
          reason_code: "CONFIDENCE_REQUIRES_CONDITIONS",
          note: "Previously established: LLM supports agent ONLY under 4 conditions (session s001)",
          request: "APPLY_CONDITIONS_FROM_SESSION_s001",
        },
        human_gloss: "LLM→agent at 90% is wrong — we resolved this already. Apply the 4 conditions from session s001.",
      },
      {
        from: "BETA", type: "RESOLVE", delay: 3900,
        packet: {
          resolves: "ch_003",
          corrected_assertion: {
            from: "large_language_model", rel: "supports", to: "agent",
            conf: 0.85,
            conditions: ["tool_use_enabled","context_window_gte_128k","reasoning_model","memory_augmented"],
            session_ref: "s001",
          },
          note: "Conditions imported from prior session resolution",
        },
        human_gloss: "Corrected — 85% with conditions inherited from s001.",
      },
      {
        from: "ALPHA", type: "COMPLETE", delay: 5200,
        packet: {
          task: "knowledge_graph_construction",
          result: {
            seed: "stp:ai.ml.004 (transformer)",
            nodes_integrated: 8,
            relations_stored: 9,
            corrections_applied: 1,
            graph_snapshot: {
              "transformer":         ["→requires→ attention_mechanism(0.99)", "→is_type_of→ neural_network(0.97)", "→causes→ large_language_model(0.95)"],
              "attention_mechanism": ["→requires→ vector_embedding(0.88)"],
              "large_language_model":["→supports→ agent(0.85,conditional)", "→requires→ inference(0.92)"],
              "neural_network":      ["→supports→ deep_learning(0.95)"],
            },
          },
          token_cost: { natural_language_equivalent: 2100, stp_packet_bytes: 761, compression_ratio: "2.8x" },
        },
        human_gloss: "Graph complete. 8 nodes, 9 relations, 1 correction from cross-session context. 2.8x compression vs natural language.",
      },
    ],
  },
];

// ─── RENDER HELPERS ──────────────────────────────────────────────────────────

function tokenize(obj, depth = 0) {
  if (depth > 4) return [{ t: "muted", v: "..." }];
  if (typeof obj === "string")  return [{ t: "str",  v: `"${obj}"` }];
  if (typeof obj === "number")  return [{ t: "num",  v: String(obj) }];
  if (typeof obj === "boolean") return [{ t: "bool", v: String(obj) }];
  if (Array.isArray(obj)) {
    if (obj.length === 0) return [{ t: "bracket", v: "[]" }];
    const items = [];
    items.push({ t: "bracket", v: "[" });
    obj.forEach((v, i) => {
      items.push({ t: "indent", v: depth + 1 });
      items.push(...tokenize(v, depth + 1));
      if (i < obj.length - 1) items.push({ t: "comma", v: "," });
    });
    items.push({ t: "indent", v: depth });
    items.push({ t: "bracket", v: "]" });
    return items;
  }
  if (typeof obj === "object" && obj !== null) {
    const entries = Object.entries(obj);
    if (entries.length === 0) return [{ t: "bracket", v: "{}" }];
    const items = [];
    items.push({ t: "bracket", v: "{" });
    entries.forEach(([k, v], i) => {
      items.push({ t: "indent", v: depth + 1 });
      items.push({ t: "key", v: `"${k}"` });
      items.push({ t: "colon", v: ": " });
      items.push(...tokenize(v, depth + 1));
      if (i < entries.length - 1) items.push({ t: "comma", v: "," });
    });
    items.push({ t: "indent", v: depth });
    items.push({ t: "bracket", v: "}" });
    return items;
  }
  return [{ t: "null", v: "null" }];
}

const TOKEN_COLORS = {
  str:     "#fb923c",
  num:     "#34d399",
  bool:    "#a78bfa",
  key:     "#60a5fa",
  colon:   "#3a3a55",
  comma:   "#3a3a55",
  bracket: "#5a5a80",
  muted:   "#2a2a45",
  null:    "#f43f5e",
};

function SyntaxJson({ data }) {
  const tokens = tokenize(data);
  const lines = [[]];
  tokens.forEach(tok => {
    if (tok.t === "indent") {
      lines.push([]);
      for (let i = 0; i < tok.v; i++) lines[lines.length-1].push({ t: "space", v: "  " });
    } else {
      lines[lines.length-1].push(tok);
    }
  });

  return (
    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, lineHeight: 1.8 }}>
      {lines.map((line, li) => (
        <div key={li}>
          {line.map((tok, ti) => (
            <span key={ti} style={{ color: TOKEN_COLORS[tok.t] || "#888" }}>
              {tok.v}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

const C = {
  bg:      "#05050b",
  surface: "#080810",
  card:    "#0c0c18",
  border:  "#13131f",
  text:    "#5858a0",
  bright:  "#c0c0e0",
  muted:   "#28284a",
  ALPHA:   "#60a5fa",
  BETA:    "#a78bfa",
};

export default function AgentToAgent() {
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [visible, setVisible] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showGloss, setShowGloss] = useState(false);
  const [speed, setSpeed] = useState(1);
  const timerRef = useRef([]);
  const bottomRef = useRef(null);
  const scenario = SCENARIOS[scenarioIdx];

  const clearTimers = () => {
    timerRef.current.forEach(clearTimeout);
    timerRef.current = [];
  };

  const reset = useCallback(() => {
    clearTimers();
    setVisible([]);
    setSelected(null);
    setPlaying(false);
  }, []);

  const play = useCallback(() => {
    reset();
    setPlaying(true);
    scenario.messages.forEach((msg, i) => {
      const t = setTimeout(() => {
        setVisible(prev => [...prev, i]);
        if (i === scenario.messages.length - 1) setPlaying(false);
      }, (msg.delay / speed) + 100);
      timerRef.current.push(t);
    });
  }, [scenario, speed, reset]);

  useEffect(() => { reset(); }, [scenarioIdx]);
  useEffect(() => {
    if (bottomRef.current && visible.length > 0) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [visible.length]);

  const totalBytes = visible.reduce((sum, i) => {
    return sum + JSON.stringify(scenario.messages[i].packet).length;
  }, 0);

  const nlEquiv = visible.length > 0
    ? scenario.messages[scenario.messages.length - 1]?.packet?.token_cost?.natural_language_equivalent || 0
    : 0;

  const compression = visible.includes(scenario.messages.length - 1) && nlEquiv > 0
    ? (nlEquiv / totalBytes).toFixed(1)
    : null;

  return (
    <div style={{
      fontFamily: "'DM Mono', monospace",
      background: C.bg, minHeight: "100vh", color: C.text,
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Mono:ital,wght@0,300;0,400;1,300&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{
        borderBottom: `1px solid ${C.border}`,
        padding: "12px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "rgba(3,3,9,0.97)",
        position: "sticky", top: 0, zIndex: 10,
        backdropFilter: "blur(12px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{
            fontSize: 13, fontWeight: 800, letterSpacing: "0.2em",
            color: "#d0d0f0", fontFamily: "'Syne', sans-serif",
          }}>STP</span>
          <span style={{ fontSize: 10, color: C.muted, letterSpacing: "0.15em" }}>
            AGENT·TO·AGENT / v0.1
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Speed */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 9, color: C.muted }}>
            <span>SPEED</span>
            {[1, 2, 4].map(s => (
              <button key={s} onClick={() => setSpeed(s)} style={{
                background: speed === s ? "rgba(96,165,250,0.15)" : "transparent",
                border: `1px solid ${speed === s ? C.ALPHA + "40" : C.border}`,
                color: speed === s ? C.ALPHA : C.muted,
                padding: "3px 8px", borderRadius: 3, cursor: "pointer",
                fontSize: 9, fontFamily: "inherit",
              }}>{s}×</button>
            ))}
          </div>

          {/* Gloss toggle */}
          <button onClick={() => setShowGloss(g => !g)} style={{
            background: showGloss ? "rgba(251,146,60,0.12)" : "transparent",
            border: `1px solid ${showGloss ? "#fb923c40" : C.border}`,
            color: showGloss ? "#fb923c" : C.muted,
            padding: "4px 10px", borderRadius: 4, cursor: "pointer",
            fontSize: 9, letterSpacing: "0.1em", fontFamily: "inherit",
          }}>
            {showGloss ? "HIDE GLOSS" : "SHOW GLOSS"}
          </button>

          {/* Play / Reset */}
          <button onClick={playing ? reset : play} style={{
            background: playing
              ? "rgba(244,63,94,0.1)"
              : "rgba(52,211,153,0.1)",
            border: `1px solid ${playing ? "#f43f5e40" : "#34d39940"}`,
            color: playing ? "#f43f5e" : "#34d399",
            padding: "5px 14px", borderRadius: 4, cursor: "pointer",
            fontSize: 10, letterSpacing: "0.12em", fontFamily: "inherit",
          }}>
            {playing ? "◼ STOP" : visible.length > 0 ? "↺ REPLAY" : "▶ PLAY"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", height: "calc(100vh - 49px)", overflow: "hidden" }}>

        {/* Left — scenario selector + stats */}
        <div style={{
          width: 220, borderRight: `1px solid ${C.border}`,
          overflowY: "auto", padding: "14px 10px",
          background: "rgba(3,3,8,0.7)",
          display: "flex", flexDirection: "column", gap: 3,
        }}>
          <div style={{ fontSize: 8, letterSpacing: "0.2em", color: C.muted, marginBottom: 8 }}>
            SCENARIOS
          </div>

          {SCENARIOS.map((s, i) => (
            <div
              key={s.id}
              onClick={() => setScenarioIdx(i)}
              style={{
                padding: "9px 10px", borderRadius: 5, cursor: "pointer",
                background: scenarioIdx === i ? C.surface : "transparent",
                border: `1px solid ${scenarioIdx === i ? C.border : "transparent"}`,
                marginBottom: 4, transition: "all 0.15s",
              }}
            >
              <div style={{ fontSize: 9, color: C.muted, marginBottom: 3 }}>{s.id}</div>
              <div style={{
                fontSize: 10,
                color: scenarioIdx === i ? C.bright : C.text,
                lineHeight: 1.4,
              }}>{s.title}</div>
              <div style={{ fontSize: 8, color: C.muted, marginTop: 3 }}>
                {s.messages.length} packets
              </div>
            </div>
          ))}

          <div style={{ marginTop: 16, borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
            <div style={{ fontSize: 8, letterSpacing: "0.15em", color: C.muted, marginBottom: 10 }}>
              SESSION STATS
            </div>
            {[
              { label: "PACKETS SENT", val: visible.length },
              { label: "BYTES TRANSFERRED", val: totalBytes > 0 ? `${totalBytes}B` : "—" },
              { label: "NL EQUIVALENT", val: nlEquiv > 0 ? `~${nlEquiv} tokens` : "—" },
              { label: "COMPRESSION", val: compression ? `${compression}×` : "—", color: compression ? "#34d399" : C.muted },
            ].map((s, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 8, color: C.muted, letterSpacing: "0.1em", marginBottom: 3 }}>
                  {s.label}
                </div>
                <div style={{
                  fontSize: 14, fontWeight: 800,
                  color: s.color || C.bright,
                  fontFamily: "'Syne', sans-serif",
                }}>{s.val}</div>
              </div>
            ))}
          </div>

          {/* Agent legend */}
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14, marginTop: 4 }}>
            {Object.values(AGENTS).map(a => (
              <div key={a.id} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: a.color, boxShadow: `0 0 4px ${a.color}`,
                  }} />
                  <span style={{ fontSize: 10, color: a.color, fontWeight: 700 }}>{a.label}</span>
                </div>
                <div style={{ fontSize: 8, color: C.muted }}>{a.role}</div>
                <div style={{ fontSize: 8, color: C.muted, lineHeight: 1.5 }}>{a.description}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Center — message stream */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px" }}>
          {visible.length === 0 && !playing && (
            <div style={{
              padding: "80px 20px", textAlign: "center",
              color: C.muted, fontSize: 11, letterSpacing: "0.1em",
            }}>
              <div style={{ marginBottom: 10 }}>{scenario.description}</div>
              <div style={{ fontSize: 9 }}>PRESS PLAY TO BEGIN</div>
            </div>
          )}

          {scenario.messages.map((msg, i) => {
            if (!visible.includes(i)) return null;
            const agent = AGENTS[msg.from];
            const isAlpha = msg.from === "ALPHA";
            const mt = MSG_TYPES[msg.type];
            const isSelected = selected === i;

            return (
              <div
                key={i}
                onClick={() => setSelected(isSelected ? null : i)}
                style={{
                  display: "flex",
                  flexDirection: isAlpha ? "row" : "row-reverse",
                  gap: 10, marginBottom: 12,
                  animation: "fadeSlide 0.35s ease forwards",
                  cursor: "pointer",
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                  background: agent.color + "15",
                  border: `1px solid ${agent.color}35`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9, fontWeight: 800, color: agent.color,
                  letterSpacing: "0.05em", marginTop: 2,
                }}>{agent.label.slice(0, 1)}</div>

                {/* Bubble */}
                <div style={{
                  maxWidth: "78%",
                  background: isSelected ? C.card : C.surface,
                  border: `1px solid ${isSelected ? agent.color + "35" : C.border}`,
                  borderRadius: 8,
                  borderTopLeftRadius: isAlpha ? 2 : 8,
                  borderTopRightRadius: isAlpha ? 8 : 2,
                  overflow: "hidden",
                  transition: "all 0.2s",
                }}>
                  {/* Header */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "7px 12px",
                    background: agent.color + "0a",
                    borderBottom: `1px solid ${C.border}`,
                  }}>
                    <span style={{ fontSize: 9, color: agent.color, fontWeight: 700 }}>
                      {agent.label}
                    </span>
                    <span style={{ fontSize: 9, color: C.muted }}>→</span>
                    <span style={{ fontSize: 9, color: AGENTS[msg.from === "ALPHA" ? "BETA" : "ALPHA"].color }}>
                      {msg.from === "ALPHA" ? "BETA" : "ALPHA"}
                    </span>
                    <div style={{
                      marginLeft: 4,
                      fontSize: 8, padding: "1px 7px",
                      background: mt.color + "15",
                      border: `1px solid ${mt.color}30`,
                      borderRadius: 3, color: mt.color,
                      letterSpacing: "0.1em",
                    }}>
                      {mt.icon} {msg.type}
                    </div>
                    <span style={{ marginLeft: "auto", fontSize: 8, color: C.muted }}>
                      {JSON.stringify(msg.packet).length}B
                    </span>
                  </div>

                  {/* Packet */}
                  <div style={{ padding: "10px 12px" }}>
                    <SyntaxJson data={msg.packet} />
                  </div>

                  {/* Human gloss */}
                  {showGloss && (
                    <div style={{
                      padding: "7px 12px",
                      borderTop: `1px solid ${C.border}`,
                      background: "#fb923c08",
                      fontSize: 9, color: "#fb923c",
                      fontStyle: "italic", lineHeight: 1.6,
                    }}>
                      ◈ gloss: {msg.human_gloss}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {playing && (
            <div style={{
              display: "flex", gap: 5, padding: "10px 52px",
              alignItems: "center",
            }}>
              {[0,1,2].map(i => (
                <div key={i} style={{
                  width: 5, height: 5, borderRadius: "50%",
                  background: C.ALPHA,
                  animation: `pulse 0.8s ease-in-out ${i * 0.2}s infinite alternate`,
                }} />
              ))}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Right — detail panel */}
        <div style={{
          width: 280, borderLeft: `1px solid ${C.border}`,
          overflowY: "auto", padding: "14px",
          background: "rgba(3,3,8,0.6)",
        }}>
          <div style={{ fontSize: 8, letterSpacing: "0.2em", color: C.muted, marginBottom: 12 }}>
            {selected !== null ? "PACKET DETAIL" : "PROTOCOL GUIDE"}
          </div>

          {selected === null && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {Object.entries(MSG_TYPES).map(([type, meta]) => (
                <div key={type} style={{
                  padding: "8px 10px",
                  background: C.surface, border: `1px solid ${C.border}`,
                  borderRadius: 5,
                  borderLeft: `2px solid ${meta.color}`,
                }}>
                  <div style={{
                    fontSize: 10, color: meta.color,
                    fontWeight: 700, marginBottom: 3,
                  }}>
                    {meta.icon} {type}
                  </div>
                  <div style={{ fontSize: 9, color: C.text, lineHeight: 1.5 }}>
                    {{
                      QUERY:    "Request information about a concept or relation. Specifies confidence threshold.",
                      ASSERT:   "Declare a claim with confidence, conditions, and provenance.",
                      CHALLENGE:"Dispute a claim. Includes reason code and counter-evidence.",
                      RESOLVE:  "Provide resolution to a challenge. May revise original assertion.",
                      DELEGATE: "Hand off a subtask. Includes deadline and expected return schema.",
                      ACK:      "Minimal acknowledgment. No natural language content.",
                      REJECT:   "Cannot satisfy request. Reason code only, no explanation.",
                      COMPLETE: "Task done. Structured result + compression ratio.",
                    }[type]}
                  </div>
                </div>
              ))}

              <div style={{
                marginTop: 8, padding: "10px 12px",
                background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: 5, fontSize: 9, color: C.text, lineHeight: 1.7,
              }}>
                <div style={{ color: C.bright, fontWeight: 700, marginBottom: 6 }}>
                  Zero natural language.
                </div>
                Every message is typed, structured, machine-parseable. No ambiguity. No token waste on prose. Agents negotiate meaning through the protocol — not through conversation.
              </div>
            </div>
          )}

          {selected !== null && (() => {
            const msg = scenario.messages[selected];
            const agent = AGENTS[msg.from];
            const mt = MSG_TYPES[msg.type];
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{
                  background: C.surface, border: `1px solid ${agent.color}25`,
                  borderRadius: 6, padding: "10px 12px",
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: agent.color, marginBottom: 4 }}>
                    {agent.label} · {msg.type}
                  </div>
                  <div style={{
                    display: "flex", gap: 6, fontSize: 8,
                    color: C.muted, flexWrap: "wrap",
                  }}>
                    <span>size: {JSON.stringify(msg.packet).length}B</span>
                    <span>·</span>
                    <span>delay: {msg.delay}ms</span>
                    <span>·</span>
                    <span>keys: {Object.keys(msg.packet).length}</span>
                  </div>
                </div>

                {/* Full packet */}
                <div style={{
                  background: "#040408", border: `1px solid ${C.border}`,
                  borderRadius: 5, padding: "10px 12px",
                }}>
                  <SyntaxJson data={msg.packet} />
                </div>

                {/* Gloss */}
                <div style={{
                  background: "#fb923c08", border: "1px solid #fb923c20",
                  borderRadius: 5, padding: "10px 12px",
                  fontSize: 9, color: "#fb923c", lineHeight: 1.7,
                  fontStyle: "italic",
                }}>
                  <div style={{ color: "#fb923c99", fontSize: 8, marginBottom: 4, fontStyle: "normal" }}>
                    HUMAN TRANSLATION
                  </div>
                  {msg.human_gloss}
                </div>

                {/* Message type explanation */}
                <div style={{
                  background: C.surface, border: `1px solid ${mt.color}20`,
                  borderRadius: 5, padding: "10px 12px",
                  borderLeft: `2px solid ${mt.color}`,
                }}>
                  <div style={{ fontSize: 9, color: mt.color, fontWeight: 700, marginBottom: 4 }}>
                    {mt.icon} {msg.type}
                  </div>
                  <div style={{ fontSize: 9, color: C.text, lineHeight: 1.6 }}>
                    {{
                      QUERY:    "Requesting information. The confidence_threshold field tells BETA what minimum confidence ALPHA will accept.",
                      ASSERT:   "Declaring a claim. Confidence, conditions, and provenance are machine-readable — no explanation needed.",
                      CHALLENGE:"Disputing. reason_code tells the other agent exactly why. No ambiguous natural language.",
                      RESOLVE:  "Resolving a challenge. May include revised assertion with updated confidence or conditions.",
                      DELEGATE: "Handing off. deadline_ms creates a time contract. expected_return defines the schema.",
                      ACK:      "Minimal confirmation. The entire value is in the structure — no words.",
                      REJECT:   "Hard refusal. reason_code is machine-actionable — the requesting agent can route around it.",
                      COMPLETE: "Task closed. Compression ratio shows how much more efficient STP was vs natural language equivalent.",
                    }[msg.type]}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      <style>{`
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          from { opacity: 0.2; transform: scale(0.85); }
          to   { opacity: 1;   transform: scale(1.1); }
        }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #14142a; border-radius: 2px; }
        button:hover { opacity: 0.8; }
      `}</style>
    </div>
  );
}
