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
| Reading Layer | 🟡 In Progress |
| Concept Registry | ✅ v1.0 (23 concepts, 6 domains) |
| Confidence Propagation | ✅ Implemented |
| Conflict Resolution | 🟡 In Progress |
| Security Specification | 🔴 Required before Action Layer |
| Action Layer | 📋 Planned |
| Agent-to-Agent Protocol | 🔮 Future |

---

## Prototypes

Interactive demos built in React:

| Demo | Description |
|------|-------------|
| `stp-conflict-resolution.jsx` | 5-criteria deterministic conflict resolution engine with 4 live test cases |
| *(more coming)* | Reading layer, concept registry, confidence propagation, commerce action layer |

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
