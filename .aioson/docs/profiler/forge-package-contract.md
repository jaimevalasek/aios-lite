---
description: Profiler Forge modular persona Genome package, manifest, references, and compiler-visible behavior
agents: [profiler-forge]
task_types: [genome-generation, persona-forge, modular-genome]
triggers: [forge persona genome, generate genome from enriched profile, build modular genome]
paths: [.aioson/profiler-reports/*/enriched-profile.md, .aioson/genomes/*/SKILL.md]
---

# Profiler Forge Package Contract

Generate standard/deep persona and hybrid outputs as a folder:

```text
.aioson/genomes/{genome-slug}/
├── SKILL.md
├── manifest.json
└── references/
    ├── methodology.md
    ├── decision-weights.md
    ├── cognitive-profile.md
    ├── voice-dna.md
    ├── evidence-and-attribution.md
    └── consultation-playbook.md   # only when advisor-ready
```

Add more references only when they have distinct load triggers. Do not create one file per heading merely to appear modular.

## `manifest.json`

Use valid JSON:

```json
{
  "genome": "<genome-slug>",
  "domain": "<Person Name> — <domain>",
  "type": "persona",
  "version": 3,
  "format": "genome-v4-modular",
  "track": "4.2",
  "language": "<lang>",
  "depth": "deep",
  "evidence_mode": "evidenced",
  "generated": "<YYYY-MM-DD>",
  "last_updated": "<YYYY-MM-DD>",
  "confidence": "low|medium|high",
  "advisor_ready": false,
  "persona_source": "<Person Name>",
  "profiler_report": ".aioson/profiler-reports/<slug>/enriched-profile.md",
  "anchor_prompt": "<supported, 60 words maximum>",
  "not_for": [
    "<unsupported use>",
    "<high-risk use>",
    "<context outside evidence>"
  ],
  "references": [
    {
      "id": "methodology",
      "file": "references/methodology.md",
      "when": "Executing the persona's supported operating procedure and delivery checks",
      "load_priority": "high"
    },
    {
      "id": "decision-weights",
      "file": "references/decision-weights.md",
      "when": "Resolving trade-offs through supported frameworks, heuristics, and prohibitions",
      "load_priority": "high"
    },
    {
      "id": "cognitive-profile",
      "file": "references/cognitive-profile.md",
      "when": "A supported behavioral or trait interaction materially changes a decision",
      "load_priority": "medium"
    },
    {
      "id": "voice-dna",
      "file": "references/voice-dna.md",
      "when": "Communication style affects the requested output",
      "load_priority": "medium"
    },
    {
      "id": "evidence-and-attribution",
      "file": "references/evidence-and-attribution.md",
      "when": "Checking provenance, confidence, contradictions, limitations, or fidelity",
      "load_priority": "high"
    }
  ],
  "dependencies": {
    "skills": [],
    "genomes": []
  },
  "relations": [],
  "tags": ["persona", "<domain>"],
  "compatible_with": ["@genome", "squad-runtime"]
}
```

Use `type: "hybrid"` for a hybrid. Do not fabricate numeric fidelity/viability scores. Add `consultation-playbook` to `references` and set `advisor_ready: true` only when the file exists, voice evidence is adequate, `anchor_prompt` is supported, and `not_for` has at least three concrete limits.

Every reference object has `id`, contained relative `file`, meaningful `when`, and `load_priority`. Every declared file exists.

## `SKILL.md`

The light router contains:

- matching frontmatter identifiers and reference list;
- model disclaimer and evidence boundary;
- supported domain and intended use;
- concise core procedure/decision flow;
- hard restrictions;
- reference loading map;
- observable output contract and delivery checklist;
- limitations and handoff to evidence details.

It must remain useful without loading every reference but should not duplicate the deep evidence ledger.

## References

### `methodology.md`

Translate `Operational Method` into numbered executable steps with inputs, decision points, outputs, style metrics, prohibitions, and delivery checks. Preserve `inferred` labels.

### `decision-weights.md`

Encode supported frameworks, mental models, heuristics, values hierarchy, trade-offs, failure conditions, and precedence. Slogans without decision behavior do not belong here.

### `cognitive-profile.md`

Store only behavioral dimensions and evidence-supported psychometric/trait interactions that change operation. Include confidence and alternative explanations; never make the executor diagnose users.

### `voice-dna.md`

Encode audience-aware tone, structure, vocabulary, persuasion, pressure behavior, and signature patterns. Distinguish written/spoken/edited contexts.

### `evidence-and-attribution.md`

Map every major method/constraint/style claim to enriched-profile source IDs, confidence, contradiction, and limitation. Record unsupported areas the runtime must not fill from model priors.

### `consultation-playbook.md`

Only for advisor-ready output. Define Advisory, Challenge, Analysis, and current-information modes; questions, refusal/limitation behavior, re-anchoring, and memory boundaries.

## Update behavior

When the folder already exists, preserve provenance/history, compare the enriched-profile delta, update only affected references, and rerun doctor. Never overwrite unrelated project changes or silently reset a higher-confidence prior claim.
