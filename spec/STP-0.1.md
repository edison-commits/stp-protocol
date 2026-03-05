# STP/0.1 — Semantic Transfer Protocol
**Version:** STP/0.1 — Draft  
**Date:** March 5, 2026  
**Authors:** London Park  
**Status:** Active Development — Reading Layer In Progress  
**Classification:** Design Document / Conceptual Prototype

---

> *"The web was built for humans. Search engines retrofitted machine readability on top. STP asks a different question: what if we designed the data layer for agents first, and let humans have a translation on request?"*

---

## 01. The Problem

The modern web was designed for human eyes. When an AI agent wants to read a webpage, it must reverse-engineer meaning from a presentation layer never intended for machines.

Current workarounds are inadequate:

| Approach | Limitation |
|----------|------------|
| **HTML Parsing** | Brittle. Breaks on redesigns. Cannot infer semantic relationships. |
| **LLM Comprehension** | Slow, expensive, token-heavy. 4,000 words → 40 semantic facts after burning full token budget. |
| **JSON-LD / Schema.org** | Designed for search snippets, not agent communication. Describes what a page *is*, not what it *means* relationally. |
| **llms.txt** | Content index only. No semantic relationships, confidence metadata, or typed logic. |
| **RAG Pipelines** | Every agent independently rebuilds the same semantic graph from the same source. Waste is structural. |

**The core insight:** there is no shared semantic layer. STP is that layer.

---

## 02. What STP Is

STP is a machine-native data format embedded in webpages via `<script type="application/stp+json">` tags. Browsers ignore it. Agents parse it and skip the DOM entirely.

Where HTML communicates *presentation* and JSON communicates *data*, **STP communicates meaning** — typed relationships between canonical concepts with embedded confidence and provenance.

### Core Design Principles

1. **Efficiency first.** Agents communicate in STP natively. Human translation is optional.
2. **Concepts as coordinates.** Every concept is a node with a canonical ID. Relationships are typed directed edges.
3. **Embedded, not external.** Same URL, two audiences.
4. **Piggyback on existing registries.** References schema.org, Wikipedia, arXiv, then adds a relationship layer.
5. **Progressive adoption.** Pages without STP degrade gracefully.

### Example STP Block

```json
{
  "stp": "0.1",
  "concepts": [
    { "id": "stp:ai.ml.006", "ref": "large_language_model", "weight": 1.0 },
    { "id": "stp:ai.ml.009", "ref": "training_data", "weight": 0.8 }
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
```

---

## 03. Protocol Architecture

STP is structured in three layers, designed to be independently adoptable:

### Layer 1 — Reading *(Active, in development)*
Agents read structured semantic data from webpages. Inherently safe — no actions can be triggered.

- Concept Registry
- Typed Relationships (8 types)
- Confidence Propagation
- Conflict Resolution *(in progress)*
- Webpage Embedding

### Layer 2 — Action *(Planned — requires security spec first)*
Agents execute structured operations via action manifests. Direct API calls — no browser automation, no DOM interaction.

### Layer 3 — Agent-to-Agent *(Future)*
Agents communicate directly using STP packets — no natural language intermediary.

---

## 04. The 8 Relation Types

Deliberately small to prevent vocabulary explosion. Covers ~90% of agent communication needs.

| Type | Meaning |
|------|---------|
| `requires` | A depends on B to function or exist |
| `supports` | A provides evidence or capability for B |
| `is_type_of` | A is a subclass or instance of B |
| `causes` | A produces or leads to B |
| `contradicts` | A and B make incompatible claims |
| `precedes` | A temporally or logically comes before B |
| `relates_to` | A and B share weak or undirected association |
| `refutes` | A provides evidence against B |

---

## 05. Concept Registry

Each concept has a canonical ID: `stp:domain.subdomain.NNN`

**v1.0 Taxonomy — 6 domains, ~23 concepts:**

| Domain | Area | Examples |
|--------|------|---------|
| `ai.ml` | Machine Learning | transformer, LLM, neural_network, RAG, fine_tuning |
| `ai.agents` | AI Agents | agent, memory, tool_use, reasoning, multi_agent |
| `ai.search` | Search & Retrieval | semantic_search, vector_embedding, retrieval |
| `data.graph` | Graph & Knowledge | knowledge_graph |
| `systems.network` | Networking | protocol |
| `physics.quantum` | Quantum | quantum_computing, error_correction |

---

## 06. Confidence Propagation

Confidence is a property of a claim *plus its entire citation chain*.

### The Five Rules

| Rule | Effect |
|------|--------|
| **Hop Decay** | ×0.88 per citation hop |
| **Age Decay** | −1.5% per year |
| **Cross-Domain Penalty** | −12% when domains differ |
| **Corroboration Boost** | +6% per independent domain, up to +20% |
| **Cycle Detection** | −40% on circular citation chains |

*The rules are the protocol. The values are the deployment decision — configurable per agent.*

---

## 07. Conflict Resolution

When two STP blocks make incompatible claims, the engine runs a 5-criteria deterministic pipeline:

1. **Confidence Delta** — if one side's propagated confidence differs by >10%, it wins
2. **Domain Authority** — claims within their home domain outweigh cross-domain claims
3. **Recency** — more recent primary sources preferred (>365 day gap required to be decisive)
4. **Source Type Rank** — `primary_research > empirical_study > review_paper > ... > speculation`
5. **Corroboration** — independent sources backing one side

If all 5 are inconclusive → **UNRESOLVED**: both claims preserved, agent decides based on task context.

---

## 08. Competitive Landscape

| Standard | Gap vs STP |
|----------|------------|
| **llms.txt** | Content index only. No semantic graph or confidence. |
| **JSON-LD / Schema.org** | No typed directional relationships or provenance chain. |
| **RDF / OWL** | Correct intuition, failed on adoption. STP is lighter and agent-native. |
| **MCP / A2A** | Transport + capability layer. Complementary — does not address *what* agents communicate. |

---

## 09. Security Considerations

The reading layer is inherently safe. The action layer requires a **complete security specification before any implementation**.

**Identified threat surface:** Action Spoofing, Prompt Injection via STP, Silent Redirect, Scope Creep, Cross-Site STP Forgery.

**Required mitigations before action layer:**
- Cryptographic block signing (unsigned = read-only)
- Domain-scoped action allowlists
- Payment data isolation
- Human confirmation gates for monetary/account actions
- Concept sanitization against instruction injection

---

## 10. Roadmap

**Phase 1 — Complete Reading Layer**
- [ ] Conflict Resolution Engine
- [ ] Temporal Relationships
- [ ] Versioning & Staleness
- [ ] Confidence Decay Profiles

**Phase 2 — Security Specification**
- [ ] Formal Security Spec
- [ ] Cryptographic Signing Reference Implementation
- [ ] Injection Defense Spec

**Phase 3 — Action Layer**
- [ ] Action Manifest Standard
- [ ] Shopify Plugin (auto-generate STP commerce blocks)
- [ ] Agent Auth Framework

**Phase 4 — Agent-to-Agent Protocol**
- [ ] Pure STP Messaging
- [ ] Capability Negotiation
- [ ] W3C Standardization Track

---

## License

MIT License — see [LICENSE](../LICENSE)
