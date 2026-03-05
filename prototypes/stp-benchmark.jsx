import { useState, useEffect, useRef, useCallback } from "react";

// ─── STP VS NO-STP BENCHMARK ─────────────────────────────────────────────────
//
// Same task. Two agents. Side-by-side race.
// Left: conventional agent — DOM traversal, NLP extraction, fragile scraping.
// Right: STP agent — reads semantic block, executes directly.
//
// The compression argument stated numerically. Made visceral.

const TASKS = [
  {
    id: "t001",
    label: "Extract product information and add best match to cart",
    domain: "shop.stp.dev",
  },
  {
    id: "t002",
    label: "Answer: does this page support the claim that transformers require attention?",
    domain: "arxiv.org/transformer-survey",
  },
  {
    id: "t003",
    label: "Build a structured knowledge graph of all concepts and relations on page",
    domain: "agents.dev/architecture",
  },
];

// ─── STEP DEFINITIONS ────────────────────────────────────────────────────────

function buildConventionalSteps(task) {
  const base = [
    { label: "Launch browser instance",                    ms: 820,  bytes: 0,     type: "setup" },
    { label: "Navigate to URL",                            ms: 640,  bytes: 0,     type: "nav" },
    { label: "Wait for page render (DOMContentLoaded)",    ms: 1240, bytes: 0,     type: "wait" },
    { label: "Wait for JS hydration",                      ms: 880,  bytes: 0,     type: "wait" },
    { label: "Download full HTML + CSS + JS",              ms: 520,  bytes: 68400, type: "download" },
    { label: "Parse DOM tree (4,200 nodes)",               ms: 340,  bytes: 0,     type: "parse" },
    { label: "Strip nav, ads, footer, cookie banner",      ms: 180,  bytes: 0,     type: "filter" },
    { label: "Extract visible text content",               ms: 210,  bytes: 18200, type: "extract" },
  ];

  if (task.id === "t001") return [
    ...base,
    { label: "Send 18,200 chars to LLM for extraction",    ms: 1840, bytes: 18200, type: "llm" },
    { label: "Parse LLM JSON response",                    ms: 120,  bytes: 0,     type: "parse" },
    { label: "Locate add-to-cart button via CSS selector", ms: 390,  bytes: 0,     type: "dom" },
    { label: "CSS selector breaks — retry with XPath",     ms: 560,  bytes: 0,     type: "error", isError: true },
    { label: "Click add-to-cart button",                   ms: 310,  bytes: 0,     type: "action" },
    { label: "Wait for cart update confirmation",          ms: 740,  bytes: 0,     type: "wait" },
    { label: "Verify cart state via DOM scrape",           ms: 480,  bytes: 0,     type: "dom" },
  ];

  if (task.id === "t002") return [
    ...base,
    { label: "Send 18,200 chars to LLM for Q&A",           ms: 2140, bytes: 18200, type: "llm" },
    { label: "LLM returns answer with citations",           ms: 0,    bytes: 0,     type: "parse" },
    { label: "Cannot verify confidence — no provenance",   ms: 180,  bytes: 0,     type: "error", isError: true },
    { label: "Re-query LLM for source verification",       ms: 1640, bytes: 0,     type: "llm" },
    { label: "Manually cross-reference claim",             ms: 890,  bytes: 0,     type: "verify" },
  ];

  return [
    ...base,
    { label: "Send full text to LLM for entity extraction",ms: 2340, bytes: 18200, type: "llm" },
    { label: "Parse entities from LLM response",           ms: 280,  bytes: 0,     type: "parse" },
    { label: "Re-query for relation extraction",           ms: 1980, bytes: 0,     type: "llm" },
    { label: "Parse relations — partial, untyped",         ms: 340,  bytes: 0,     type: "parse" },
    { label: "No confidence data — cannot propagate",      ms: 120,  bytes: 0,     type: "error", isError: true },
    { label: "Attempt manual confidence assignment",       ms: 640,  bytes: 0,     type: "verify" },
    { label: "Graph incomplete — 60% of relations lost",   ms: 180,  bytes: 0,     type: "error", isError: true },
  ];
}

function buildSTPSteps(task) {
  const base = [
    { label: "Fetch page headers",                         ms: 80,   bytes: 480,   type: "setup" },
    { label: "Detect STP block in <script> tag",           ms: 40,   bytes: 0,     type: "detect" },
    { label: "Parse STP JSON block",                       ms: 35,   bytes: 412,   type: "parse" },
    { label: "Verify Ed25519 signature",                   ms: 22,   bytes: 0,     type: "security" },
    { label: "Scan for injection patterns — clean",        ms: 18,   bytes: 0,     type: "security" },
    { label: "Resolve concepts against registry",          ms: 55,   bytes: 0,     type: "registry" },
  ];

  if (task.id === "t001") return [
    ...base,
    { label: "Read action manifest — 5 actions declared",  ms: 12,   bytes: 0,     type: "manifest" },
    { label: "Check domain allowlist — ecommerce OK",      ms: 28,   bytes: 0,     type: "security" },
    { label: "Execute catalog.search via API",             ms: 43,   bytes: 0,     type: "action" },
    { label: "Select best match from structured response", ms: 15,   bytes: 0,     type: "reason" },
    { label: "Execute cart.add via API",                   ms: 38,   bytes: 0,     type: "action" },
    { label: "Read cart state — structured JSON",          ms: 29,   bytes: 0,     type: "action" },
    { label: "Task complete ✓",                            ms: 10,   bytes: 0,     type: "done" },
  ];

  if (task.id === "t002") return [
    ...base,
    { label: "Load pre-structured relations (7 found)",    ms: 20,   bytes: 0,     type: "relations" },
    { label: "Locate claim: transformer → attention",      ms: 12,   bytes: 0,     type: "lookup" },
    { label: "Read confidence: 0.99",                      ms: 8,    bytes: 0,     type: "confidence" },
    { label: "Propagate confidence through citation chain",ms: 35,   bytes: 0,     type: "confidence" },
    { label: "Verify provenance: primary_research 2024",   ms: 14,   bytes: 0,     type: "verify" },
    { label: "Task complete ✓",                            ms: 8,    bytes: 0,     type: "done" },
  ];

  return [
    ...base,
    { label: "Load concepts (4 found with canonical IDs)", ms: 18,   bytes: 0,     type: "registry" },
    { label: "Load relations (5 typed, conf scored)",      ms: 22,   bytes: 0,     type: "relations" },
    { label: "Propagate confidence on all edges",          ms: 38,   bytes: 0,     type: "confidence" },
    { label: "Check for conflicts — 0 found",             ms: 24,   bytes: 0,     type: "conflict" },
    { label: "Graph complete — 100% of relations captured",ms: 12,   bytes: 0,     type: "done" },
    { label: "Task complete ✓",                            ms: 8,    bytes: 0,     type: "done" },
  ];
}

const STEP_COLORS = {
  setup:      "#3a3a58",
  nav:        "#3a3a58",
  wait:       "#f43f5e",
  download:   "#f43f5e",
  parse:      "#facc15",
  filter:     "#facc15",
  extract:    "#facc15",
  llm:        "#fb923c",
  dom:        "#facc15",
  action:     "#34d399",
  detect:     "#60a5fa",
  security:   "#34d399",
  registry:   "#a78bfa",
  manifest:   "#60a5fa",
  reason:     "#60a5fa",
  relations:  "#a78bfa",
  lookup:     "#60a5fa",
  confidence: "#34d399",
  verify:     "#34d399",
  conflict:   "#fb923c",
  done:       "#34d399",
  error:      "#f43f5e",
};

// ─── COLORS ──────────────────────────────────────────────────────────────────
const C = {
  bg:      "#04040a",
  surface: "#070710",
  card:    "#0a0a18",
  border:  "#111120",
  text:    "#50508a",
  bright:  "#c0c0e8",
  muted:   "#222238",
  red:     "#f43f5e",
  green:   "#34d399",
  blue:    "#60a5fa",
  orange:  "#fb923c",
  purple:  "#a78bfa",
  yellow:  "#facc15",
};

function StepRow({ step, elapsed, visible, isError }) {
  const color = STEP_COLORS[step.type] || C.text;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "4px 10px",
      background: step.isError ? "#f43f5e06" : "transparent",
      borderLeft: step.isError ? "2px solid #f43f5e30" : "2px solid transparent",
      opacity: visible ? 1 : 0,
      transform: visible ? "translateX(0)" : "translateX(-4px)",
      transition: "all 0.25s ease",
    }}>
      <div style={{
        width: 5, height: 5, borderRadius: "50%",
        background: color, flexShrink: 0,
        opacity: 0.8,
      }} />
      <span style={{
        fontSize: 9, color: step.isError ? C.red : C.text,
        flex: 1, lineHeight: 1.4,
        fontStyle: step.isError ? "italic" : "normal",
      }}>{step.label}</span>
      <span style={{
        fontSize: 8, color: color, flexShrink: 0,
        fontFamily: "'DM Mono', monospace",
      }}>{step.ms > 0 ? `${step.ms}ms` : ""}</span>
    </div>
  );
}

function Timer({ ms, color, running }) {
  return (
    <div style={{
      fontSize: 36, fontWeight: 800, color,
      fontFamily: "'Syne', sans-serif",
      letterSpacing: "-0.02em",
      transition: "color 0.3s",
    }}>
      {(ms / 1000).toFixed(2)}s
      {running && (
        <span style={{
          fontSize: 10, color: color + "80",
          marginLeft: 8, letterSpacing: "0.1em",
          animation: "blink 0.8s infinite",
        }}>●</span>
      )}
    </div>
  );
}

function ProgressBar({ current, total, color }) {
  const pct = total > 0 ? (current / total) * 100 : 0;
  return (
    <div style={{
      height: 3, background: C.muted, borderRadius: 2, overflow: "hidden",
    }}>
      <div style={{
        height: "100%", width: `${pct}%`,
        background: `linear-gradient(90deg, ${color}80, ${color})`,
        borderRadius: 2, transition: "width 0.2s ease",
      }} />
    </div>
  );
}

export default function Benchmark() {
  const [taskIdx, setTaskIdx]   = useState(0);
  const [running, setRunning]   = useState(false);
  const [done, setDone]         = useState(false);

  const [convSteps, setConvSteps] = useState([]);
  const [stpSteps,  setStpSteps]  = useState([]);
  const [convVisible, setConvVisible] = useState([]);
  const [stpVisible,  setStpVisible]  = useState([]);
  const [convMs, setConvMs]     = useState(0);
  const [stpMs,  setStpMs]      = useState(0);
  const [convDone, setConvDone] = useState(false);
  const [stpDone,  setStpDone]  = useState(false);

  const timers = useRef([]);
  const convInterval = useRef(null);
  const stpInterval  = useRef(null);

  const task = TASKS[taskIdx];

  const clearAll = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (convInterval.current) clearInterval(convInterval.current);
    if (stpInterval.current)  clearInterval(stpInterval.current);
  };

  const reset = useCallback(() => {
    clearAll();
    setRunning(false);
    setDone(false);
    setConvSteps([]);
    setStpSteps([]);
    setConvVisible([]);
    setStpVisible([]);
    setConvMs(0);
    setStpMs(0);
    setConvDone(false);
    setStpDone(false);
  }, []);

  useEffect(() => { reset(); }, [taskIdx]);

  const run = useCallback(() => {
    reset();
    const cSteps = buildConventionalSteps(task);
    const sSteps = buildSTPSteps(task);
    setConvSteps(cSteps);
    setStpSteps(sSteps);
    setRunning(true);

    // Run conventional steps with cumulative delay
    let convElapsed = 0;
    cSteps.forEach((step, i) => {
      convElapsed += step.ms;
      const t = setTimeout(() => {
        setConvVisible(prev => [...prev, i]);
        setConvMs(convElapsed);
        if (i === cSteps.length - 1) {
          setConvDone(true);
          setRunning(r => { return r; });
        }
      }, convElapsed / 6); // compress real time
      timers.current.push(t);
    });

    // Run STP steps with cumulative delay
    let stpElapsed = 0;
    sSteps.forEach((step, i) => {
      stpElapsed += step.ms;
      const t = setTimeout(() => {
        setStpVisible(prev => [...prev, i]);
        setStpMs(stpElapsed);
        if (i === sSteps.length - 1) {
          setStpDone(true);
        }
      }, stpElapsed / 6);
      timers.current.push(t);
    });

    // Mark done when both finish
    const maxTime = Math.max(convElapsed, stpElapsed) / 6 + 500;
    const t = setTimeout(() => {
      setRunning(false);
      setDone(true);
    }, maxTime);
    timers.current.push(t);
  }, [task, reset]);

  const convTotal = convSteps.reduce((s, st) => s + st.ms, 0);
  const stpTotal  = stpSteps.reduce((s, st) => s + st.ms, 0);
  const speedup   = convTotal > 0 && stpTotal > 0 ? (convTotal / stpTotal).toFixed(1) : null;
  const convBytes = convSteps.reduce((s, st) => s + st.bytes, 0);
  const stpBytes  = stpSteps.reduce((s, st) => s + st.bytes, 0);
  const convErrors = convSteps.filter(s => s.isError).length;
  const stpErrors  = stpSteps.filter(s => s.isError).length;

  return (
    <div style={{
      fontFamily: "'DM Mono', monospace",
      background: C.bg, minHeight: "100vh", color: C.text,
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Mono:ital,wght@0,300;0,400;1,300&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{
        borderBottom: `1px solid ${C.border}`, padding: "12px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "rgba(2,2,8,0.98)", position: "sticky", top: 0, zIndex: 10,
        backdropFilter: "blur(12px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{
            fontSize: 13, fontWeight: 800, letterSpacing: "0.2em",
            color: "#e0e0f8", fontFamily: "'Syne', sans-serif",
          }}>STP</span>
          <span style={{ fontSize: 10, color: C.muted, letterSpacing: "0.15em" }}>
            BENCHMARK · CONVENTIONAL vs STP
          </span>
        </div>
        <button
          onClick={running ? reset : done ? reset : run}
          style={{
            background: running ? "rgba(244,63,94,0.1)" : done ? "rgba(96,165,250,0.1)" : "rgba(52,211,153,0.12)",
            border: `1px solid ${running ? "#f43f5e40" : done ? "#60a5fa40" : "#34d39940"}`,
            color: running ? C.red : done ? C.blue : C.green,
            padding: "6px 16px", borderRadius: 4, cursor: "pointer",
            fontSize: 10, letterSpacing: "0.12em", fontFamily: "inherit",
          }}
        >
          {running ? "◼ STOP" : done ? "↺ RESET" : "▶ RUN BENCHMARK"}
        </button>
      </div>

      {/* Task selector */}
      <div style={{
        borderBottom: `1px solid ${C.border}`,
        padding: "10px 20px",
        display: "flex", gap: 8, alignItems: "center",
        background: "rgba(3,3,9,0.9)",
      }}>
        <span style={{ fontSize: 9, color: C.muted, marginRight: 4 }}>TASK:</span>
        {TASKS.map((t, i) => (
          <button key={t.id} onClick={() => { if (!running) setTaskIdx(i); }} style={{
            background: taskIdx === i ? "rgba(96,165,250,0.1)" : "transparent",
            border: `1px solid ${taskIdx === i ? C.blue + "40" : C.border}`,
            color: taskIdx === i ? C.blue : C.muted,
            padding: "4px 12px", borderRadius: 4, cursor: running ? "default" : "pointer",
            fontSize: 9, letterSpacing: "0.08em", fontFamily: "inherit",
            maxWidth: 240, textAlign: "left",
          }}>
            {t.id} · {t.label.slice(0, 38)}...
          </button>
        ))}
      </div>

      {/* Task label */}
      <div style={{
        padding: "12px 20px", borderBottom: `1px solid ${C.border}`,
        fontSize: 11, color: C.bright, fontFamily: "'Syne', sans-serif",
      }}>
        "{task.label}"
        <span style={{ marginLeft: 12, fontSize: 9, color: C.muted }}>→ {task.domain}</span>
      </div>

      {/* Race */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr",
        height: "calc(100vh - 155px)", overflow: "hidden",
      }}>

        {/* ── CONVENTIONAL ── */}
        <div style={{
          borderRight: `1px solid ${C.border}`,
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{
            padding: "14px 18px",
            background: "#0a0208",
            borderBottom: `1px solid ${C.border}`,
          }}>
            <div style={{
              fontSize: 8, letterSpacing: "0.2em", color: C.red, marginBottom: 6,
            }}>CONVENTIONAL AGENT</div>
            <div style={{ fontSize: 10, color: C.text, marginBottom: 10 }}>
              Browser automation · DOM scraping · LLM extraction
            </div>
            <Timer ms={convMs} color={convDone ? C.red : C.orange} running={running && !convDone} />
            {convSteps.length > 0 && (
              <ProgressBar current={convVisible.length} total={convSteps.length} color={C.red} />
            )}
          </div>

          {/* Steps */}
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 4px" }}>
            {convSteps.map((step, i) => (
              <StepRow
                key={i}
                step={step}
                elapsed={convMs}
                visible={convVisible.includes(i)}
              />
            ))}
            {convDone && (
              <div style={{
                margin: "10px 10px 0",
                padding: "10px 12px",
                background: C.red + "08", border: `1px solid ${C.red}20`,
                borderRadius: 5, fontSize: 9,
                animation: "fadeIn 0.4s ease",
              }}>
                <div style={{ color: C.red, fontWeight: 700, marginBottom: 6 }}>
                  COMPLETE — {(convTotal/1000).toFixed(2)}s
                </div>
                <div style={{ color: C.text, lineHeight: 1.8 }}>
                  <div>Steps: {convSteps.length}</div>
                  <div>Errors / retries: <span style={{ color: C.red }}>{convErrors}</span></div>
                  <div>Bytes processed: <span style={{ color: C.orange }}>{(convBytes/1024).toFixed(0)}KB</span></div>
                  <div>LLM calls: <span style={{ color: C.orange }}>{convSteps.filter(s=>s.type==="llm").length}</span></div>
                  <div>Browser renders: <span style={{ color: C.orange }}>1</span></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── STP ── */}
        <div style={{
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{
            padding: "14px 18px",
            background: "#020a08",
            borderBottom: `1px solid ${C.border}`,
          }}>
            <div style={{
              fontSize: 8, letterSpacing: "0.2em", color: C.green, marginBottom: 6,
            }}>STP AGENT</div>
            <div style={{ fontSize: 10, color: C.text, marginBottom: 10 }}>
              Semantic block · Direct API · Zero DOM
            </div>
            <Timer ms={stpMs} color={stpDone ? C.green : "#34d399cc"} running={running && !stpDone} />
            {stpSteps.length > 0 && (
              <ProgressBar current={stpVisible.length} total={stpSteps.length} color={C.green} />
            )}
          </div>

          {/* Steps */}
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 4px" }}>
            {stpSteps.map((step, i) => (
              <StepRow
                key={i}
                step={step}
                elapsed={stpMs}
                visible={stpVisible.includes(i)}
              />
            ))}
            {stpDone && (
              <div style={{
                margin: "10px 10px 0",
                padding: "10px 12px",
                background: C.green + "08", border: `1px solid ${C.green}20`,
                borderRadius: 5, fontSize: 9,
                animation: "fadeIn 0.4s ease",
              }}>
                <div style={{ color: C.green, fontWeight: 700, marginBottom: 6 }}>
                  COMPLETE — {(stpTotal/1000).toFixed(2)}s
                </div>
                <div style={{ color: C.text, lineHeight: 1.8 }}>
                  <div>Steps: {stpSteps.length}</div>
                  <div>Errors / retries: <span style={{ color: C.green }}>0</span></div>
                  <div>Bytes processed: <span style={{ color: C.green }}>{stpBytes}B</span></div>
                  <div>LLM calls: <span style={{ color: C.green }}>0</span></div>
                  <div>Browser renders: <span style={{ color: C.green }}>0</span></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Final verdict bar */}
      {done && speedup && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          padding: "14px 24px",
          background: "rgba(4,4,10,0.98)",
          borderTop: `1px solid #34d39930`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          backdropFilter: "blur(12px)",
          animation: "slideUp 0.4s ease",
        }}>
          <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 8, color: C.muted, letterSpacing: "0.12em", marginBottom: 3 }}>CONVENTIONAL</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.red, fontFamily: "'Syne', sans-serif" }}>
                {(convTotal/1000).toFixed(2)}s
              </div>
            </div>
            <div style={{
              fontSize: 36, fontWeight: 800, color: C.green,
              fontFamily: "'Syne', sans-serif",
            }}>
              {speedup}×
            </div>
            <div>
              <div style={{ fontSize: 8, color: C.muted, letterSpacing: "0.12em", marginBottom: 3 }}>STP</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.green, fontFamily: "'Syne', sans-serif" }}>
                {(stpTotal/1000).toFixed(2)}s
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 24, fontSize: 9 }}>
            {[
              { label: "BYTES", conv: `${(convBytes/1024).toFixed(0)}KB`, stp: `${stpBytes}B` },
              { label: "ERRORS", conv: convErrors, stp: 0 },
              { label: "LLM CALLS", conv: convSteps.filter(s=>s.type==="llm").length, stp: 0 },
              { label: "DOM RENDERS", conv: 1, stp: 0 },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div style={{ color: C.muted, marginBottom: 4, letterSpacing: "0.1em" }}>{s.label}</div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ color: C.red }}>{s.conv}</span>
                  <span style={{ color: C.muted }}>vs</span>
                  <span style={{ color: C.green }}>{s.stp}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
        @keyframes blink {
          0%,100% { opacity: 1; } 50% { opacity: 0.2; }
        }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #12122a; border-radius: 2px; }
        button:hover:not(:disabled) { opacity: 0.82; }
      `}</style>
    </div>
  );
}
