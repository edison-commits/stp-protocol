# Semantic Transfer Protocol (STP)

**A machine-native protocol for structured semantic communication between AI agents.**

> *"The web was built for humans. Search engines retrofitted machine readability on top. STP asks a different question: what if we designed the data layer for agents first?"*

---

## The Problem

Every AI agent reads the same webpages and rebuilds the same semantic understanding from scratch. A 4,000-word article becomes ~40 semantic facts — after burning the full token budget to get there. The waste is structural. There is no shared semantic layer.

**STP is that layer.**

---

## What It Is

STP embeds a structured semantic block inside any webpage via a `<script type="application/stp+json">` tag. Browsers skip it. Agents parse it and skip the DOM entirely. Same URL, two audiences, zero new infrastructure.

Where HTML communicates *presentation* and JSON communicates *data*, STP communicates **meaning** — typed relationships between canonical concepts, with confidence scores and full provenance chains.

```html
<script type="application/stp+json">
{
  "stp": "0.1",
  "concepts": [
    { "id": "stp:ai.ml.006", "ref": "large_language_model", "weight": 1.0 }
  ],
  "relations": [
    {
      "from": "stp:ai.ml.006",
      "to": "stp:ai.ml.009",
      "type": "requires",
      "confidence": 0.85,
      "provenance": "https://arxiv.org/abs/2005.14165"
    }
  ]
}
</script>
```

---

## Status

| Layer | Status |
|-------|--------|
| Reading Layer | ✅ Implemented |
| Concept Registry | ✅ v1.0 (20 concepts, 6 domains) |
| Confidence Propagation | ✅ Implemented (5-rule engine) |
| Conflict Resolution | ✅ Implemented (5-criteria deterministic pipeline) |
| Temporal Relationships | ✅ Implemented (confidence drift 2022–2026) |
| Security Specification | ✅ Spec complete (8 threats, 9 mitigations) |
| Validator | ✅ Implemented (schema + injection scan) |
| Diff Engine | ✅ Implemented (semantic graph versioning) |
| Block Generator | ✅ Implemented (content → STP in 30s) |
| Action Layer | 🔴 Blocked — requires security spec Phase 0 |
| Agent-to-Agent Protocol | ✅ Prototype (2.7× compression, zero NL overhead) |
| W3C Standardization Track | 🔮 Future |

---

## Prototypes

Interactive demos — 12 artifacts, all runnable in browser:

| File | What It Does |
|------|-------------|
| `stp-conflict-resolution.jsx` | 5-criteria deterministic conflict engine, 4 live test cases |
| `stp-security-spec.jsx` | 8 threat classes, 9 mitigations, implementation roadmap |
| `stp-action-layer.jsx` | 5-step security pipeline, direct API execution |
| `stp-agent-to-agent.jsx` | Zero-NL agent messaging, 2.7× compression |
| `stp-unified-demo.jsx` | All layers end-to-end, 3.6× compression |
| `stp-crawler-simulator.jsx` | 112.5× compression, knowledge graph assembly |
| `stp-benchmark.jsx` | 21.8× faster vs conventional browser automation (9.27s → 0.42s) |
| `stp-generator.jsx` | Paste content → STP block in ~30 seconds |
| `stp-diff-engine.jsx` | Semantic graph versioning — git for STP blocks |
| `stp-validator.jsx` | Schema check, injection scan, registry compliance |
| `stp-temporal-graph.jsx` | AI/ML knowledge graph animated Jan 2022–Mar 2026 |

**Live demos:** [semanticweb.dev](https://semanticweb.dev)

---

## Concept Registry

The canonical namespace for STP concept IDs lives in its own dedicated repo: **[stp-registry](https://github.com/edison-commits/stp-registry)**

Every STP block references concepts by stable ID: `stp:ai.ml.006`, `stp:ai.agents.004`, etc. The registry is what makes those IDs mean the same thing everywhere.

**20 seed concepts across 6 domains** — `ai.ml`, `ai.agents`, `ai.search`, `data.graph`, `systems.network`, `physics.quantum`

→ [Browse the registry](https://github.com/edison-commits/stp-registry) · [Contribute a concept](https://github.com/edison-commits/stp-registry/blob/main/CONTRIBUTING.md)

---

## The 8 Relation Types

Deliberately small. Covers ~90% of agent communication needs.

`requires` · `supports` · `is_type_of` · `causes` · `contradicts` · `precedes` · `relates_to` · `refutes`

---

## Full Spec

→ [spec/STP-0.1.md](spec/STP-0.1.md)

---

## Blog

Updates published at [blog.idiotic.solutions](https://blog.idiotic.solutions)

---

## License

MIT — see [LICENSE](LICENSE)
