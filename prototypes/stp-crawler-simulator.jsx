import { useState, useEffect, useRef, useCallback } from "react";

// ─── STP CRAWLER SIMULATOR ───────────────────────────────────────────────────
//
// A simulated web of 8 interconnected pages, each with an STP block.
// The crawler visits them in priority order, extracts semantic data,
// and assembles a live knowledge graph — node by node, edge by edge.
//
// This is the "what if the whole web had STP" argument made visual.

// ─── FAKE WEB ────────────────────────────────────────────────────────────────

const WEB = {
  "arxiv.org/transformer-survey": {
    id: "p_arxiv_transformer",
    url: "arxiv.org/transformer-survey",
    title: "Attention Is All You Need — 2024 Survey",
    type: "primary_research",
    domain: "ai.ml",
    html_bytes: 48200,
    stp_bytes: 412,
    x: 420, y: 80,
    color: "#60a5fa",
    concepts: [
      { id: "stp:ai.ml.004", ref: "transformer",          weight: 0.99 },
      { id: "stp:ai.ml.005", ref: "attention_mechanism",  weight: 0.98 },
      { id: "stp:ai.ml.001", ref: "neural_network",       weight: 0.85 },
    ],
    relations: [
      { from: "transformer",         to: "attention_mechanism", type: "requires",   conf: 0.99 },
      { from: "transformer",         to: "neural_network",      type: "is_type_of", conf: 0.97 },
      { from: "attention_mechanism", to: "transformer",         type: "supports",   conf: 0.99 },
    ],
    links: ["openai.com/gpt-architecture", "deepmind.com/gemini-paper", "pytorch.org/docs"],
  },

  "openai.com/gpt-architecture": {
    id: "p_openai_gpt",
    url: "openai.com/gpt-architecture",
    title: "GPT Architecture Deep Dive",
    type: "technical_report",
    domain: "ai.ml",
    html_bytes: 31400,
    stp_bytes: 287,
    x: 200, y: 200,
    color: "#34d399",
    concepts: [
      { id: "stp:ai.ml.006", ref: "large_language_model", weight: 0.99 },
      { id: "stp:ai.ml.004", ref: "transformer",          weight: 0.95 },
      { id: "stp:ai.ml.008", ref: "fine_tuning",          weight: 0.82 },
    ],
    relations: [
      { from: "large_language_model", to: "transformer",  type: "requires",   conf: 0.98 },
      { from: "large_language_model", to: "fine_tuning",  type: "supports",   conf: 0.87 },
      { from: "fine_tuning",          to: "large_language_model", type: "supports", conf: 0.91 },
    ],
    links: ["arxiv.org/transformer-survey", "huggingface.co/models", "anthropic.com/research"],
  },

  "deepmind.com/gemini-paper": {
    id: "p_deepmind_gemini",
    url: "deepmind.com/gemini-paper",
    title: "Multimodal Foundation Models",
    type: "primary_research",
    domain: "ai.ml",
    html_bytes: 52100,
    stp_bytes: 389,
    x: 640, y: 200,
    color: "#a78bfa",
    concepts: [
      { id: "stp:ai.ml.006", ref: "large_language_model", weight: 0.96 },
      { id: "stp:ai.ml.007", ref: "multimodal",           weight: 0.94 },
      { id: "stp:ai.ml.009", ref: "quantization",         weight: 0.75 },
    ],
    relations: [
      { from: "large_language_model", to: "multimodal",    type: "supports",    conf: 0.91 },
      { from: "multimodal",           to: "large_language_model", type: "requires", conf: 0.88 },
      { from: "quantization",         to: "large_language_model", type: "supports", conf: 0.83 },
    ],
    links: ["arxiv.org/transformer-survey", "pytorch.org/docs", "agents.dev/architecture"],
  },

  "anthropic.com/research": {
    id: "p_anthropic",
    url: "anthropic.com/research",
    title: "Constitutional AI and Agent Safety",
    type: "primary_research",
    domain: "ai.agents",
    html_bytes: 29800,
    stp_bytes: 334,
    x: 200, y: 380,
    color: "#fb923c",
    concepts: [
      { id: "stp:ai.agents.001", ref: "agent",          weight: 0.97 },
      { id: "stp:ai.ml.006",    ref: "large_language_model", weight: 0.92 },
      { id: "stp:ai.agents.003", ref: "reasoning",      weight: 0.89 },
    ],
    relations: [
      { from: "agent",               to: "reasoning",           type: "requires",   conf: 0.94 },
      { from: "large_language_model", to: "agent",              type: "supports",   conf: 0.85,
        conditions: ["tool_use_enabled","context_window_gte_128k"] },
      { from: "agent",               to: "large_language_model", type: "requires",  conf: 0.90 },
    ],
    links: ["openai.com/gpt-architecture", "agents.dev/architecture", "huggingface.co/models"],
  },

  "agents.dev/architecture": {
    id: "p_agents_dev",
    url: "agents.dev/architecture",
    title: "Modern Agent Architecture Patterns",
    type: "technical_blog",
    domain: "ai.agents",
    html_bytes: 18600,
    stp_bytes: 298,
    x: 420, y: 340,
    color: "#f43f5e",
    concepts: [
      { id: "stp:ai.agents.001", ref: "agent",          weight: 0.98 },
      { id: "stp:ai.agents.002", ref: "memory",         weight: 0.91 },
      { id: "stp:ai.agents.004", ref: "tool_use",       weight: 0.88 },
    ],
    relations: [
      { from: "agent",    to: "memory",    type: "requires", conf: 0.87,
        conditions: ["task_horizon_gt_50_steps"] },
      { from: "agent",    to: "tool_use",  type: "requires", conf: 0.92 },
      { from: "tool_use", to: "agent",     type: "supports", conf: 0.95 },
    ],
    links: ["anthropic.com/research", "arxiv.org/transformer-survey", "pytorch.org/docs"],
  },

  "huggingface.co/models": {
    id: "p_hf",
    url: "huggingface.co/models",
    title: "Open Source Model Hub",
    type: "industry_report",
    domain: "ai.ml",
    html_bytes: 62400,
    stp_bytes: 201,
    x: 640, y: 380,
    color: "#facc15",
    concepts: [
      { id: "stp:ai.ml.006", ref: "large_language_model", weight: 0.95 },
      { id: "stp:ai.ml.008", ref: "fine_tuning",          weight: 0.93 },
      { id: "stp:ai.search.003", ref: "retrieval",        weight: 0.78 },
    ],
    relations: [
      { from: "fine_tuning",          to: "large_language_model", type: "supports",  conf: 0.94 },
      { from: "retrieval",            to: "large_language_model", type: "supports",  conf: 0.81 },
      { from: "large_language_model", to: "retrieval",            type: "supports",  conf: 0.77 },
    ],
    links: ["openai.com/gpt-architecture", "pytorch.org/docs"],
  },

  "pytorch.org/docs": {
    id: "p_pytorch",
    url: "pytorch.org/docs",
    title: "PyTorch — Deep Learning Framework",
    type: "technical_report",
    domain: "systems.network",
    html_bytes: 44100,
    stp_bytes: 178,
    x: 200, y: 540,
    color: "#f472b6",
    concepts: [
      { id: "stp:ai.ml.001", ref: "neural_network",  weight: 0.95 },
      { id: "stp:ai.ml.004", ref: "transformer",     weight: 0.82 },
      { id: "stp:ai.ml.009", ref: "quantization",    weight: 0.79 },
    ],
    relations: [
      { from: "neural_network",  to: "transformer",  type: "supports",  conf: 0.88 },
      { from: "quantization",    to: "neural_network",type: "supports",  conf: 0.85 },
      { from: "transformer",     to: "quantization",  type: "supports",  conf: 0.79 },
    ],
    links: ["arxiv.org/transformer-survey", "huggingface.co/models"],
  },

  "stp.dev/registry": {
    id: "p_stp_registry",
    url: "stp.dev/registry",
    title: "STP Canonical Concept Registry",
    type: "technical_report",
    domain: "ai.agents",
    html_bytes: 8200,
    stp_bytes: 521,
    x: 420, y: 520,
    color: "#34d399",
    concepts: [
      { id: "stp:ai.ml.004",    ref: "transformer",          weight: 0.99 },
      { id: "stp:ai.ml.006",    ref: "large_language_model", weight: 0.99 },
      { id: "stp:ai.agents.001",ref: "agent",                weight: 0.99 },
      { id: "stp:ai.search.001",ref: "semantic_search",      weight: 0.95 },
    ],
    relations: [
      { from: "semantic_search", to: "large_language_model", type: "requires",   conf: 0.88 },
      { from: "semantic_search", to: "retrieval",            type: "is_type_of", conf: 0.96 },
    ],
    links: ["agents.dev/architecture", "huggingface.co/models"],
  },
};

const CRAWL_ORDER = [
  "arxiv.org/transformer-survey",
  "openai.com/gpt-architecture",
  "deepmind.com/gemini-paper",
  "anthropic.com/research",
  "agents.dev/architecture",
  "huggingface.co/models",
  "pytorch.org/docs",
  "stp.dev/registry",
];

const RELATION_COLORS = {
  requires:   "#60a5fa",
  supports:   "#34d399",
  is_type_of: "#a78bfa",
  causes:     "#fb923c",
  contradicts:"#f43f5e",
  precedes:   "#f472b6",
  relates_to: "#5a5a78",
  refutes:    "#f87171",
};

// ─── GRAPH ENGINE ─────────────────────────────────────────────────────────────

function buildGraph(visitedUrls, web) {
  const nodes = {};
  const edges = [];
  const edgeSet = new Set();

  visitedUrls.forEach(url => {
    const page = web[url];
    if (!page) return;

    page.concepts.forEach(c => {
      if (!nodes[c.ref]) {
        nodes[c.ref] = {
          id: c.id, ref: c.ref, weight: c.weight,
          domain: page.domain, sources: 1,
          x: null, y: null,
        };
      } else {
        nodes[c.ref].sources++;
        nodes[c.ref].weight = Math.max(nodes[c.ref].weight, c.weight);
      }
    });

    page.relations.forEach(r => {
      const key = `${r.from}→${r.type}→${r.to}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        edges.push({ ...r, source_url: url });
      }
    });
  });

  return { nodes: Object.values(nodes), edges };
}

// ─── MINI FORCE LAYOUT ────────────────────────────────────────────────────────

function layoutNodes(nodes, width, height) {
  if (nodes.length === 0) return [];
  const cx = width / 2, cy = height / 2;
  const r = Math.min(width, height) * 0.38;
  return nodes.map((n, i) => {
    const angle = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
    return {
      ...n,
      x: cx + Math.cos(angle) * r * (0.6 + Math.random() * 0.4),
      y: cy + Math.sin(angle) * r * (0.6 + Math.random() * 0.4),
    };
  });
}

// ─── COLORS ──────────────────────────────────────────────────────────────────
const C = {
  bg:      "#04040a",
  surface: "#070710",
  card:    "#0a0a18",
  border:  "#111120",
  text:    "#50508a",
  bright:  "#c0c0e8",
  muted:   "#232340",
  dim:     "#181828",
};

function NodeDot({ node, active, pulse }) {
  const domainColors = {
    "ai.ml":         "#60a5fa",
    "ai.agents":     "#a78bfa",
    "ai.search":     "#34d399",
    "systems.network":"#f472b6",
  };
  const c = domainColors[node.domain] || "#5a5a78";
  const r = 5 + node.sources * 2.5;
  return (
    <g>
      {pulse && (
        <circle cx={node.x} cy={node.y} r={r + 8} fill="none"
          stroke={c} strokeWidth={1} opacity={0.4}
          style={{ animation: "graphPulse 1s ease-out forwards" }}
        />
      )}
      <circle cx={node.x} cy={node.y} r={r} fill={c + "22"}
        stroke={c} strokeWidth={active ? 1.5 : 1} />
      <text x={node.x} y={node.y + r + 11} textAnchor="middle"
        fontSize={7} fill={active ? C.bright : C.text}
        fontFamily="'DM Mono', monospace">
        {node.ref.replace(/_/g, " ").slice(0, 18)}
      </text>
    </g>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export default function CrawlerSim() {
  const [crawlIdx, setCrawlIdx]     = useState(-1);
  const [visited, setVisited]       = useState([]);
  const [running, setRunning]       = useState(false);
  const [speed, setSpeed]           = useState(1);
  const [graphNodes, setGraphNodes] = useState([]);
  const [graphEdges, setGraphEdges] = useState([]);
  const [newEdges, setNewEdges]     = useState([]);
  const [newNodes, setNewNodes]     = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);
  const [log, setLog]               = useState([]);
  const svgRef = useRef(null);
  const timers = useRef([]);
  const SVG_W = 520, SVG_H = 460;
  const layoutRef = useRef({});

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };

  const reset = useCallback(() => {
    clearTimers();
    setCrawlIdx(-1);
    setVisited([]);
    setRunning(false);
    setGraphNodes([]);
    setGraphEdges([]);
    setNewEdges([]);
    setNewNodes([]);
    setSelectedPage(null);
    setLog([]);
    layoutRef.current = {};
  }, []);

  const addLog = (msg, color) => setLog(prev => [...prev.slice(-40), { msg, color, id: Date.now() + Math.random() }]);

  const crawl = useCallback(() => {
    reset();
    setRunning(true);

    let visitedAcc = [];
    let nodeMap = {};  // ref → position

    CRAWL_ORDER.forEach((url, i) => {
      const delay = i === 0 ? 300 : i * (1800 / speed);

      const t = setTimeout(() => {
        setCrawlIdx(i);
        setSelectedPage(url);
        const page = WEB[url];

        addLog(`→ ${url}`, page.color);
        addLog(`  STP: ${page.stp_bytes}B  HTML skipped: ${page.html_bytes.toLocaleString()}B`, C.muted);

        visitedAcc = [...visitedAcc, url];
        setVisited([...visitedAcc]);

        // Build new nodes/edges
        const prevGraph = buildGraph(visitedAcc.slice(0, -1), WEB);
        const newGraph  = buildGraph(visitedAcc, WEB);

        const prevRefs = new Set(prevGraph.nodes.map(n => n.ref));
        const freshNodes = newGraph.nodes.filter(n => !prevRefs.has(n.ref));
        const prevEdgeKeys = new Set(prevGraph.edges.map(e => `${e.from}→${e.type}→${e.to}`));
        const freshEdges = newGraph.edges.filter(e => !prevEdgeKeys.has(`${e.from}→${e.type}→${e.to}`));

        freshNodes.forEach(n => addLog(`  + node: ${n.ref}`, "#a78bfa"));
        freshEdges.forEach(e => addLog(`  + edge: ${e.from} --[${e.type}:${e.conf}]--> ${e.to}`, RELATION_COLORS[e.type] || "#5a5a78"));

        // Layout all nodes
        const allNodes = newGraph.nodes.map(n => {
          if (nodeMap[n.ref]) return { ...n, ...nodeMap[n.ref] };
          // New node — place it
          const angle = Math.random() * Math.PI * 2;
          const r = 80 + Math.random() * 140;
          const pos = {
            x: SVG_W / 2 + Math.cos(angle) * r,
            y: SVG_H / 2 + Math.sin(angle) * r,
          };
          nodeMap[n.ref] = pos;
          return { ...n, ...pos };
        });

        setGraphNodes(allNodes);
        setGraphEdges(newGraph.edges);
        setNewNodes(freshNodes.map(n => n.ref));
        setNewEdges(freshEdges.map(e => `${e.from}→${e.type}→${e.to}`));

        if (i === CRAWL_ORDER.length - 1) {
          setRunning(false);
          setCrawlIdx(-1);
          addLog("─────────────────────────────", C.muted);
          addLog(`CRAWL COMPLETE`, "#34d399");
          addLog(`${newGraph.nodes.length} nodes · ${newGraph.edges.length} edges`, "#34d399");
          const totalHtml = CRAWL_ORDER.reduce((s, u) => s + WEB[u].html_bytes, 0);
          const totalStp  = CRAWL_ORDER.reduce((s, u) => s + WEB[u].stp_bytes, 0);
          addLog(`HTML avoided: ${(totalHtml / 1024).toFixed(0)}KB  STP read: ${totalStp}B`, "#60a5fa");
          addLog(`Compression: ${(totalHtml / totalStp).toFixed(1)}×`, "#34d399");
        }
      }, delay);
      timers.current.push(t);
    });
  }, [speed, reset]);

  // Clear pulse after animation
  useEffect(() => {
    if (newEdges.length > 0 || newNodes.length > 0) {
      const t = setTimeout(() => { setNewEdges([]); setNewNodes([]); }, 900);
      return () => clearTimeout(t);
    }
  }, [newEdges, newNodes]);

  const currentPage = crawlIdx >= 0 ? WEB[CRAWL_ORDER[crawlIdx]] : selectedPage ? WEB[selectedPage] : null;
  const totalNodes  = graphNodes.length;
  const totalEdges  = graphEdges.length;
  const totalHtmlSaved = visited.reduce((s, u) => s + WEB[u].html_bytes, 0);
  const totalStpRead   = visited.reduce((s, u) => s + WEB[u].stp_bytes, 0);

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
            WEB CRAWLER SIMULATOR
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 9, color: C.muted }}>SPEED</span>
          {[1,2,4].map(s => (
            <button key={s} onClick={() => setSpeed(s)} style={{
              background: speed===s ? "rgba(96,165,250,0.15)" : "transparent",
              border: `1px solid ${speed===s ? "#60a5fa40" : C.border}`,
              color: speed===s ? "#60a5fa" : C.muted,
              padding: "3px 8px", borderRadius: 3, cursor: "pointer",
              fontSize: 9, fontFamily: "inherit",
            }}>{s}×</button>
          ))}
          <button onClick={running ? reset : visited.length > 0 ? reset : crawl} style={{
            background: running ? "rgba(244,63,94,0.1)" : "rgba(52,211,153,0.12)",
            border: `1px solid ${running ? "#f43f5e40" : "#34d39940"}`,
            color: running ? "#f43f5e" : "#34d399",
            padding: "5px 14px", borderRadius: 4, cursor: "pointer",
            fontSize: 10, letterSpacing: "0.12em", fontFamily: "inherit",
          }}>
            {running ? "◼ STOP" : visited.length > 0 ? "↺ RESET" : "▶ CRAWL"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", height: "calc(100vh - 49px)", overflow: "hidden" }}>

        {/* Left — page queue */}
        <div style={{
          width: 200, borderRight: `1px solid ${C.border}`,
          overflowY: "auto", padding: "12px 10px",
          background: "rgba(2,2,7,0.8)",
        }}>
          <div style={{ fontSize: 8, letterSpacing: "0.2em", color: C.muted, marginBottom: 10 }}>
            PAGE QUEUE
          </div>
          {CRAWL_ORDER.map((url, i) => {
            const page = WEB[url];
            const isActive  = crawlIdx === i;
            const isDone    = visited.includes(url);
            const isPending = !isDone && crawlIdx < i;
            return (
              <div
                key={url}
                onClick={() => isDone && setSelectedPage(url)}
                style={{
                  padding: "8px 10px", borderRadius: 5, marginBottom: 3,
                  background: isActive ? C.surface : "transparent",
                  border: `1px solid ${isActive ? page.color + "30" : "transparent"}`,
                  cursor: isDone ? "pointer" : "default",
                  opacity: isPending && running ? 0.4 : 1,
                  transition: "all 0.2s",
                  borderLeft: `2px solid ${isDone ? page.color : isActive ? page.color : C.border}`,
                }}
              >
                <div style={{ fontSize: 9, color: isDone ? page.color : isActive ? page.color : C.muted }}>
                  {isDone ? "✓" : isActive ? "▶" : `${i+1}`} {url.split("/")[0]}
                </div>
                <div style={{
                  fontSize: 8, color: isDone || isActive ? C.text : C.muted,
                  lineHeight: 1.4, marginTop: 2,
                }}>{page.title.slice(0, 30)}...</div>
                {isDone && (
                  <div style={{ fontSize: 7, color: C.muted, marginTop: 2 }}>
                    {page.stp_bytes}B STP · {(page.html_bytes/1024).toFixed(0)}KB HTML
                  </div>
                )}
              </div>
            );
          })}

          {/* Stats */}
          <div style={{ marginTop: 14, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
            {[
              { l: "PAGES VISITED",    v: `${visited.length} / ${CRAWL_ORDER.length}` },
              { l: "GRAPH NODES",      v: totalNodes, c: "#a78bfa" },
              { l: "GRAPH EDGES",      v: totalEdges, c: "#60a5fa" },
              { l: "STP READ",         v: totalStpRead ? `${totalStpRead}B` : "—" },
              { l: "HTML SKIPPED",     v: totalHtmlSaved ? `${(totalHtmlSaved/1024).toFixed(0)}KB` : "—", c: "#34d399" },
              { l: "COMPRESSION",      v: totalStpRead ? `${(totalHtmlSaved/totalStpRead).toFixed(1)}×` : "—", c: "#34d399" },
            ].map((s,i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 7, color: C.muted, letterSpacing: "0.1em", marginBottom: 2 }}>{s.l}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: s.c || C.bright, fontFamily: "'Syne', sans-serif" }}>
                  {s.v}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Center — graph */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Graph */}
          <div style={{
            flex: 1, position: "relative",
            background: "radial-gradient(ellipse at 50% 40%, #080814 0%, #04040a 100%)",
            borderBottom: `1px solid ${C.border}`,
          }}>
            {visited.length === 0 && !running && (
              <div style={{
                position: "absolute", inset: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: C.muted, fontSize: 11, letterSpacing: "0.1em",
                flexDirection: "column", gap: 8,
              }}>
                <div>KNOWLEDGE GRAPH BUILDS AS CRAWLER VISITS PAGES</div>
                <div style={{ fontSize: 9 }}>PRESS CRAWL TO BEGIN</div>
              </div>
            )}

            <svg
              ref={svgRef}
              width="100%" height="100%"
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              style={{ display: "block" }}
            >
              {/* Edges */}
              {graphEdges.map((e, i) => {
                const from = graphNodes.find(n => n.ref === e.from);
                const to   = graphNodes.find(n => n.ref === e.to);
                if (!from || !to) return null;
                const key = `${e.from}→${e.type}→${e.to}`;
                const isNew = newEdges.includes(key);
                const c = RELATION_COLORS[e.type] || "#5a5a78";
                // Arrow midpoint
                const mx = (from.x + to.x) / 2;
                const my = (from.y + to.y) / 2;
                const dx = to.x - from.x, dy = to.y - from.y;
                const len = Math.sqrt(dx*dx + dy*dy);
                return (
                  <g key={key} opacity={isNew ? 1 : 0.6}
                    style={isNew ? { animation: "edgeFade 0.6s ease forwards" } : {}}>
                    <line
                      x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                      stroke={c} strokeWidth={isNew ? 1.5 : 0.8}
                      strokeOpacity={isNew ? 0.9 : 0.35}
                    />
                    <text x={mx} y={my - 4} textAnchor="middle"
                      fontSize={6} fill={c} opacity={0.7}
                      fontFamily="'DM Mono', monospace">
                      {e.type.slice(0,8)}
                    </text>
                  </g>
                );
              })}

              {/* Nodes */}
              {graphNodes.map(node => (
                <NodeDot
                  key={node.ref}
                  node={node}
                  active={currentPage?.concepts?.some(c => c.ref === node.ref)}
                  pulse={newNodes.includes(node.ref)}
                />
              ))}
            </svg>

            {/* Legend */}
            <div style={{
              position: "absolute", bottom: 10, right: 10,
              display: "flex", flexDirection: "column", gap: 3,
            }}>
              {Object.entries(RELATION_COLORS).slice(0,5).map(([type, color]) => (
                <div key={type} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 12, height: 1.5, background: color }} />
                  <span style={{ fontSize: 7, color }}>{type}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Log */}
          <div style={{
            height: 140, overflowY: "auto",
            padding: "8px 14px", background: "#040408",
            borderTop: `1px solid ${C.border}`,
          }}>
            <div style={{ fontSize: 8, letterSpacing: "0.15em", color: C.muted, marginBottom: 6 }}>
              CRAWLER LOG
            </div>
            {log.map(entry => (
              <div key={entry.id} style={{
                fontSize: 9, color: entry.color || C.text, lineHeight: 1.8,
                fontFamily: "'DM Mono', monospace",
                animation: "logFade 0.2s ease",
              }}>
                {entry.msg}
              </div>
            ))}
            {running && (
              <div style={{ fontSize: 9, color: C.muted, animation: "blink 1s infinite" }}>
                crawling...
              </div>
            )}
          </div>
        </div>

        {/* Right — page detail */}
        <div style={{
          width: 240, borderLeft: `1px solid ${C.border}`,
          overflowY: "auto", padding: "14px",
          background: "rgba(2,2,7,0.7)",
        }}>
          <div style={{ fontSize: 8, letterSpacing: "0.2em", color: C.muted, marginBottom: 12 }}>
            {currentPage ? "PAGE DETAIL" : "ABOUT"}
          </div>

          {!currentPage && (
            <div style={{ fontSize: 9, color: C.text, lineHeight: 1.8 }}>
              <div style={{ color: C.bright, fontWeight: 700, marginBottom: 8, fontFamily: "'Syne', sans-serif" }}>
                8 pages. One crawler. Zero HTML parsed.
              </div>
              <p>Each page carries an STP block alongside its HTML. The crawler reads only the STP block — skipping all rendering, all NLP, all DOM traversal.</p>
              <p style={{ marginTop: 8 }}>As each page is visited, its concepts become nodes and its relations become edges. The knowledge graph assembles in real time.</p>
              <p style={{ marginTop: 8 }}>By the end: a complete semantic graph of the AI/ML landscape — built in seconds, from structured data, not scraped prose.</p>

              <div style={{ marginTop: 14, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
                <div style={{ fontSize: 8, color: C.muted, marginBottom: 8, letterSpacing: "0.1em" }}>DOMAIN LEGEND</div>
                {[
                  { domain: "ai.ml",          color: "#60a5fa" },
                  { domain: "ai.agents",       color: "#a78bfa" },
                  { domain: "ai.search",       color: "#34d399" },
                  { domain: "systems.network", color: "#f472b6" },
                ].map(d => (
                  <div key={d.domain} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: d.color, boxShadow: `0 0 4px ${d.color}`,
                    }} />
                    <span style={{ fontSize: 9, color: d.color }}>{d.domain}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentPage && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{
                background: C.surface, border: `1px solid ${currentPage.color}25`,
                borderRadius: 6, padding: "10px 12px",
                borderLeft: `2px solid ${currentPage.color}`,
              }}>
                <div style={{ fontSize: 9, color: currentPage.color, marginBottom: 4 }}>
                  {currentPage.type.replace(/_/g, " ")}
                </div>
                <div style={{
                  fontSize: 11, fontWeight: 700, color: C.bright,
                  fontFamily: "'Syne', sans-serif", lineHeight: 1.3, marginBottom: 6,
                }}>{currentPage.title}</div>
                <div style={{ fontSize: 8, color: C.muted }}>{currentPage.url}</div>
              </div>

              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6,
              }}>
                {[
                  { l: "HTML",     v: `${(currentPage.html_bytes/1024).toFixed(0)}KB`, c: "#f43f5e" },
                  { l: "STP",      v: `${currentPage.stp_bytes}B`,                     c: "#34d399" },
                  { l: "CONCEPTS", v: currentPage.concepts.length,                      c: "#a78bfa" },
                  { l: "RELATIONS",v: currentPage.relations.length,                     c: "#60a5fa" },
                ].map((s,i) => (
                  <div key={i} style={{
                    background: C.card, border: `1px solid ${C.border}`,
                    borderRadius: 4, padding: "7px 8px",
                  }}>
                    <div style={{ fontSize: 7, color: C.muted, marginBottom: 2 }}>{s.l}</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: s.c, fontFamily: "'Syne', sans-serif" }}>
                      {s.v}
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <div style={{ fontSize: 8, color: C.muted, letterSpacing: "0.1em", marginBottom: 6 }}>
                  CONCEPTS
                </div>
                {currentPage.concepts.map(c => (
                  <div key={c.ref} style={{
                    display: "flex", justifyContent: "space-between",
                    padding: "4px 8px", marginBottom: 2,
                    background: C.card, borderRadius: 3, fontSize: 9,
                  }}>
                    <span style={{ color: C.text }}>{c.ref.replace(/_/g," ")}</span>
                    <span style={{ color: "#34d399" }}>{(c.weight*100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>

              <div>
                <div style={{ fontSize: 8, color: C.muted, letterSpacing: "0.1em", marginBottom: 6 }}>
                  RELATIONS
                </div>
                {currentPage.relations.map((r, i) => (
                  <div key={i} style={{
                    padding: "5px 8px", marginBottom: 3,
                    background: C.card, borderRadius: 3,
                    borderLeft: `2px solid ${RELATION_COLORS[r.type] || "#5a5a78"}`,
                    fontSize: 8, lineHeight: 1.6,
                  }}>
                    <span style={{ color: C.text }}>{r.from.replace(/_/g," ")}</span>
                    <span style={{ color: RELATION_COLORS[r.type], margin: "0 4px" }}>
                      [{r.type}:{r.conf}]
                    </span>
                    <span style={{ color: C.text }}>{r.to.replace(/_/g," ")}</span>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 8, color: C.muted, letterSpacing: "0.1em", marginBottom: 4 }}>
                OUTBOUND LINKS
              </div>
              {currentPage.links.map(l => (
                <div key={l} style={{
                  fontSize: 8, color: "#60a5fa", padding: "3px 0",
                  borderBottom: `1px solid ${C.border}`,
                }}>→ {l}</div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes graphPulse {
          0%   { r: 13; opacity: 0.8; }
          100% { r: 22; opacity: 0; }
        }
        @keyframes edgeFade {
          from { opacity: 0; }
          to   { opacity: 0.6; }
        }
        @keyframes logFade {
          from { opacity: 0; transform: translateX(-4px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes blink {
          0%,100% { opacity: 1; } 50% { opacity: 0.3; }
        }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #12122a; border-radius: 2px; }
        button:hover { opacity: 0.82; }
      `}</style>
    </div>
  );
}
