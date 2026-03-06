import { useState, useRef, useEffect } from "react";

// ─── STP BLOCK GENERATOR ─────────────────────────────────────────────────────
//
// Paste any URL or article text. Claude extracts concepts, infers typed
// relations, assigns confidence scores, and outputs a ready-to-deploy
// STP block — complete with signature stub, registry IDs, and embed code.
//
// This is the adoption unlock. 30 seconds from content to STP block.

const SYSTEM_PROMPT = `You are an STP (Semantic Transfer Protocol) block generator. Given article text or a page description, you extract semantic meaning and output a structured STP block.

STP is a machine-native protocol for AI agents. You output ONLY valid JSON — no markdown, no explanation, no preamble.

OUTPUT FORMAT (strict JSON):
{
  "stp_version": "0.1",
  "generated_at": "<ISO timestamp>",
  "domain": "<primary domain: ai.ml | ai.agents | ai.search | physics.quantum | finance.ai | medical | legal | ecommerce | science | news | general>",
  "source_type": "<primary_research | empirical_study | review_paper | technical_report | industry_report | technical_blog | news_article | documentation | speculative_analysis>",
  "title": "<concise page title>",
  "concepts": [
    {
      "id": "stp:<domain>.<subdomain>.<NNN>",
      "ref": "<snake_case_concept_name>",
      "weight": <0.0-1.0 importance on this page>,
      "aliases": ["<alias1>", "<alias2>"]
    }
  ],
  "relations": [
    {
      "from": "<concept_ref>",
      "to": "<concept_ref>",
      "type": "<requires|supports|is_type_of|causes|contradicts|precedes|relates_to|refutes>",
      "confidence": <0.0-1.0>,
      "conditions": ["<optional condition strings>"],
      "provenance": "<brief source description>"
    }
  ],
  "claims": [
    {
      "concept": "<concept_ref>",
      "assertion": "<one sentence factual claim from the text>",
      "confidence": <0.0-1.0>,
      "evidence_type": "<direct_statement|implied|quantitative|qualitative>"
    }
  ],
  "agent_hints": {
    "primary_topic": "<main subject in 3-5 words>",
    "key_takeaway": "<single most important claim in 10 words or less>",
    "section_count": <number of logical sections>,
    "action_relevance": ["<commerce|research|navigation|reference|comparison>"]
  },
  "stats": {
    "concept_count": <n>,
    "relation_count": <n>,
    "claim_count": <n>,
    "estimated_tokens_vs_html": "<X× compression>"
  }
}

RULES:
- Extract 3-8 concepts. Focus on the most semantically significant ones.
- Infer 3-10 typed relations. Be precise about relation types.
- Confidence scores should reflect actual certainty from the text, not be uniformly high.
- Use snake_case for all concept refs.
- concept IDs: use format stp:domain.subdomain.NNN (e.g. stp:ai.ml.006). Use realistic subdomain naming.
- Only output valid JSON. No markdown fences. No explanation.`;

// ─── SAMPLE INPUTS ───────────────────────────────────────────────────────────
const SAMPLES = [
  {
    label: "AI Research Paper",
    text: `Scaling Laws for Neural Language Models

We study empirical scaling laws for language model performance on the cross-entropy loss. The loss scales as a power-law with model size, dataset size, and the amount of compute used for training, with some trends spanning more than seven orders of magnitude. Other architectural details such as network width or depth have minimal effects within a wide range. Simple equations govern the dependence of overfitting on model/dataset size, and the dependence of training speed on model size. These relationships allow us to determine the optimal allocation of a fixed compute budget. Larger models are significantly more sample-efficient, such that optimally compute-efficient training involves training very large models on a relatively modest amount of data and stopping significantly before convergence. We find that the optimal model size scales roughly as a power of the compute budget C^0.7.`,
  },
  {
    label: "Product Page",
    text: `Carhartt Men's Loose Fit Heavyweight Short-Sleeve Pocket T-Shirt

Built for the job site, this heavyweight cotton t-shirt delivers the durability Carhartt is known for. Made from 6.75-ounce, 100% ring-spun cotton. Features a left chest pocket and a rib-knit collar. The relaxed fit allows freedom of movement. Triple-stitched main seams resist abrasion and the side seams prevent twisting. Available in regular and tall sizing. Machine washable. Tested to work safely with Class 2 and Class 3 safety vests. Works great as a standalone or as a base layer under Carhartt outerwear.`,
  },
  {
    label: "Medical Research",
    text: `Efficacy of mRNA COVID-19 Vaccines Against Severe Disease

We conducted a retrospective cohort study examining vaccine effectiveness against severe COVID-19 outcomes across 847,000 patients over 18 months. mRNA vaccines demonstrated 94.1% effectiveness against ICU admission in the first 6 months post-vaccination, declining to 67.4% at 12 months against the Delta variant and 44.2% against Omicron subvariants. Booster doses restored effectiveness to 88.3% against severe outcomes regardless of variant. Immunocompromised patients showed significantly reduced effectiveness (41.2% base, 76.8% with booster). Time since vaccination was the strongest predictor of waning immunity (HR 1.34 per month, 95% CI 1.28-1.41).`,
  },
  {
    label: "Technical Documentation",
    text: `Redis Cluster — Data Sharding

Redis Cluster automatically shards your data across multiple Redis nodes. The cluster uses hash slots — there are 16384 hash slots in Redis Cluster, and to compute what hash slot a given key maps to, we take the CRC16 of the key modulo 16384. Every node in a Redis Cluster is responsible for a subset of the hash slots. A cluster of 3 nodes might have node A covering hash slots 0 to 5500, node B covering slots 5501 to 11000, and node C covering slots 11001 to 16383. Moving hash slots from a node to another does not require stopping operations — it happens while the cluster is running. Nodes communicate using a gossip protocol to propagate information about the cluster state.`,
  },
];

// ─── COLORS ──────────────────────────────────────────────────────────────────
// Warm off-white / editorial / ink on paper
const C = {
  bg:       "#f5f2ed",
  surface:  "#faf8f5",
  card:     "#ffffff",
  border:   "#e2ddd6",
  border2:  "#ccc7bf",
  text:     "#4a4540",
  muted:    "#9a9490",
  dim:      "#c8c3bc",
  bright:   "#1a1714",
  ink:      "#2d2926",

  accent:   "#1d4ed8",
  green:    "#15803d",
  orange:   "#c2410c",
  red:      "#be123c",
  purple:   "#7c3aed",
  teal:     "#0f766e",

  REL: {
    requires:   "#1d4ed8",
    supports:   "#15803d",
    is_type_of: "#7c3aed",
    causes:     "#c2410c",
    contradicts:"#be123c",
    precedes:   "#0f766e",
    relates_to: "#9a9490",
    refutes:    "#be123c",
  },
};

function Chip({ label, color, bg, small }) {
  return (
    <span style={{
      fontSize: small ? 9 : 10,
      padding: small ? "1px 6px" : "2px 8px",
      background: bg || color + "12",
      border: `1px solid ${color}30`,
      borderRadius: 4,
      color,
      fontFamily: "'DM Mono', monospace",
      letterSpacing: "0.04em",
      whiteSpace: "nowrap",
    }}>{label}</span>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button onClick={copy} style={{
      background: copied ? C.green + "15" : C.surface,
      border: `1px solid ${copied ? C.green + "40" : C.border}`,
      color: copied ? C.green : C.muted,
      padding: "4px 10px", borderRadius: 4,
      cursor: "pointer", fontSize: 9,
      fontFamily: "'DM Mono', monospace",
      letterSpacing: "0.08em",
      transition: "all 0.2s",
    }}>
      {copied ? "✓ COPIED" : "COPY"}
    </button>
  );
}

function ConceptCard({ concept }) {
  return (
    <div style={{
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: 6, padding: "10px 12px",
      borderLeft: `3px solid ${C.accent}`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
        <div>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.ink, fontFamily: "'DM Mono', monospace" }}>
            {concept.ref}
          </span>
          {concept.aliases?.length > 0 && (
            <span style={{ fontSize: 9, color: C.muted, marginLeft: 8 }}>
              aka: {concept.aliases.slice(0,2).join(", ")}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <div style={{
            fontSize: 9, color: concept.weight >= 0.8 ? C.green : concept.weight >= 0.6 ? C.orange : C.muted,
            fontFamily: "'DM Mono', monospace",
          }}>
            {(concept.weight * 100).toFixed(0)}%
          </div>
        </div>
      </div>
      <div style={{ fontSize: 8, color: C.muted, fontFamily: "'DM Mono', monospace" }}>{concept.id}</div>
    </div>
  );
}

function RelationRow({ rel }) {
  const c = C.REL[rel.type] || C.muted;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "7px 10px",
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 5, flexWrap: "wrap",
    }}>
      <span style={{ fontSize: 10, color: C.ink, fontFamily: "'DM Mono', monospace" }}>
        {rel.from.replace(/_/g, " ")}
      </span>
      <span style={{
        fontSize: 8, padding: "2px 8px",
        background: c + "12", border: `1px solid ${c}30`,
        borderRadius: 3, color: c,
        fontFamily: "'DM Mono', monospace",
        letterSpacing: "0.06em",
      }}>
        {rel.type}
      </span>
      <span style={{ fontSize: 10, color: C.ink, fontFamily: "'DM Mono', monospace" }}>
        {rel.to.replace(/_/g, " ")}
      </span>
      <span style={{ marginLeft: "auto", fontSize: 9, color: rel.confidence >= 0.8 ? C.green : rel.confidence >= 0.6 ? C.orange : C.muted, fontFamily: "'DM Mono', monospace" }}>
        {(rel.confidence * 100).toFixed(0)}%
      </span>
    </div>
  );
}

function StatBox({ label, value, color }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 6, padding: "12px 14px", textAlign: "center",
    }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: color || C.accent, fontFamily: "'Fraunces', serif", lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 8, color: C.muted, marginTop: 4, letterSpacing: "0.1em" }}>{label}</div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function BlockGenerator() {
  const [input, setInput]         = useState("");
  const [url, setUrl]             = useState("");
  const [mode, setMode]           = useState("text"); // text | url
  const [generating, setGenerating] = useState(false);
  const [result, setResult]       = useState(null);
  const [error, setError]         = useState(null);
  const [tab, setTab]             = useState("overview"); // overview | raw | embed
  const [loadingSample, setLoadingSample] = useState(null);
  const [apiKey, setApiKey] = useState(import.meta.env.VITE_ANTHROPIC_API_KEY || "");
  const textareaRef = useRef(null);

  const loadSample = (sample, idx) => {
    setLoadingSample(idx);
    setMode("text");
    setInput(sample.text);
    setResult(null);
    setError(null);
    setTimeout(() => setLoadingSample(null), 300);
  };

  const generate = async () => {
    const content = mode === "text" ? input.trim() : `URL: ${url.trim()}\n\nPlease analyze this URL and generate an STP block based on the domain, typical content structure, and likely semantic content for this type of page.`;
    if (!content) return;

    setGenerating(true);
    setResult(null);
    setError(null);

    try {
      const resp = await fetch("/anthropic/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-allow-browser": "true" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2048,
          system: SYSTEM_PROMPT,
          messages: [{
            role: "user",
            content: `Generate an STP block for the following content:\n\n${content}\n\nRespond with ONLY the JSON object, no other text.`,
          }],
        }),
      });

      const data = await resp.json();
      const raw = data.content?.[0]?.text || "";

      // Strip any accidental markdown fences
      const clean = raw.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
      const parsed = JSON.parse(clean);
      parsed.generated_at = new Date().toISOString();
      setResult(parsed);
      setTab("overview");
    } catch (e) {
      setError(`Generation failed: ${e.message}`);
    } finally {
      setGenerating(false);
    }
  };

  // Build the full embeddable block
  const embedCode = result ? `<script type="application/stp+json">
${JSON.stringify({
  ...result,
  signature: {
    algorithm: "Ed25519",
    value: "REPLACE_WITH_ACTUAL_SIGNATURE",
    key_id: "YOUR_KEY_ID",
    note: "Sign this block with your domain's Ed25519 private key before deploying",
  },
}, null, 2)}
</script>` : "";

  const rawJson = result ? JSON.stringify(result, null, 2) : "";

  return (
    <div style={{
      fontFamily: "'Lato', sans-serif",
      background: C.bg, minHeight: "100vh", color: C.text,
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,700;0,900;1,400&family=DM+Mono:ital,wght@0,300;0,400;1,300&family=Lato:wght@300;400;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{
        borderBottom: `1px solid ${C.border}`,
        padding: "16px 28px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: C.card,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div>
            <span style={{
              fontSize: 18, fontWeight: 900, letterSpacing: "-0.02em",
              color: C.ink, fontFamily: "'Fraunces', serif",
            }}>STP</span>
            <span style={{
              fontSize: 11, color: C.muted,
              fontFamily: "'DM Mono', monospace",
              letterSpacing: "0.12em", marginLeft: 10,
            }}>BLOCK GENERATOR</span>
          </div>
          <div style={{ width: 1, height: 20, background: C.border }} />
          <div style={{ fontSize: 11, color: C.muted }}>
            Paste content. Get a deploy-ready STP block in seconds.
          </div>
        </div>
        <div style={{
          fontSize: 9, color: C.dim,
          fontFamily: "'DM Mono', monospace",
        }}>v0.1 · Powered by Claude</div>
      </div>

      <div style={{
        display: "grid", gridTemplateColumns: result ? "1fr 1.3fr" : "1fr",
        minHeight: "calc(100vh - 57px)",
        maxWidth: result ? "none" : 800,
        margin: result ? 0 : "0 auto",
      }}>

        {/* ── INPUT PANEL ── */}
        <div style={{
          padding: "24px 28px",
          borderRight: result ? `1px solid ${C.border}` : "none",
          display: "flex", flexDirection: "column", gap: 16,
        }}>

          {/* Mode toggle */}
          <div style={{ display: "flex", gap: 0 }}>
            {["text", "url"].map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                background: mode === m ? C.ink : C.surface,
                border: `1px solid ${C.border}`,
                borderRight: m === "text" ? "none" : undefined,
                color: mode === m ? C.bg : C.muted,
                padding: "6px 16px",
                borderRadius: m === "text" ? "4px 0 0 4px" : "0 4px 4px 0",
                cursor: "pointer", fontSize: 10,
                fontFamily: "'DM Mono', monospace",
                letterSpacing: "0.1em",
                transition: "all 0.15s",
              }}>{m === "text" ? "PASTE TEXT" : "URL"}</button>
            ))}
          </div>

          {/* Input */}
          {mode === "text" ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <label style={{ fontSize: 10, color: C.muted, letterSpacing: "0.1em" }}>
                  ARTICLE TEXT OR PAGE CONTENT
                </label>
                <span style={{ fontSize: 9, color: C.dim, fontFamily: "'DM Mono', monospace" }}>
                  {input.length.toLocaleString()} chars
                </span>
              </div>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Paste article text, page content, or any prose here…"
                style={{
                  flex: 1, minHeight: 220,
                  background: C.card, border: `1px solid ${C.border}`,
                  borderRadius: 6, padding: "14px 16px",
                  fontSize: 12, color: C.ink, lineHeight: 1.7,
                  fontFamily: "'Lato', sans-serif",
                  resize: "vertical", outline: "none",
                  transition: "border-color 0.2s",
                }}
                onFocus={e => e.target.style.borderColor = C.accent}
                onBlur={e => e.target.style.borderColor = C.border}
              />
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ fontSize: 10, color: C.muted, letterSpacing: "0.1em" }}>
                PAGE URL
              </label>
              <input
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://example.com/article"
                style={{
                  background: C.card, border: `1px solid ${C.border}`,
                  borderRadius: 6, padding: "10px 14px",
                  fontSize: 12, color: C.ink,
                  fontFamily: "'DM Mono', monospace",
                  outline: "none",
                }}
                onFocus={e => e.target.style.borderColor = C.accent}
                onBlur={e => e.target.style.borderColor = C.border}
              />
              <div style={{ fontSize: 10, color: C.dim, lineHeight: 1.6 }}>
                Claude will infer the likely semantic content based on domain, URL structure, and page type. For best results, paste the actual text.
              </div>
            </div>
          )}

          {/* Sample inputs */}
          <div>
            <div style={{ fontSize: 10, color: C.muted, letterSpacing: "0.1em", marginBottom: 8 }}>
              TRY A SAMPLE
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {SAMPLES.map((s, i) => (
                <button
                  key={i}
                  onClick={() => loadSample(s, i)}
                  style={{
                    background: loadingSample === i ? C.accent + "12" : C.surface,
                    border: `1px solid ${C.border}`,
                    color: loadingSample === i ? C.accent : C.muted,
                    padding: "5px 10px", borderRadius: 4,
                    cursor: "pointer", fontSize: 9,
                    fontFamily: "'DM Mono', monospace",
                    transition: "all 0.15s",
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* API Key input */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 9, letterSpacing: "0.12em", color: C.muted, marginBottom: 6 }}>ANTHROPIC API KEY</div>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="sk-ant-..."
              style={{
                width: "100%", padding: "9px 12px",
                background: C.bg, border: `1px solid ${C.border}`,
                borderRadius: 5, fontSize: 11, color: C.ink,
                fontFamily: "inherit", outline: "none",
              }}
            />
          </div>

          {/* Generate button */}
          <button
            onClick={generate}
            disabled={generating || (!input.trim() && !url.trim()) || !apiKey.trim()}
            style={{
              background: generating ? C.muted : C.ink,
              color: C.bg,
              border: "none", borderRadius: 6,
              padding: "13px 20px", cursor: generating ? "default" : "pointer",
              fontSize: 11, fontWeight: 700,
              letterSpacing: "0.08em",
              transition: "all 0.2s",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            {generating ? (
              <>
                <div style={{
                  width: 12, height: 12, borderRadius: "50%",
                  border: `2px solid ${C.bg}40`,
                  borderTopColor: C.bg,
                  animation: "spin 0.7s linear infinite",
                }} />
                GENERATING BLOCK…
              </>
            ) : (
              "GENERATE STP BLOCK →"
            )}
          </button>

          {error && (
            <div style={{
              padding: "10px 14px",
              background: C.red + "08", border: `1px solid ${C.red}25`,
              borderRadius: 5, fontSize: 10, color: C.red, lineHeight: 1.6,
            }}>{error}</div>
          )}

          {/* Protocol note */}
          {!result && (
            <div style={{
              borderTop: `1px solid ${C.border}`, paddingTop: 16,
              fontSize: 10, color: C.dim, lineHeight: 1.8,
            }}>
              <strong style={{ color: C.muted }}>What gets generated:</strong> canonical concept IDs,
              typed semantic relations, confidence scores, provenance, agent hints,
              and a ready-to-embed <code style={{ fontFamily: "'DM Mono', monospace", fontSize: 9 }}>&lt;script type="application/stp+json"&gt;</code> tag.
              Add your Ed25519 signature before deploying to production.
            </div>
          )}
        </div>

        {/* ── OUTPUT PANEL ── */}
        {result && (
          <div style={{
            padding: "24px 28px",
            display: "flex", flexDirection: "column", gap: 16,
            overflowY: "auto",
          }}>

            {/* Output header */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "flex-start",
            }}>
              <div>
                <div style={{ fontSize: 8, color: C.muted, letterSpacing: "0.15em", marginBottom: 4 }}>
                  GENERATED BLOCK
                </div>
                <div style={{
                  fontSize: 16, fontWeight: 900, color: C.ink,
                  fontFamily: "'Fraunces', serif", lineHeight: 1.3,
                }}>
                  {result.title}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                  <Chip label={result.domain} color={C.accent} small />
                  <Chip label={result.source_type?.replace(/_/g," ")} color={C.purple} small />
                  <Chip label={result.stats?.estimated_tokens_vs_html || "—"} color={C.green} small />
                </div>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              <StatBox label="CONCEPTS" value={result.concepts?.length || 0} color={C.accent} />
              <StatBox label="RELATIONS" value={result.relations?.length || 0} color={C.purple} />
              <StatBox label="CLAIMS" value={result.claims?.length || 0} color={C.teal} />
              <StatBox label="COMPRESSION" value={result.stats?.estimated_tokens_vs_html || "—"} color={C.green} />
            </div>

            {/* Agent hint */}
            {result.agent_hints && (
              <div style={{
                background: C.accent + "08", border: `1px solid ${C.accent}20`,
                borderRadius: 6, padding: "10px 14px",
                fontSize: 10, color: C.text, lineHeight: 1.7,
              }}>
                <span style={{ color: C.accent, fontWeight: 700 }}>Key takeaway: </span>
                {result.agent_hints.key_takeaway}
                <span style={{ color: C.muted, marginLeft: 12 }}>
                  · {result.agent_hints.primary_topic}
                </span>
              </div>
            )}

            {/* Tabs */}
            <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${C.border}` }}>
              {["overview", "raw", "embed"].map(t => (
                <button key={t} onClick={() => setTab(t)} style={{
                  background: "transparent",
                  border: "none",
                  borderBottom: `2px solid ${tab === t ? C.ink : "transparent"}`,
                  color: tab === t ? C.ink : C.muted,
                  padding: "8px 14px", cursor: "pointer",
                  fontSize: 10, fontFamily: "'DM Mono', monospace",
                  letterSpacing: "0.1em", marginBottom: -1,
                  transition: "all 0.15s",
                }}>{t.toUpperCase()}</button>
              ))}
            </div>

            {/* ── OVERVIEW TAB ── */}
            {tab === "overview" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                {/* Concepts */}
                <div>
                  <div style={{ fontSize: 10, color: C.muted, letterSpacing: "0.1em", marginBottom: 8 }}>
                    CONCEPTS ({result.concepts?.length})
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    {result.concepts?.map((c, i) => <ConceptCard key={i} concept={c} />)}
                  </div>
                </div>

                {/* Relations */}
                <div>
                  <div style={{ fontSize: 10, color: C.muted, letterSpacing: "0.1em", marginBottom: 8 }}>
                    RELATIONS ({result.relations?.length})
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {result.relations?.map((r, i) => <RelationRow key={i} rel={r} />)}
                  </div>
                </div>

                {/* Claims */}
                {result.claims?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, color: C.muted, letterSpacing: "0.1em", marginBottom: 8 }}>
                      KEY CLAIMS ({result.claims?.length})
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {result.claims?.map((cl, i) => (
                        <div key={i} style={{
                          padding: "8px 12px",
                          background: C.surface, border: `1px solid ${C.border}`,
                          borderRadius: 5, fontSize: 10, color: C.text,
                          lineHeight: 1.6, borderLeft: `3px solid ${C.teal}`,
                        }}>
                          <span style={{ color: C.teal, fontFamily: "'DM Mono', monospace", fontSize: 9 }}>
                            {cl.concept}
                          </span>
                          <span style={{ color: C.dim }}> · {(cl.confidence*100).toFixed(0)}% · {cl.evidence_type?.replace(/_/g," ")} </span>
                          <br />
                          {cl.assertion}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── RAW TAB ── */}
            {tab === "raw" && (
              <div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
                  <CopyButton text={rawJson} />
                </div>
                <pre style={{
                  background: C.card, border: `1px solid ${C.border}`,
                  borderRadius: 6, padding: "16px",
                  fontSize: 10, color: C.ink,
                  fontFamily: "'DM Mono', monospace",
                  lineHeight: 1.7, whiteSpace: "pre-wrap",
                  wordBreak: "break-all", margin: 0,
                  maxHeight: 480, overflowY: "auto",
                }}>{rawJson}</pre>
              </div>
            )}

            {/* ── EMBED TAB ── */}
            {tab === "embed" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{
                  background: C.orange + "08", border: `1px solid ${C.orange}20`,
                  borderRadius: 5, padding: "10px 14px",
                  fontSize: 10, color: C.orange, lineHeight: 1.6,
                }}>
                  ⚠ Replace <code style={{ fontFamily: "'DM Mono', monospace" }}>REPLACE_WITH_ACTUAL_SIGNATURE</code> with an Ed25519 signature of the canonical JSON before deploying. Unsigned blocks are read-only by STP agents.
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ fontSize: 10, color: C.muted, letterSpacing: "0.1em" }}>
                      PASTE INTO YOUR HTML <code style={{ fontFamily: "'DM Mono', monospace", fontSize: 9 }}>&lt;head&gt;</code>
                    </div>
                    <CopyButton text={embedCode} />
                  </div>
                  <pre style={{
                    background: "#1a1714", border: `1px solid #333`,
                    borderRadius: 6, padding: "16px",
                    fontSize: 9.5, color: "#b5b0a8",
                    fontFamily: "'DM Mono', monospace",
                    lineHeight: 1.7, whiteSpace: "pre-wrap",
                    wordBreak: "break-all", margin: 0,
                    maxHeight: 440, overflowY: "auto",
                  }}>{embedCode}</pre>
                </div>

                <div style={{
                  display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10,
                }}>
                  {[
                    { step: "01", label: "Paste into <head>", detail: "Place the script tag in your page's <head> element. Browsers ignore it." },
                    { step: "02", label: "Sign the block", detail: "Sign the JSON with your domain's Ed25519 key. STP agents verify before executing actions." },
                    { step: "03", label: "Register domain", detail: "Submit your domain to the STP registry to enable action layer and scope validation." },
                    { step: "04", label: "Monitor & update", detail: "Update the block when page content changes. Agents check freshness via timestamp." },
                  ].map((s, i) => (
                    <div key={i} style={{
                      padding: "10px 12px",
                      background: C.surface, border: `1px solid ${C.border}`,
                      borderRadius: 5,
                    }}>
                      <div style={{ fontSize: 9, color: C.accent, fontFamily: "'DM Mono', monospace", marginBottom: 4 }}>
                        {s.step}
                      </div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: C.ink, marginBottom: 3 }}>{s.label}</div>
                      <div style={{ fontSize: 9, color: C.muted, lineHeight: 1.5 }}>{s.detail}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: ${C.bg}; }
        ::-webkit-scrollbar-thumb { background: ${C.border2}; border-radius: 2px; }
        button:hover:not(:disabled) { opacity: 0.82; }
        textarea:focus, input:focus { outline: none; }
      `}</style>
    </div>
  );
}
