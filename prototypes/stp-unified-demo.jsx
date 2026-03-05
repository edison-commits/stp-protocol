import { useState, useEffect, useRef, useCallback } from "react";

// ─── STP UNIFIED DEMO ────────────────────────────────────────────────────────
//
// One agent. One task. Every layer of the protocol firing in sequence.
// Registry → Confidence → Conflict → Action → A2A → Complete.
//
// This is what STP looks like end-to-end.

// ─── PIPELINE STAGES ─────────────────────────────────────────────────────────

const TASKS = [
  {
    id: "task_001",
    label: "Find and purchase the best running shoe under $150",
    agent: "ATLAS",
    domain: "shop.stp.dev",
  },
  {
    id: "task_002",
    label: "Assess whether transformer-based LLMs support autonomous agent deployment",
    agent: "ATLAS",
    domain: "docs.stp.dev",
  },
  {
    id: "task_003",
    label: "Build a knowledge graph for the concept of 'attention mechanism'",
    agent: "ATLAS",
    domain: "api.stp.dev",
  },
];

function buildPipeline(task) {
  if (task.id === "task_001") return [
    {
      id: "p1", layer: "PAGE READ", icon: "◈",
      color: "#60a5fa",
      title: "Reading STP block from shop.stp.dev",
      detail: "Agent fetches page. Finds <script type=\"application/stp+json\">. Skips 4,200 bytes of HTML/CSS/JS.",
      duration: 800,
      output: { stp_block_found: true, html_skipped_bytes: 4218, actions_declared: 5, concepts_declared: 2 },
    },
    {
      id: "p2", layer: "REGISTRY", icon: "⬡",
      color: "#a78bfa",
      title: "Resolving concepts against canonical registry",
      detail: "Resolving 2 concept refs. Checking aliases. Loading pre-defined relations.",
      duration: 600,
      output: {
        resolved: [
          { alias: "product_catalog", canonical: "stp:commerce.001", relations: 3 },
          { alias: "shopping_cart",   canonical: "stp:commerce.002", relations: 2 },
        ],
      },
    },
    {
      id: "p3", layer: "CONFIDENCE", icon: "◎",
      color: "#34d399",
      title: "Propagating confidence through citation chain",
      detail: "4 product claims. Checking provenance depth. Applying age and domain decay.",
      duration: 700,
      output: {
        claims_evaluated: 4,
        highest: { claim: "Ultralight Runner X9 — best in category", conf: 0.91 },
        lowest:  { claim: "Speed Demon Elite — durability rating", conf: 0.63 },
        avg_confidence: 0.79,
      },
    },
    {
      id: "p4", layer: "CONFLICT", icon: "⚡",
      color: "#fb923c",
      title: "Checking for contradictory assertions",
      detail: "Scanning 4 claims for conflicts. Checking against session knowledge graph.",
      duration: 500,
      output: {
        conflicts_found: 1,
        conflict: { concept: "running_shoe_sizing", status: "RESOLVED", winner: "manufacturer_spec", decisive_on: "Domain Authority" },
      },
    },
    {
      id: "p5", layer: "SECURITY", icon: "◼",
      color: "#34d399",
      title: "Running action security pipeline",
      detail: "Signature verify → Injection scan → Domain allowlist → Scope check → Gate check.",
      duration: 600,
      output: {
        steps: [
          { id: "SIG",  pass: true,  label: "Ed25519 verified · key_id: stp-2026-03" },
          { id: "SAN",  pass: true,  label: "Clean — no injection patterns" },
          { id: "DOM",  pass: true,  label: "shop.stp.dev verified · ecommerce" },
          { id: "SCP",  pass: true,  label: "Scope [read_catalog, write_cart, initiate_payment] OK" },
          { id: "GATE", pass: true,  label: "checkout.confirm — GATE REQUIRED", gated: true },
        ],
      },
    },
    {
      id: "p6", layer: "ACTION", icon: "→",
      color: "#60a5fa",
      title: "Executing action sequence via STP manifests",
      detail: "catalog.search → cart.add → checkout.initiate. No DOM. No browser. Direct API calls.",
      duration: 1100,
      output: {
        actions_executed: [
          { id: "catalog.search",   status: "OK", ms: 43,  result: "3 products found" },
          { id: "cart.add",         status: "OK", ms: 38,  result: "Ultralight Runner X9 added" },
          { id: "checkout.initiate",status: "OK", ms: 51,  result: "Session sess_xyz789 created · total $140.91" },
        ],
        browser_automation_equivalent_ms: 8400,
        stp_execution_ms: 132,
      },
    },
    {
      id: "p7", layer: "HUMAN GATE", icon: "⚠",
      color: "#facc15",
      title: "Pausing for human confirmation",
      detail: "checkout.confirm requires explicit human approval. Agent presents summary and waits.",
      duration: 0,
      gate: true,
      output: {
        action: "checkout.confirm",
        summary: "Pay $140.91 to shop.stp.dev",
        items: ["Ultralight Runner X9 — Blue / Size 10 × 1"],
        payment: "Visa ···4242",
        irreversible: true,
      },
    },
    {
      id: "p8", layer: "COMPLETE", icon: "◆",
      color: "#34d399",
      title: "Task complete",
      detail: "Order confirmed. Result structured in STP form. Session knowledge graph updated.",
      duration: 400,
      output: {
        order_id: "ord_00441",
        status: "confirmed",
        total: 140.91,
        estimated_delivery: "2026-03-08",
        protocol_stats: {
          html_bytes_read: 0,
          stp_bytes_processed: 847,
          api_calls: 4,
          browser_renders: 0,
          total_ms: 3200,
          vs_browser_automation_ms: 11400,
          speedup: "3.6×",
        },
      },
    },
  ];

  if (task.id === "task_002") return [
    {
      id: "p1", layer: "PAGE READ", icon: "◈", color: "#60a5fa",
      title: "Reading STP block from docs.stp.dev",
      detail: "Skipping 2,800 bytes of HTML. Parsing semantic layer directly.",
      duration: 700,
      output: { stp_block_found: true, html_skipped_bytes: 2803, concepts_declared: 3, relations_declared: 7 },
    },
    {
      id: "p2", layer: "REGISTRY", icon: "⬡", color: "#a78bfa",
      title: "Resolving 3 concepts: transformer, LLM, agent",
      detail: "Loading canonical IDs, pre-existing relations, and domain taxonomies.",
      duration: 500,
      output: {
        resolved: [
          { alias: "transformer",         canonical: "stp:ai.ml.004", relations: 5 },
          { alias: "large_language_model", canonical: "stp:ai.ml.006", relations: 8 },
          { alias: "agent",               canonical: "stp:ai.agents.001", relations: 6 },
        ],
      },
    },
    {
      id: "p3", layer: "CONFIDENCE", icon: "◎", color: "#34d399",
      title: "Propagating confidence across 7 declared relations",
      detail: "Checking citation chains. Applying domain + recency decay.",
      duration: 800,
      output: {
        claims_evaluated: 7,
        highest: { claim: "transformer requires attention_mechanism", conf: 0.99 },
        lowest:  { claim: "LLM supports autonomous_agent (unconditioned)", conf: 0.58 },
        avg_confidence: 0.84,
      },
    },
    {
      id: "p4", layer: "CONFLICT", icon: "⚡", color: "#fb923c",
      title: "Conflict detected: LLM → agent relation",
      detail: "Two sources disagree on whether LLM supports autonomous agent deployment.",
      duration: 700,
      output: {
        conflicts_found: 1,
        conflict: {
          concept: "large_language_model → agent",
          status: "RESOLVED",
          winner: "conditional_support_study_2025",
          decisive_on: "Confidence Delta",
          accepted_conf: 0.85,
          conditions: ["tool_use_enabled","context_window_gte_128k","reasoning_model","memory_augmented"],
        },
      },
    },
    {
      id: "p5", layer: "A2A QUERY", icon: "⇄", color: "#a78bfa",
      title: "Delegating sub-query to BETA via A2A",
      detail: "ATLAS queries BETA for corroborating sources. BETA asserts. ATLAS challenges. BETA resolves.",
      duration: 1200,
      output: {
        packets_exchanged: 4,
        types: ["QUERY","ASSERT","CHALLENGE","RESOLVE"],
        final_confidence: 0.87,
        bytes: 312,
        nl_equivalent_tokens: 847,
        compression: "2.7×",
      },
    },
    {
      id: "p6", layer: "COMPLETE", icon: "◆", color: "#34d399",
      title: "Assessment complete",
      detail: "Verdict stored in session knowledge graph. Conditions logged.",
      duration: 400,
      output: {
        verdict: "CONDITIONALLY_SUPPORTED",
        confidence: 0.87,
        key_relation: "stp:ai.ml.006 --[supports:0.87]--> stp:ai.agents.001",
        required_conditions: ["tool_use_enabled","context_window_gte_128k","reasoning_model","memory_augmented"],
        protocol_stats: {
          html_bytes_read: 0,
          stp_bytes_processed: 621,
          a2a_packets: 4,
          total_ms: 3800,
          vs_llm_extraction_ms: 14200,
          speedup: "3.7×",
        },
      },
    },
  ];

  // task_003
  return [
    {
      id: "p1", layer: "PAGE READ", icon: "◈", color: "#60a5fa",
      title: "Reading STP block from api.stp.dev",
      detail: "Skipping HTML. Parsing semantic layer. Loading schema manifest.",
      duration: 600,
      output: { stp_block_found: true, concepts_declared: 4, actions_declared: 3 },
    },
    {
      id: "p2", layer: "REGISTRY", icon: "⬡", color: "#a78bfa",
      title: "Seeding graph from registry: attention_mechanism",
      detail: "Loading concept + all pre-defined relations at depth 2.",
      duration: 500,
      output: {
        seed: "stp:ai.ml.005 (attention_mechanism)",
        depth_1_relations: 3,
        depth_2_relations: 6,
        total_nodes_loaded: 8,
      },
    },
    {
      id: "p3", layer: "A2A BULK", icon: "⇄", color: "#a78bfa",
      title: "Requesting bulk assertions from BETA via A2A",
      detail: "ATLAS fires QUERY. BETA responds with 2 bulk ASSERT packets. ATLAS integrates.",
      duration: 1000,
      output: {
        packets_exchanged: 3,
        assertions_received: 9,
        types: ["QUERY","ASSERT×2"],
        bytes: 481,
        compression: "2.8×",
      },
    },
    {
      id: "p4", layer: "CONFIDENCE", icon: "◎", color: "#34d399",
      title: "Propagating confidence across 9 new relations",
      detail: "Applying hop decay, age decay, corroboration boost.",
      duration: 600,
      output: {
        claims_evaluated: 9,
        highest: { claim: "attention_mechanism supports transformer", conf: 0.99 },
        lowest:  { claim: "LLM supports agent (unconditioned)", conf: 0.61 },
        corrections_needed: 1,
      },
    },
    {
      id: "p5", layer: "CONFLICT", icon: "⚡", color: "#fb923c",
      title: "Correcting cross-session conflict: LLM→agent",
      detail: "ATLAS detects assertion contradicts s001 resolution. Challenges BETA. Corrected.",
      duration: 700,
      output: {
        conflicts_found: 1,
        conflict: {
          concept: "LLM → agent (unconditioned 0.90)",
          status: "CORRECTED",
          correction: "Applied conditions from session s001 → 0.85 conditional",
          session_ref: "s001",
        },
      },
    },
    {
      id: "p6", layer: "COMPLETE", icon: "◆", color: "#34d399",
      title: "Knowledge graph complete",
      detail: "8 nodes, 9 relations, 1 correction. Graph ready for agent reasoning.",
      duration: 400,
      output: {
        nodes: 8,
        relations: 9,
        corrections: 1,
        graph_density: "high",
        protocol_stats: {
          stp_bytes_processed: 761,
          a2a_packets: 3,
          total_ms: 3400,
          vs_web_scraping_ms: 22000,
          speedup: "6.5×",
        },
      },
    },
  ];
}

// ─── COLORS ──────────────────────────────────────────────────────────────────
const C = {
  bg:      "#04040a",
  surface: "#070710",
  card:    "#0a0a18",
  border:  "#111120",
  text:    "#50508a",
  bright:  "#c0c0e8",
  muted:   "#252540",
  dim:     "#1a1a30",
};

function SyntaxValue({ v, depth = 0 }) {
  if (v === null || v === undefined) return <span style={{ color: "#f43f5e" }}>null</span>;
  if (typeof v === "boolean") return <span style={{ color: "#a78bfa" }}>{String(v)}</span>;
  if (typeof v === "number")  return <span style={{ color: "#34d399" }}>{v}</span>;
  if (typeof v === "string")  return <span style={{ color: "#fb923c" }}>"{v}"</span>;
  if (Array.isArray(v)) {
    if (v.length === 0) return <span style={{ color: "#5a5a80" }}>[]</span>;
    return (
      <span>
        <span style={{ color: "#5a5a80" }}>{"["}</span>
        {v.map((item, i) => (
          <span key={i}>
            <br />{" ".repeat((depth+1)*2)}
            <SyntaxValue v={item} depth={depth+1} />
            {i < v.length - 1 && <span style={{ color: "#252540" }}>,</span>}
          </span>
        ))}
        <br />{" ".repeat(depth*2)}<span style={{ color: "#5a5a80" }}>{"]"}</span>
      </span>
    );
  }
  if (typeof v === "object") {
    const entries = Object.entries(v);
    if (entries.length === 0) return <span style={{ color: "#5a5a80" }}>{"{}"}</span>;
    return (
      <span>
        <span style={{ color: "#5a5a80" }}>{"{"}</span>
        {entries.map(([k, val], i) => (
          <span key={k}>
            <br />{" ".repeat((depth+1)*2)}
            <span style={{ color: "#60a5fa" }}>"{k}"</span>
            <span style={{ color: "#252540" }}>: </span>
            <SyntaxValue v={val} depth={depth+1} />
            {i < entries.length - 1 && <span style={{ color: "#252540" }}>,</span>}
          </span>
        ))}
        <br />{" ".repeat(depth*2)}<span style={{ color: "#5a5a80" }}>{"}"}</span>
      </span>
    );
  }
  return <span style={{ color: "#888" }}>{String(v)}</span>;
}

function StageNode({ stage, status, onClick, selected }) {
  // status: idle | active | done | gate
  const sc = stage.color;
  const isDone   = status === "done";
  const isActive = status === "active";
  const isGate   = status === "gate";
  const isIdle   = status === "idle";

  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", alignItems: "flex-start", gap: 0,
        cursor: isDone ? "pointer" : "default",
        opacity: isIdle ? 0.35 : 1,
        transition: "opacity 0.4s",
      }}
    >
      {/* Spine */}
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        width: 40, flexShrink: 0,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
          background: isDone ? sc + "20" : isActive ? sc + "18" : C.muted + "30",
          border: `1.5px solid ${isDone || isActive || isGate ? sc + "50" : C.border}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, color: isDone ? sc : isActive ? sc : C.muted,
          boxShadow: isActive ? `0 0 16px ${sc}30` : "none",
          transition: "all 0.4s",
          animation: isActive ? "breathe 1.5s ease-in-out infinite" : "none",
        }}>
          {isDone ? "✓" : stage.icon}
        </div>
      </div>

      {/* Content */}
      <div style={{
        flex: 1, paddingBottom: 20,
        borderLeft: `1px solid ${isDone ? sc + "25" : C.border}`,
        paddingLeft: 14, marginLeft: -1,
        marginTop: 6,
        transition: "border-color 0.4s",
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8, marginBottom: 4,
        }}>
          <span style={{
            fontSize: 8, padding: "1px 7px",
            background: (isDone || isActive) ? sc + "12" : C.muted + "20",
            border: `1px solid ${(isDone || isActive) ? sc + "30" : C.border}`,
            borderRadius: 3, color: (isDone || isActive) ? sc : C.muted,
            letterSpacing: "0.1em",
            transition: "all 0.4s",
          }}>{stage.layer}</span>
          {isActive && (
            <span style={{
              fontSize: 8, color: sc,
              animation: "blink 1s ease-in-out infinite",
            }}>PROCESSING</span>
          )}
          {isGate && (
            <span style={{
              fontSize: 8, color: "#facc15",
              animation: "blink 0.8s ease-in-out infinite",
            }}>WAITING FOR HUMAN</span>
          )}
        </div>

        <div style={{
          fontSize: 12, fontWeight: 700, color: isDone ? C.bright : isActive ? C.bright : C.text,
          fontFamily: "'Syne', sans-serif", marginBottom: 3, lineHeight: 1.3,
          transition: "color 0.4s",
        }}>{stage.title}</div>

        <div style={{ fontSize: 9, color: C.text, lineHeight: 1.6 }}>
          {stage.detail}
        </div>

        {/* Output panel — shown when done and selected */}
        {isDone && selected && (
          <div style={{
            marginTop: 10,
            background: "#040408",
            border: `1px solid ${sc}20`,
            borderRadius: 5, padding: "10px 12px",
            animation: "fadeIn 0.3s ease",
          }}>
            <div style={{ fontSize: 8, color: sc, letterSpacing: "0.15em", marginBottom: 8 }}>
              OUTPUT
            </div>
            <pre style={{
              fontSize: 9, margin: 0, lineHeight: 1.8,
              fontFamily: "'DM Mono', monospace",
            }}>
              <SyntaxValue v={stage.output} />
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default function UnifiedDemo() {
  const [taskIdx, setTaskIdx]         = useState(0);
  const [running, setRunning]         = useState(false);
  const [stageIdx, setStageIdx]       = useState(-1);
  const [done, setDone]               = useState([]);
  const [selected, setSelected]       = useState(null);
  const [gateConfirmed, setGateConfirmed] = useState(false);
  const [complete, setComplete]       = useState(false);
  const timers = useRef([]);

  const task     = TASKS[taskIdx];
  const pipeline = buildPipeline(task);

  const clearAll = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const reset = useCallback(() => {
    clearAll();
    setRunning(false);
    setStageIdx(-1);
    setDone([]);
    setSelected(null);
    setGateConfirmed(false);
    setComplete(false);
  }, []);

  const run = useCallback(() => {
    reset();
    setRunning(true);

    let cursor = 0;
    let elapsed = 300;

    const advance = (idx) => {
      setStageIdx(idx);
      const stage = pipeline[idx];

      if (stage.gate) {
        // Pause here — wait for gate confirmation
        return;
      }

      const t = setTimeout(() => {
        setDone(prev => [...prev, idx]);
        if (idx < pipeline.length - 1) {
          const nt = setTimeout(() => advance(idx + 1), 200);
          timers.current.push(nt);
        } else {
          setRunning(false);
          setComplete(true);
        }
      }, stage.duration || 600);
      timers.current.push(t);
    };

    const t0 = setTimeout(() => advance(0), 300);
    timers.current.push(t0);
  }, [pipeline, reset]);

  // Gate confirmation
  const confirmGate = useCallback(() => {
    setGateConfirmed(true);
    const gateIdx = stageIdx;
    const t = setTimeout(() => {
      setDone(prev => [...prev, gateIdx]);
      if (gateIdx < pipeline.length - 1) {
        setTimeout(() => {
          setStageIdx(gateIdx + 1);
          const stage = pipeline[gateIdx + 1];
          setTimeout(() => {
            setDone(prev => [...prev, gateIdx + 1]);
            setRunning(false);
            setComplete(true);
          }, stage.duration || 600);
        }, 200);
      }
    }, 400);
    timers.current.push(t);
  }, [stageIdx, pipeline]);

  useEffect(() => { reset(); }, [taskIdx]);

  const isGateStage = stageIdx >= 0 && pipeline[stageIdx]?.gate && !done.includes(stageIdx);

  // Compute live stats
  const completedStages = done.length;
  const lastComplete = done.length > 0 ? pipeline[done[done.length - 1]] : null;
  const finalStats = complete && lastComplete?.output?.protocol_stats;

  return (
    <div style={{
      fontFamily: "'DM Mono', monospace",
      background: C.bg, minHeight: "100vh", color: C.text,
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Mono:ital,wght@0,300;0,400;1,300&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{
        borderBottom: `1px solid ${C.border}`,
        padding: "12px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "rgba(2,2,8,0.98)",
        position: "sticky", top: 0, zIndex: 20,
        backdropFilter: "blur(16px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div>
            <span style={{
              fontSize: 15, fontWeight: 800, letterSpacing: "0.25em",
              color: "#e0e0f8", fontFamily: "'Syne', sans-serif",
            }}>STP</span>
            <span style={{
              fontSize: 9, letterSpacing: "0.15em", color: C.muted, marginLeft: 10,
            }}>UNIFIED PROTOCOL DEMO</span>
          </div>
          <div style={{
            width: 1, height: 20, background: C.border,
          }} />
          <div style={{
            fontSize: 9, color: C.text,
          }}>
            REGISTRY · CONFIDENCE · CONFLICT · ACTION · A2A
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {complete && (
            <div style={{
              fontSize: 9, padding: "3px 10px",
              background: "#34d39912",
              border: "1px solid #34d39930",
              borderRadius: 4, color: "#34d399",
              letterSpacing: "0.1em",
            }}>TASK COMPLETE</div>
          )}
          <button
            onClick={running ? reset : complete ? reset : run}
            style={{
              background: running
                ? "rgba(244,63,94,0.1)"
                : complete
                  ? "rgba(96,165,250,0.1)"
                  : "rgba(52,211,153,0.12)",
              border: `1px solid ${running ? "#f43f5e40" : complete ? "#60a5fa40" : "#34d39945"}`,
              color: running ? "#f43f5e" : complete ? "#60a5fa" : "#34d399",
              padding: "6px 16px", borderRadius: 5, cursor: "pointer",
              fontSize: 10, letterSpacing: "0.12em", fontFamily: "inherit",
            }}
          >
            {running ? "◼ STOP" : complete ? "↺ RESET" : "▶ RUN TASK"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", height: "calc(100vh - 49px)", overflow: "hidden" }}>

        {/* Left — task selector */}
        <div style={{
          width: 240, borderRight: `1px solid ${C.border}`,
          padding: "16px 12px", background: "rgba(2,2,7,0.8)",
          overflowY: "auto",
        }}>
          <div style={{ fontSize: 8, letterSpacing: "0.2em", color: C.muted, marginBottom: 12 }}>
            TASK QUEUE
          </div>
          {TASKS.map((t, i) => {
            const active = i === taskIdx;
            return (
              <div
                key={t.id}
                onClick={() => { if (!running) setTaskIdx(i); }}
                style={{
                  padding: "10px 12px", borderRadius: 6, marginBottom: 6,
                  background: active ? C.surface : "transparent",
                  border: `1px solid ${active ? C.border : "transparent"}`,
                  cursor: running ? "default" : "pointer",
                  opacity: running && !active ? 0.4 : 1,
                  transition: "all 0.2s",
                }}
              >
                <div style={{ fontSize: 8, color: C.muted, marginBottom: 4 }}>{t.id}</div>
                <div style={{
                  fontSize: 10, color: active ? C.bright : C.text, lineHeight: 1.5,
                }}>{t.label}</div>
                <div style={{ fontSize: 8, color: C.muted, marginTop: 4 }}>→ {t.domain}</div>
              </div>
            );
          })}

          {/* Live stats */}
          <div style={{
            marginTop: 20, borderTop: `1px solid ${C.border}`, paddingTop: 16,
          }}>
            <div style={{ fontSize: 8, letterSpacing: "0.2em", color: C.muted, marginBottom: 12 }}>
              LIVE METRICS
            </div>
            {[
              { label: "STAGES COMPLETE", val: `${completedStages} / ${pipeline.length}` },
              { label: "CURRENT LAYER",   val: stageIdx >= 0 ? pipeline[stageIdx]?.layer : "—" },
              { label: "STATUS",          val: complete ? "DONE" : running ? "RUNNING" : isGateStage ? "GATED" : "IDLE",
                color: complete ? "#34d399" : running ? "#60a5fa" : isGateStage ? "#facc15" : C.muted },
            ].map((s, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 8, color: C.muted, letterSpacing: "0.1em", marginBottom: 4 }}>
                  {s.label}
                </div>
                <div style={{
                  fontSize: 13, fontWeight: 800,
                  color: s.color || C.bright,
                  fontFamily: "'Syne', sans-serif",
                }}>{s.val}</div>
              </div>
            ))}
          </div>

          {/* Final stats */}
          {finalStats && (
            <div style={{
              borderTop: `1px solid #34d39920`, paddingTop: 14,
              animation: "fadeIn 0.5s ease",
            }}>
              <div style={{ fontSize: 8, letterSpacing: "0.15em", color: "#34d399", marginBottom: 10 }}>
                PROTOCOL PERFORMANCE
              </div>
              {Object.entries(finalStats).map(([k, v]) => (
                <div key={k} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 7, color: C.muted, letterSpacing: "0.08em", marginBottom: 2 }}>
                    {k.toUpperCase().replace(/_/g, " ")}
                  </div>
                  <div style={{
                    fontSize: 11, fontWeight: 800,
                    color: k === "speedup" ? "#34d399" : C.bright,
                    fontFamily: "'Syne', sans-serif",
                  }}>{v}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Center — pipeline */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>

          {/* Task header */}
          <div style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 8, padding: "16px 20px", marginBottom: 28,
          }}>
            <div style={{ fontSize: 8, letterSpacing: "0.2em", color: C.muted, marginBottom: 8 }}>
              ACTIVE TASK · {task.id}
            </div>
            <div style={{
              fontSize: 17, fontWeight: 800, color: C.bright,
              fontFamily: "'Syne', sans-serif", lineHeight: 1.35,
            }}>
              "{task.label}"
            </div>
            <div style={{ marginTop: 8, fontSize: 9, color: C.text, display: "flex", gap: 12 }}>
              <span>Agent: <span style={{ color: "#60a5fa" }}>{task.agent}</span></span>
              <span>·</span>
              <span>Domain: <span style={{ color: "#a78bfa" }}>{task.domain}</span></span>
              <span>·</span>
              <span>Layers: <span style={{ color: C.bright }}>{pipeline.length}</span></span>
            </div>
          </div>

          {/* Gate panel */}
          {isGateStage && (
            <div style={{
              background: "#facc1508",
              border: "1px solid #facc1530",
              borderRadius: 8, padding: "16px 20px", marginBottom: 20,
              animation: "fadeIn 0.35s ease",
            }}>
              <div style={{
                fontSize: 11, color: "#facc15", fontWeight: 700,
                letterSpacing: "0.1em", marginBottom: 8,
              }}>
                ⚠ HUMAN CONFIRMATION REQUIRED
              </div>
              <div style={{ fontSize: 9, color: C.text, lineHeight: 1.7, marginBottom: 12 }}>
                {pipeline[stageIdx]?.output && Object.entries(pipeline[stageIdx].output).map(([k, v]) => (
                  <div key={k}>
                    <span style={{ color: C.muted }}>{k}: </span>
                    <span style={{ color: C.bright }}>
                      {Array.isArray(v) ? v.join(", ") : String(v)}
                    </span>
                  </div>
                ))}
              </div>
              <button
                onClick={confirmGate}
                style={{
                  background: "#facc1515",
                  border: "1px solid #facc1540",
                  color: "#facc15", padding: "7px 18px",
                  borderRadius: 5, cursor: "pointer",
                  fontSize: 10, letterSpacing: "0.12em", fontFamily: "inherit",
                }}
              >
                CONFIRM — PROCEED
              </button>
            </div>
          )}

          {/* Pipeline stages */}
          <div style={{ paddingLeft: 4 }}>
            {pipeline.map((stage, i) => {
              let status = "idle";
              if (done.includes(i)) status = "done";
              else if (stageIdx === i) status = stage.gate ? "gate" : "active";

              return (
                <StageNode
                  key={stage.id}
                  stage={stage}
                  status={status}
                  selected={selected === i}
                  onClick={() => status === "done" && setSelected(selected === i ? null : i)}
                />
              );
            })}
          </div>
        </div>

        {/* Right — layer guide */}
        <div style={{
          width: 220, borderLeft: `1px solid ${C.border}`,
          padding: "16px 14px", background: "rgba(2,2,7,0.7)",
          overflowY: "auto",
        }}>
          <div style={{ fontSize: 8, letterSpacing: "0.2em", color: C.muted, marginBottom: 12 }}>
            PROTOCOL LAYERS
          </div>
          {[
            { layer: "PAGE READ",   color: "#60a5fa", desc: "Agent reads STP block. Skips HTML entirely." },
            { layer: "REGISTRY",    color: "#a78bfa", desc: "Concept aliases resolved to canonical IDs." },
            { layer: "CONFIDENCE",  color: "#34d399", desc: "Claims scored through citation chain." },
            { layer: "CONFLICT",    color: "#fb923c", desc: "Contradictions resolved deterministically." },
            { layer: "SECURITY",    color: "#34d399", desc: "5-step pipeline before any action fires." },
            { layer: "ACTION",      color: "#60a5fa", desc: "Direct API calls. No browser. No DOM." },
            { layer: "HUMAN GATE",  color: "#facc15", desc: "Irreversible actions require human approval." },
            { layer: "A2A QUERY",   color: "#a78bfa", desc: "Sub-tasks delegated via STP packets." },
            { layer: "A2A BULK",    color: "#a78bfa", desc: "Bulk assertions received from peer agent." },
            { layer: "COMPLETE",    color: "#34d399", desc: "Result structured. Graph updated." },
          ].map((l, i) => (
            <div key={i} style={{
              display: "flex", gap: 8, marginBottom: 10,
              alignItems: "flex-start",
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: "50%",
                background: l.color, flexShrink: 0, marginTop: 4,
                boxShadow: `0 0 4px ${l.color}60`,
              }} />
              <div>
                <div style={{ fontSize: 9, color: l.color, fontWeight: 700 }}>{l.layer}</div>
                <div style={{ fontSize: 8, color: C.muted, lineHeight: 1.5 }}>{l.desc}</div>
              </div>
            </div>
          ))}

          <div style={{
            marginTop: 16, borderTop: `1px solid ${C.border}`, paddingTop: 14,
            fontSize: 9, color: C.text, lineHeight: 1.7,
          }}>
            <div style={{ color: C.bright, fontWeight: 700, marginBottom: 6, fontFamily: "'Syne', sans-serif" }}>
              Click completed stages to see output.
            </div>
            Every stage produces a structured STP payload.
            No natural language anywhere in the pipeline.
          </div>
        </div>

      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes breathe {
          0%, 100% { box-shadow: 0 0 8px currentColor; }
          50%       { box-shadow: 0 0 20px currentColor; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #12122a; border-radius: 2px; }
        button:hover:not(:disabled) { opacity: 0.82; }
      `}</style>
    </div>
  );
}
