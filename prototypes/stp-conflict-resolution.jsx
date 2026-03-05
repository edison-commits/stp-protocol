import { useState, useEffect, useRef } from "react";

// ─── CONFLICT RESOLUTION ENGINE ──────────────────────────────────────────────
//
// When two STP sources make contradictory assertions about the same concept,
// the engine runs them through a resolution pipeline with 5 weighted criteria.
//
// Resolution strategies (in order of invocation):
//   1. CONFIDENCE DELTA  — if one side's propagated confidence is meaningfully higher, it wins
//   2. DOMAIN AUTHORITY  — claims made within their own domain outweigh cross-domain claims
//   3. RECENCY          — more recent primary sources preferred for fast-moving concepts
//   4. SOURCE TYPE RANK — primary_research > empirical_study > review_paper > ... > speculation
//   5. CORROBORATION    — if additional independent sources back one side, it wins
//
// If all 5 criteria are inconclusive → UNRESOLVED (both claims flagged, agent must decide)

const SOURCE_TYPE_RANK = {
  primary_research:    5,
  empirical_study:     4,
  review_paper:        3,
  technical_report:    3,
  industry_report:     2,
  technical_blog:      2,
  news_article:        1,
  speculative_analysis:0,
};

const CONFIDENCE_DELTA_THRESHOLD = 0.10; // must differ by this much to be decisive
const RECENCY_THRESHOLD_DAYS = 365;       // within 1 year = too close to call on recency

function daysBetween(a, b) {
  return Math.abs(new Date(a) - new Date(b)) / (1000 * 60 * 60 * 24);
}

function domainMatch(claimDomain, sourceDomain) {
  return claimDomain.split(".")[0] === sourceDomain.split(".")[0];
}

function resolveConflict(conflict) {
  const { alpha, beta, concept_domain } = conflict;
  const criteria = [];
  let verdict = null;
  let winner = null;

  // ── 1. CONFIDENCE DELTA ────────────────────────────────────────
  const confDelta = Math.abs(alpha.confidence - beta.confidence);
  if (confDelta >= CONFIDENCE_DELTA_THRESHOLD) {
    const w = alpha.confidence > beta.confidence ? "alpha" : "beta";
    criteria.push({
      id: "confidence",
      label: "Confidence Delta",
      result: w,
      decisive: true,
      detail: `Δ${(confDelta * 100).toFixed(1)}% — threshold is ${CONFIDENCE_DELTA_THRESHOLD * 100}%`,
      alpha_val: `${(alpha.confidence * 100).toFixed(1)}%`,
      beta_val: `${(beta.confidence * 100).toFixed(1)}%`,
    });
    if (!verdict) { verdict = w; winner = w; }
  } else {
    criteria.push({
      id: "confidence",
      label: "Confidence Delta",
      result: "tie",
      decisive: false,
      detail: `Δ${(confDelta * 100).toFixed(1)}% — below threshold, inconclusive`,
      alpha_val: `${(alpha.confidence * 100).toFixed(1)}%`,
      beta_val: `${(beta.confidence * 100).toFixed(1)}%`,
    });
  }

  // ── 2. DOMAIN AUTHORITY ────────────────────────────────────────
  const alphaHome = domainMatch(concept_domain, alpha.domain);
  const betaHome  = domainMatch(concept_domain, beta.domain);
  if (alphaHome !== betaHome) {
    const w = alphaHome ? "alpha" : "beta";
    criteria.push({
      id: "domain",
      label: "Domain Authority",
      result: w,
      decisive: true,
      detail: alphaHome
        ? `${alpha.domain} is home domain for ${concept_domain} — ${beta.domain} is cross-domain`
        : `${beta.domain} is home domain for ${concept_domain} — ${alpha.domain} is cross-domain`,
      alpha_val: alphaHome ? "HOME" : "CROSS-DOMAIN",
      beta_val:  betaHome  ? "HOME" : "CROSS-DOMAIN",
    });
    if (!verdict) { verdict = w; winner = w; }
  } else {
    criteria.push({
      id: "domain",
      label: "Domain Authority",
      result: "tie",
      decisive: false,
      detail: `Both ${alphaHome ? "in" : "outside"} home domain — no differentiation`,
      alpha_val: alphaHome ? "HOME" : "CROSS-DOMAIN",
      beta_val:  betaHome  ? "HOME" : "CROSS-DOMAIN",
    });
  }

  // ── 3. RECENCY ─────────────────────────────────────────────────
  const ageDiff = daysBetween(alpha.published, beta.published);
  const newer = new Date(alpha.published) > new Date(beta.published) ? "alpha" : "beta";
  if (ageDiff > RECENCY_THRESHOLD_DAYS) {
    criteria.push({
      id: "recency",
      label: "Recency",
      result: newer,
      decisive: true,
      detail: `${Math.round(ageDiff / 365 * 10) / 10} year gap — recency is decisive`,
      alpha_val: alpha.published,
      beta_val:  beta.published,
    });
    if (!verdict) { verdict = newer; winner = newer; }
  } else {
    criteria.push({
      id: "recency",
      label: "Recency",
      result: "tie",
      decisive: false,
      detail: `${Math.round(ageDiff)} day gap — within ${RECENCY_THRESHOLD_DAYS} day threshold`,
      alpha_val: alpha.published,
      beta_val:  beta.published,
    });
  }

  // ── 4. SOURCE TYPE RANK ────────────────────────────────────────
  const alphaRank = SOURCE_TYPE_RANK[alpha.source_type] ?? 0;
  const betaRank  = SOURCE_TYPE_RANK[beta.source_type]  ?? 0;
  if (alphaRank !== betaRank) {
    const w = alphaRank > betaRank ? "alpha" : "beta";
    criteria.push({
      id: "source_type",
      label: "Source Type",
      result: w,
      decisive: true,
      detail: `Rank ${alphaRank} vs ${betaRank} — ${w === "alpha" ? alpha.source_type : beta.source_type} outranks`,
      alpha_val: `${alpha.source_type} (${alphaRank})`,
      beta_val:  `${beta.source_type} (${betaRank})`,
    });
    if (!verdict) { verdict = w; winner = w; }
  } else {
    criteria.push({
      id: "source_type",
      label: "Source Type",
      result: "tie",
      decisive: false,
      detail: `Both rank ${alphaRank} — no differentiation`,
      alpha_val: `${alpha.source_type} (${alphaRank})`,
      beta_val:  `${beta.source_type} (${betaRank})`,
    });
  }

  // ── 5. CORROBORATION ───────────────────────────────────────────
  const ac = alpha.corroborating_sources || 0;
  const bc = beta.corroborating_sources  || 0;
  if (ac !== bc) {
    const w = ac > bc ? "alpha" : "beta";
    criteria.push({
      id: "corroboration",
      label: "Corroboration",
      result: w,
      decisive: true,
      detail: `${ac} vs ${bc} independent corroborating sources`,
      alpha_val: `${ac} sources`,
      beta_val:  `${bc} sources`,
    });
    if (!verdict) { verdict = w; winner = w; }
  } else {
    criteria.push({
      id: "corroboration",
      label: "Corroboration",
      result: "tie",
      decisive: false,
      detail: `Both have ${ac} corroborating sources`,
      alpha_val: `${ac} sources`,
      beta_val:  `${bc} sources`,
    });
  }

  // ── FINAL VERDICT ──────────────────────────────────────────────
  const decisive_criteria = criteria.filter(c => c.decisive && c.result === winner);
  const tie_criteria      = criteria.filter(c => !c.decisive);

  return {
    criteria,
    verdict: winner || "unresolved",
    winning_source: winner ? (winner === "alpha" ? alpha : beta) : null,
    losing_source:  winner ? (winner === "alpha" ? beta : alpha) : null,
    decisive_on: decisive_criteria[0]?.label || null,
    first_decisive: decisive_criteria[0] || null,
    all_decisive: decisive_criteria,
    tied_criteria: tie_criteria.length,
    is_unresolved: !winner,
  };
}

// ─── SAMPLE CONFLICTS ─────────────────────────────────────────────────────────

const CONFLICTS = [
  {
    id: "c001",
    concept: "large_language_model",
    concept_id: "stp:ai.ml.006",
    concept_domain: "ai.ml",
    relation_type: "requires",
    target_concept: "training_data",
    description: "Does training on web-scale data remain necessary for capable LLMs?",
    alpha: {
      id: "src_a1",
      label: "Synthetic Data Sufficiency Study",
      claim: "LLMs trained exclusively on high-quality synthetic data match or exceed models trained on web-scale corpora for most reasoning tasks.",
      domain: "ai.ml",
      published: "2025-11-20",
      source_type: "empirical_study",
      confidence: 0.81,
      corroborating_sources: 3,
    },
    beta: {
      id: "src_b1",
      label: "Web-Scale Pretraining Survey",
      claim: "Web-scale pretraining remains essential — synthetic data introduces distribution collapse and reduces generalization to novel domains.",
      domain: "ai.ml",
      published: "2024-03-15",
      source_type: "review_paper",
      confidence: 0.76,
      corroborating_sources: 5,
    },
  },
  {
    id: "c002",
    concept: "quantum_computing",
    concept_id: "stp:physics.quantum.001",
    concept_domain: "physics.quantum",
    relation_type: "causes",
    target_concept: "cryptography_obsolescence",
    description: "Will quantum computers render current public-key cryptography obsolete within a decade?",
    alpha: {
      id: "src_a2",
      label: "NIST Post-Quantum Transition Report",
      claim: "Current RSA-2048 and ECC implementations will be vulnerable to cryptographically-relevant quantum computers within 10-15 years. Transition is urgent.",
      domain: "physics.quantum",
      published: "2024-08-01",
      source_type: "technical_report",
      confidence: 0.88,
      corroborating_sources: 6,
    },
    beta: {
      id: "src_b2",
      label: "Quantum Timelines Finance Analysis",
      claim: "Cryptographically-relevant quantum computing is 25+ years away. Current investment theses overstating near-term risk.",
      domain: "finance.ai",
      published: "2025-01-10",
      source_type: "industry_report",
      confidence: 0.61,
      corroborating_sources: 1,
    },
  },
  {
    id: "c003",
    concept: "agent",
    concept_id: "stp:ai.agents.001",
    concept_domain: "ai.agents",
    relation_type: "requires",
    target_concept: "memory",
    description: "Do capable AI agents fundamentally require persistent memory to function?",
    alpha: {
      id: "src_a3",
      label: "Stateless Agent Architecture Paper",
      claim: "Agents with no persistent memory and sufficient context window length match memory-augmented agents on 94% of benchmark tasks.",
      domain: "ai.agents",
      published: "2025-09-05",
      source_type: "primary_research",
      confidence: 0.84,
      corroborating_sources: 2,
    },
    beta: {
      id: "src_b3",
      label: "Long-Horizon Task Agent Study",
      claim: "For tasks exceeding 50 steps, agents without persistent memory fail 78% of the time due to context overflow and state inconsistency.",
      domain: "ai.agents",
      published: "2025-08-22",
      source_type: "empirical_study",
      confidence: 0.87,
      corroborating_sources: 2,
    },
  },
  {
    id: "c004",
    concept: "semantic_search",
    concept_id: "stp:ai.search.001",
    concept_domain: "ai.search",
    relation_type: "contradicts",
    target_concept: "keyword_search",
    description: "Has semantic search fully superseded keyword-based retrieval for enterprise use?",
    alpha: {
      id: "src_a4",
      label: "Enterprise Search Benchmark 2025",
      claim: "Hybrid retrieval (semantic + keyword BM25) outperforms pure semantic search on precision@10 for structured enterprise query sets.",
      domain: "ai.search",
      published: "2025-07-18",
      source_type: "empirical_study",
      confidence: 0.89,
      corroborating_sources: 4,
    },
    beta: {
      id: "src_b4",
      label: "Vector DB Marketing White Paper",
      claim: "Pure semantic search with modern embedding models renders BM25 obsolete in all enterprise retrieval scenarios.",
      domain: "finance.ai",
      published: "2025-06-01",
      source_type: "industry_report",
      confidence: 0.55,
      corroborating_sources: 0,
    },
  },
];

// ─── COLORS ───────────────────────────────────────────────────────────────────
const C = {
  bg:       "#06060b",
  surface:  "#0a0a12",
  border:   "#14141f",
  alpha:    "#60a5fa",
  beta:     "#fb923c",
  win:      "#34d399",
  lose:     "#f43f5e",
  tie:      "#5a5a78",
  unres:    "#facc15",
  muted:    "#3a3a55",
  text:     "#9090b8",
  bright:   "#d0d0e8",
};

function conf_color(v) {
  if (v >= 0.85) return C.win;
  if (v >= 0.70) return C.alpha;
  if (v >= 0.55) return C.unres;
  return C.lose;
}

function CriteriaBadge({ result }) {
  const map = {
    alpha:      { bg: C.alpha + "18", border: C.alpha + "40", text: C.alpha, label: "α WINS" },
    beta:       { bg: C.beta  + "18", border: C.beta  + "40", text: C.beta,  label: "β WINS" },
    tie:        { bg: C.tie   + "15", border: C.tie   + "30", text: C.tie,   label: "TIE" },
  };
  const s = map[result] || map.tie;
  return (
    <span style={{
      fontSize: 8, padding: "2px 7px",
      background: s.bg, border: `1px solid ${s.border}`,
      borderRadius: 3, color: s.text, letterSpacing: "0.12em",
      fontFamily: "'DM Mono', monospace",
    }}>{s.label}</span>
  );
}

function VerdictPanel({ resolution, conflict }) {
  const { verdict, winning_source, losing_source, decisive_on, is_unresolved } = resolution;
  const isAlphaWin = verdict === "alpha";
  const isBetaWin  = verdict === "beta";

  return (
    <div style={{
      background: is_unresolved
        ? `linear-gradient(135deg, ${C.unres}0a 0%, ${C.surface} 60%)`
        : isAlphaWin
          ? `linear-gradient(135deg, ${C.alpha}0a 0%, ${C.surface} 60%)`
          : `linear-gradient(135deg, ${C.beta}0a 0%, ${C.surface} 60%)`,
      border: `1px solid ${is_unresolved ? C.unres + "30" : isAlphaWin ? C.alpha + "30" : C.beta + "30"}`,
      borderRadius: 8, padding: "18px 20px",
    }}>
      <div style={{ fontSize: 8, letterSpacing: "0.2em", color: C.muted, marginBottom: 10 }}>
        RESOLUTION VERDICT
      </div>

      {is_unresolved ? (
        <>
          <div style={{
            fontSize: 22, fontWeight: 800, color: C.unres,
            fontFamily: "'Syne', sans-serif", marginBottom: 6,
          }}>UNRESOLVED</div>
          <div style={{ fontSize: 10, color: C.text, lineHeight: 1.6 }}>
            All 5 criteria were inconclusive. Both claims are preserved with CONTRADICTS relation.
            The agent must make its own determination based on task context.
          </div>
        </>
      ) : (
        <>
          <div style={{
            fontSize: 11, letterSpacing: "0.1em", marginBottom: 4,
            color: isAlphaWin ? C.alpha : C.beta,
          }}>
            {isAlphaWin ? "α ALPHA WINS" : "β BETA WINS"}
          </div>
          <div style={{
            fontSize: 16, fontWeight: 800, color: C.bright,
            fontFamily: "'Syne', sans-serif", lineHeight: 1.3, marginBottom: 8,
          }}>
            {winning_source?.label}
          </div>
          <div style={{
            fontSize: 10, color: C.text, fontStyle: "italic",
            lineHeight: 1.6, marginBottom: 10,
            borderLeft: `2px solid ${isAlphaWin ? C.alpha : C.beta}`,
            paddingLeft: 10,
          }}>
            "{winning_source?.claim}"
          </div>
          <div style={{
            fontSize: 9, color: C.muted,
            display: "flex", gap: 8, alignItems: "center",
          }}>
            <span>Decisive criterion:</span>
            <span style={{ color: isAlphaWin ? C.alpha : C.beta, fontWeight: 700 }}>
              {decisive_on}
            </span>
          </div>
          {losing_source && (
            <div style={{
              marginTop: 10, padding: "8px 10px",
              background: C.lose + "08", border: `1px solid ${C.lose}20`,
              borderRadius: 4, fontSize: 9, color: C.muted,
            }}>
              <span style={{ color: C.lose }}>✗ OVERRIDDEN: </span>
              {losing_source.label} — claim demoted to low-confidence annotation
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CriteriaRow({ criterion, index, animate }) {
  const isAlpha = criterion.result === "alpha";
  const isBeta  = criterion.result === "beta";
  const isTie   = criterion.result === "tie";
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (animate) {
      const t = setTimeout(() => setVisible(true), index * 180);
      return () => clearTimeout(t);
    } else {
      setVisible(true);
    }
  }, [animate, index]);

  return (
    <div style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(8px)",
      transition: "all 0.35s ease",
      background: C.surface,
      border: `1px solid ${criterion.decisive ? (isAlpha ? C.alpha + "30" : C.beta + "30") : C.border}`,
      borderRadius: 5, padding: "10px 14px",
      marginBottom: 6,
    }}>
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: "space-between", marginBottom: 6,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            fontSize: 9, color: C.muted, fontFamily: "'DM Mono', monospace",
            minWidth: 16,
          }}>
            {String(index + 1).padStart(2, "0")}
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.bright }}>
            {criterion.label}
          </span>
          {criterion.decisive && (
            <span style={{
              fontSize: 8, padding: "1px 6px",
              background: C.win + "15", border: `1px solid ${C.win}30`,
              borderRadius: 3, color: C.win, letterSpacing: "0.1em",
            }}>DECISIVE</span>
          )}
        </div>
        <CriteriaBadge result={criterion.result} />
      </div>

      {/* Alpha vs Beta values */}
      <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
        <div style={{
          flex: 1, padding: "5px 8px", borderRadius: 3,
          background: isAlpha ? C.alpha + "10" : C.bg,
          border: `1px solid ${isAlpha ? C.alpha + "30" : C.border}`,
          fontSize: 9, color: isAlpha ? C.alpha : C.muted,
        }}>
          <span style={{ color: C.alpha, marginRight: 4 }}>α</span>
          {criterion.alpha_val}
        </div>
        <div style={{ color: C.muted, fontSize: 10, alignSelf: "center" }}>vs</div>
        <div style={{
          flex: 1, padding: "5px 8px", borderRadius: 3,
          background: isBeta ? C.beta + "10" : C.bg,
          border: `1px solid ${isBeta ? C.beta + "30" : C.border}`,
          fontSize: 9, color: isBeta ? C.beta : C.muted,
          textAlign: "right",
        }}>
          {criterion.beta_val}
          <span style={{ color: C.beta, marginLeft: 4 }}>β</span>
        </div>
      </div>

      <div style={{ fontSize: 9, color: C.muted, fontStyle: "italic" }}>
        {criterion.detail}
      </div>
    </div>
  );
}

function SourceCard({ source, side, winner }) {
  const isWinner = winner === side;
  const c = side === "alpha" ? C.alpha : C.beta;
  const label = side === "alpha" ? "α ALPHA" : "β BETA";

  return (
    <div style={{
      background: C.surface,
      border: `1px solid ${isWinner ? c + "40" : C.border}`,
      borderRadius: 6, padding: "14px",
      position: "relative", overflow: "hidden",
    }}>
      {isWinner && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, transparent, ${c}, transparent)`,
        }} />
      )}

      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "flex-start", marginBottom: 10,
      }}>
        <span style={{
          fontSize: 9, padding: "2px 8px",
          background: c + "15", border: `1px solid ${c}30`,
          borderRadius: 3, color: c, letterSpacing: "0.12em",
        }}>{label}</span>
        {isWinner && (
          <span style={{
            fontSize: 9, padding: "2px 8px",
            background: C.win + "15", border: `1px solid ${C.win}30`,
            borderRadius: 3, color: C.win, letterSpacing: "0.1em",
          }}>ACCEPTED</span>
        )}
        {winner && !isWinner && (
          <span style={{
            fontSize: 9, padding: "2px 8px",
            background: C.lose + "10", border: `1px solid ${C.lose}20`,
            borderRadius: 3, color: C.lose, letterSpacing: "0.1em",
          }}>OVERRIDDEN</span>
        )}
      </div>

      <div style={{
        fontSize: 12, fontWeight: 700, color: C.bright,
        fontFamily: "'Syne', sans-serif", marginBottom: 6, lineHeight: 1.3,
      }}>
        {source.label}
      </div>

      <p style={{
        fontSize: 10, color: C.text, fontStyle: "italic",
        lineHeight: 1.6, marginBottom: 10,
        borderLeft: `2px solid ${c}50`, paddingLeft: 8,
      }}>
        "{source.claim}"
      </p>

      <div style={{
        display: "flex", flexWrap: "wrap", gap: 6, fontSize: 9, color: C.muted,
      }}>
        <span style={{ color: conf_color(source.confidence), fontWeight: 700 }}>
          {(source.confidence * 100).toFixed(0)}% conf
        </span>
        <span>·</span>
        <span>{source.domain}</span>
        <span>·</span>
        <span>{source.published}</span>
        <span>·</span>
        <span>{source.source_type.replace(/_/g, " ")}</span>
        <span>·</span>
        <span>{source.corroborating_sources} corroborating</span>
      </div>
    </div>
  );
}

function STPOutputPanel({ conflict, resolution }) {
  const { verdict, winning_source } = resolution;
  const isUnresolved = verdict === "unresolved";

  let stpBlock;
  if (isUnresolved) {
    stpBlock = `{
  "concept": "${conflict.concept}",
  "relation": "${conflict.relation_type}",
  "target": "${conflict.target_concept}",
  "status": "CONFLICT_UNRESOLVED",
  "claims": [
    {
      "source": "${conflict.alpha.id}",
      "confidence": ${conflict.alpha.confidence},
      "claim": "..."
    },
    {
      "source": "${conflict.beta.id}",
      "confidence": ${conflict.beta.confidence},
      "claim": "..."
    }
  ],
  "agent_instruction": "contradictory_claims_preserved"
}`;
  } else {
    const w = verdict === "alpha" ? conflict.alpha : conflict.beta;
    const l = verdict === "alpha" ? conflict.beta  : conflict.alpha;
    stpBlock = `{
  "concept": "${conflict.concept}",
  "relation": "${conflict.relation_type}",
  "target": "${conflict.target_concept}",
  "status": "RESOLVED",
  "accepted": {
    "source": "${w.id}",
    "confidence": ${w.confidence},
    "decisive_on": "${resolution.decisive_on}"
  },
  "overridden": {
    "source": "${l.id}",
    "confidence": ${l.confidence},
    "annotation": "low_confidence_minority_view"
  }
}`;
  }

  return (
    <div style={{
      background: "#04040a",
      border: `1px solid ${C.border}`,
      borderRadius: 6, padding: "14px",
    }}>
      <div style={{ fontSize: 8, letterSpacing: "0.2em", color: C.muted, marginBottom: 10 }}>
        STP OUTPUT BLOCK
      </div>
      <pre style={{
        fontSize: 9, color: C.win, fontFamily: "'DM Mono', monospace",
        lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all",
      }}>{stpBlock}</pre>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function ConflictResolution() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [running, setRunning] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [animateCriteria, setAnimateCriteria] = useState(false);
  const [customMode, setCustomMode] = useState(false);

  const conflict = CONFLICTS[activeIdx];
  const resolution = resolveConflict(conflict);

  const runResolution = () => {
    setShowResult(false);
    setAnimateCriteria(false);
    setRunning(true);
    setTimeout(() => {
      setRunning(false);
      setShowResult(true);
      setAnimateCriteria(true);
    }, 800);
  };

  useEffect(() => {
    setShowResult(false);
    setAnimateCriteria(false);
  }, [activeIdx]);

  const verdictColor = resolution.is_unresolved ? C.unres
    : resolution.verdict === "alpha" ? C.alpha : C.beta;

  return (
    <div style={{
      fontFamily: "'DM Mono', monospace",
      background: C.bg, minHeight: "100vh", color: C.text,
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Mono:ital,wght@0,300;0,400;1,300&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{
        borderBottom: `1px solid ${C.border}`,
        padding: "13px 22px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "rgba(4,4,9,0.95)",
        position: "sticky", top: 0, zIndex: 10,
        backdropFilter: "blur(10px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{
            fontSize: 13, fontWeight: 800, letterSpacing: "0.2em",
            color: "#d0d0f0", fontFamily: "'Syne', sans-serif",
          }}>STP</span>
          <span style={{ fontSize: 10, color: "#1e1e30", letterSpacing: "0.15em" }}>
            CONFLICT RESOLUTION / v1.0
          </span>
          <div style={{
            fontSize: 10, padding: "2px 8px",
            background: C.lose + "10", border: `1px solid ${C.lose}25`,
            borderRadius: 3, color: C.lose,
          }}>
            {CONFLICTS.length} ACTIVE CONFLICTS
          </div>
        </div>
        <div style={{ fontSize: 9, color: C.muted }}>
          5 RESOLUTION CRITERIA · DETERMINISTIC PIPELINE
        </div>
      </div>

      <div style={{ display: "flex", height: "calc(100vh - 49px)", overflow: "hidden" }}>

        {/* Sidebar — conflict list */}
        <div style={{
          width: 240, borderRight: `1px solid ${C.border}`,
          overflowY: "auto", padding: "14px 10px",
          background: "rgba(4,4,8,0.6)",
        }}>
          <div style={{
            fontSize: 8, letterSpacing: "0.2em", color: C.muted,
            marginBottom: 10, padding: "0 4px",
          }}>CONFLICT QUEUE</div>

          {CONFLICTS.map((c, i) => {
            const res = resolveConflict(c);
            const active = i === activeIdx;
            const vc = res.is_unresolved ? C.unres
              : res.verdict === "alpha" ? C.alpha : C.beta;

            return (
              <div
                key={c.id}
                onClick={() => setActiveIdx(i)}
                style={{
                  padding: "9px 10px", borderRadius: 5, cursor: "pointer",
                  background: active ? C.surface : "transparent",
                  border: `1px solid ${active ? C.border : "transparent"}`,
                  marginBottom: 4, transition: "all 0.15s",
                }}
              >
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  alignItems: "center", marginBottom: 4,
                }}>
                  <span style={{ fontSize: 9, color: C.muted, letterSpacing: "0.1em" }}>
                    {c.id.toUpperCase()}
                  </span>
                  <span style={{
                    fontSize: 8, padding: "1px 5px",
                    background: vc + "15", border: `1px solid ${vc}30`,
                    borderRadius: 2, color: vc,
                  }}>
                    {res.is_unresolved ? "???" : res.verdict === "alpha" ? "α" : "β"}
                  </span>
                </div>
                <div style={{
                  fontSize: 10, color: active ? C.bright : "#6060a0",
                  lineHeight: 1.4,
                }}>
                  {c.concept}
                </div>
                <div style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>
                  {c.relation_type} → {c.target_concept}
                </div>
              </div>
            );
          })}
        </div>

        {/* Main panel */}
        <div style={{ flex: 1, overflowY: "auto", padding: "18px" }}>

          {/* Conflict header */}
          <div style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 8, padding: "16px 18px", marginBottom: 14,
          }}>
            <div style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "flex-start", marginBottom: 8,
            }}>
              <div>
                <div style={{ fontSize: 9, color: C.muted, letterSpacing: "0.15em", marginBottom: 4 }}>
                  CONFLICT · {conflict.id.toUpperCase()} · {conflict.concept_id}
                </div>
                <div style={{
                  fontSize: 16, fontWeight: 800, color: C.bright,
                  fontFamily: "'Syne', sans-serif", lineHeight: 1.3,
                }}>
                  {conflict.description}
                </div>
              </div>
              <button
                onClick={runResolution}
                disabled={running}
                style={{
                  background: running
                    ? "rgba(96,165,250,0.05)"
                    : "rgba(96,165,250,0.12)",
                  border: `1px solid ${running ? C.border : C.alpha + "50"}`,
                  color: running ? C.muted : C.alpha,
                  padding: "8px 18px", borderRadius: 5, cursor: running ? "default" : "pointer",
                  fontSize: 10, letterSpacing: "0.12em",
                  fontFamily: "'DM Mono', monospace",
                  transition: "all 0.2s", minWidth: 120,
                }}
              >
                {running ? "RESOLVING..." : showResult ? "RE-RUN" : "▶ RESOLVE"}
              </button>
            </div>

            <div style={{ display: "flex", gap: 8, fontSize: 9, color: C.muted }}>
              <span>Concept domain:</span>
              <span style={{ color: C.alpha }}>{conflict.concept_domain}</span>
              <span>·</span>
              <span>Relation:</span>
              <span style={{ color: "#a78bfa" }}>{conflict.relation_type}</span>
              <span>·</span>
              <span>Target:</span>
              <span style={{ color: C.text }}>{conflict.target_concept}</span>
            </div>
          </div>

          {/* Source cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <SourceCard
              source={conflict.alpha}
              side="alpha"
              winner={showResult ? resolution.verdict : null}
            />
            <SourceCard
              source={conflict.beta}
              side="beta"
              winner={showResult ? resolution.verdict : null}
            />
          </div>

          {/* Resolution pipeline */}
          {!showResult && !running && (
            <div style={{
              padding: "40px 20px", textAlign: "center",
              color: C.muted, fontSize: 11, letterSpacing: "0.1em",
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 8,
            }}>
              PRESS RESOLVE TO RUN THE 5-CRITERIA PIPELINE
            </div>
          )}

          {running && (
            <div style={{
              padding: "40px 20px", textAlign: "center",
              color: C.alpha, fontSize: 11, letterSpacing: "0.15em",
              background: C.surface, border: `1px solid ${C.alpha}20`,
              borderRadius: 8,
            }}>
              <div style={{ marginBottom: 10 }}>RUNNING RESOLUTION PIPELINE</div>
              <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
                {[0,1,2,3,4].map(i => (
                  <div key={i} style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: C.alpha,
                    animation: `pulse 0.9s ease-in-out ${i * 0.15}s infinite alternate`,
                  }} />
                ))}
              </div>
            </div>
          )}

          {showResult && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

              {/* Criteria pipeline */}
              <div style={{
                background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: 8, padding: "14px 16px",
              }}>
                <div style={{
                  fontSize: 9, letterSpacing: "0.2em", color: C.muted, marginBottom: 12,
                }}>
                  RESOLUTION PIPELINE · 5 CRITERIA
                </div>
                {resolution.criteria.map((c, i) => (
                  <CriteriaRow
                    key={c.id}
                    criterion={c}
                    index={i}
                    animate={animateCriteria}
                  />
                ))}
              </div>

              {/* Verdict */}
              <VerdictPanel resolution={resolution} conflict={conflict} />

              {/* STP output */}
              <STPOutputPanel conflict={conflict} resolution={resolution} />

              {/* Stats row */}
              <div style={{
                display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8,
              }}>
                {[
                  { label: "DECISIVE CRITERIA", val: resolution.all_decisive.length, color: C.win },
                  { label: "TIED CRITERIA", val: resolution.tied_criteria, color: C.tie },
                  { label: "FIRST DECISIVE", val: resolution.decisive_on || "none", color: verdictColor },
                  { label: "STATUS", val: resolution.is_unresolved ? "UNRESOLVED" : "RESOLVED", color: resolution.is_unresolved ? C.unres : C.win },
                ].map((s, i) => (
                  <div key={i} style={{
                    background: C.surface, border: `1px solid ${C.border}`,
                    borderRadius: 5, padding: "10px 12px",
                  }}>
                    <div style={{ fontSize: 8, color: C.muted, letterSpacing: "0.12em", marginBottom: 5 }}>
                      {s.label}
                    </div>
                    <div style={{
                      fontSize: 14, fontWeight: 800, color: s.color,
                      fontFamily: "'Syne', sans-serif",
                    }}>
                      {s.val}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          from { opacity: 0.2; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1.1); }
        }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #18182a; border-radius: 2px; }
        button:hover:not(:disabled) { opacity: 0.85; }
      `}</style>
    </div>
  );
}
