# STP Concept Registry

The canonical namespace for STP concept identifiers.

Every concept referenced in an STP block uses a stable ID from this registry: `stp:domain.subdomain.NNN`

## Why a Registry?

Without a shared namespace, two agents calling the same thing by different names cannot compose their knowledge. The registry is the coordination layer — the thing that makes `stp:ai.ml.006` mean the same thing everywhere it appears.

## Structure

```
registry/
├── index.json              ← Master index: all domains, concept counts, metadata
└── concepts/
    ├── ai.ml.json          ← Machine learning concepts
    ├── ai.agents.json      ← AI agent concepts
    ├── ai.search.json      ← Search & retrieval concepts
    ├── data.graph.json     ← Graph & knowledge concepts
    ├── systems.network.json ← Networking & protocol concepts
    └── physics.quantum.json ← Quantum computing concepts
```

## Current Domains (v1.0)

| Domain | Label | Concepts |
|--------|-------|----------|
| `ai.ml` | Machine Learning | 6 |
| `ai.agents` | AI Agents | 5 |
| `ai.search` | Search & Retrieval | 3 |
| `data.graph` | Graph & Knowledge | 2 |
| `systems.network` | Networking & Protocols | 2 |
| `physics.quantum` | Quantum Computing | 2 |
| **Total** | | **20** |

## Concept Format

Each concept entry contains:

```json
{
  "id": "stp:ai.ml.006",
  "ref": "large_language_model",
  "label": "Large Language Model",
  "description": "...",
  "aliases": ["LLM", "foundation model"],
  "introduced": "2018",
  "canonical_ref": "https://arxiv.org/abs/..."
}
```

- `id` — stable, permanent, never reused
- `ref` — short slug used in STP blocks
- `aliases` — alternative names agents should recognize
- `canonical_ref` — authoritative external reference

## ID Assignment Rules

1. IDs are permanent. A retired concept gets `"deprecated": true`, never a deleted entry.
2. Sequential numbering within a domain: `001`, `002`, etc.
3. New domains require a spec amendment (PR to `spec/STP-0.1.md`).
4. Concepts must be domain-agnostic — they describe a thing, not a use of a thing.

## Contributing

Submit a PR with:
- The new concept added to the appropriate domain file
- `index.json` updated with the new concept count
- A brief justification for why this concept belongs in the core registry

Cross-domain concepts (e.g., `vector_embedding` spans `ai.ml`, `ai.search`, and `data.graph`) should be placed in their primary origin domain with aliases pointing agents to the canonical entry.
