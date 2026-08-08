---
description: Heterogeneous Briefing source-pack discovery, logical organization, progressive loading, evidence reconciliation, and safety
agents: [briefing]
task_types: [briefing-source-selection, briefing-source-pack, briefing-evidence-synthesis]
triggers: [plans slug directory, mixed source files, non-Markdown source, SQL source, unorganized source pack]
---

# Briefing Source-Pack Intake

Load this module after a `plans/{slug}/` candidate is named or selected. The user's physical organization is never a prerequisite: discover and organize sources logically without moving, renaming, rewriting, or requiring a user-authored manifest.

## Deterministic discovery gate

Before reading source content, use the CLI-owned inventory:

```bash
# Selection view: directory packs plus backward-compatible loose plans/* files
aioson briefing:sources . --json

# Detailed view after one kebab-case pack slug is selected
aioson briefing:sources . --slug={slug} --json
```

Discovery omits conventional archive roots (`plans/done/`, `archive/`, `archives/`, and `archived/`) from new-pack candidates and reports them in `ignored_directories`. It never deletes or rewrites them.

The detailed result is the loading contract:

- `files`: every non-housekeeping physical source with path, SHA-256, type, role, load policy, and warnings;
- `logical_groups`: derived organization only; it never changes `plans/{slug}/`;
- `migration_order`: deterministic SQL migration order when detectable;
- `load_modules`: extra interpretation modules justified by the selected file types;
- `needs_intent_question`: no source currently explains the desired outcome;
- `blocked`, skipped-directory, symlink, large-file, and SQL-data warnings.

Do not use `context:search` or `context:select` as proof that a non-Markdown source is absent; semantic recall intentionally indexes Markdown only. Use `briefing:sources` for physical source truth.

If the command is unavailable, perform the same read-only recursive inventory manually, including file sizes and SHA-256, and apply the policies below. Never silently fall back to `plans/*.md` only.

## Logical organization

Treat paths and detected types as routing hints, then verify each role from evidence:

| Role | Meaning | Typical evidence |
|---|---|---|
| `intent` | desired problem/outcome or owner notes | brief, notes, requirements, README |
| `contract` | explicit system/API/data contract | OpenAPI, JSON Schema, GraphQL, Proto, Prisma |
| `current_state` | implemented or supplied system shape | schema SQL, source code, configuration |
| `history` | chronological evolution | migrations, changelogs |
| `example` | illustrative, never automatically required | samples, fixtures, seeds, payloads |
| `reference` | human/visual supporting material | PDF, image, diagram |
| `auxiliary` | useful context without stronger authority | miscellaneous supported text |
| `blocked` | unsafe or unreadable content | secrets, credentials, databases, archives, binaries |

Do not infer authority from extension alone. A `schema.sql` may describe the current system or the desired blueprint; determine which from the user's request and surrounding evidence. Ask one focused question only when that distinction changes the resulting system and no artifact answers it.

## Progressive loading

1. Read `intent` and `contract` sources marked `load_policy=read`.
2. Read `current_state` sources needed to reconstruct the supplied system.
3. Apply specialized modules from `load_modules` before interpreting their source type.
4. Read `history` in the reported order and only as far as needed to resolve the final state.
5. Use examples and auxiliary sources to corroborate behavior, never to create requirements by themselves.
6. Use metadata-only references through an available safe viewer/parser; otherwise record the limitation.

Never read `load_policy=blocked`. Never read row-level content from a SQL/data dump merely because it is present. If a source is too large, preserve its inventory row, use safe structural metadata, and state what could not be inspected.

## Evidence reconciliation

For every material claim, maintain one of four evidence levels:

- **Observed:** stated directly or structurally enforced by a source.
- **Strong inference:** supported by multiple compatible source facts but not explicit.
- **Hypothesis:** plausible interpretation that changes scope and needs confirmation.
- **Unknown:** not represented by available sources.

When sources disagree, cite both paths and put the contradiction in `## Identified gaps` or `## Open questions`. Never resolve a desired-state/current-state conflict silently. Explicit user intent describes the desired outcome; implementation/schema evidence describes the supplied system unless the user identifies it as the target blueprint.

## Source Inventory contract

Inventory every file returned in `files`, including metadata-only and blocked entries. Extra columns are allowed while preserving the canonical required columns:

```markdown
| Source | Path | Type | Role | Fingerprint | Usage | Purpose |
|---|---|---|---|---|---|---|
| SRC-001 | plans/{slug}/schema.sql | sql_schema | current_state | sha256:... | consulted | Reconstruct persisted domain constraints |
| SRC-002 | plans/{slug}/dump.sql | sql_data | example | sha256:... | metadata_only | Row content excluded; structural signals only |
```

Use `consulted`, `metadata_only`, or `blocked` for `Usage`. Never copy secret content into the briefing. Preserve every material promise in the Source Promise Map, but do not create a promise from a fixture, example, inferred UI, or historical migration alone.

## Completion gate

Do not write the briefing until:

- the selected pack has a complete deterministic inventory;
- every returned source has a disposition;
- specialized modules reported by the inspector were loaded;
- conflicts, blocked sources, and unreadable evidence are visible;
- facts, inferences, hypotheses, and unknowns are separated;
- the user's desired outcome is known, or exactly one intent question is asked before writing.
