---
description: Interpret SQL schemas and migrations as system documentation while separating enforced facts, inferred behavior, and unknown product intent
agents: [briefing]
task_types: [sql-source-analysis, database-reconstruction, legacy-system-briefing]
triggers: [SQL in selected Briefing source pack, schema SQL, SQL migrations, system reconstruction from database]
---

# SQL as System Documentation

Load only when `briefing:sources --slug={slug}` includes this module in `load_modules`. SQL is executable documentation of persisted structure and evolution; it is not automatically a complete product specification.

## Safety boundary

- Never execute SQL, connect to a database, restore a dump, or apply a migration.
- Never request, reproduce, or persist credentials or row-level personal/production data.
- Read only files with `load_policy=read`.
- For `metadata_only` SQL, use the inspector's structural signals and request a schema-only export only when the missing structure blocks a responsible briefing.
- Treat destructive statements as historical/current-state evidence, never as authorized implementation actions.

## Reconstruction order

1. Determine whether the SQL represents a current system, a desired blueprint, or history. Use explicit user framing first; ask only if the role is consequential and ambiguous.
2. Prefer a final schema/DDL snapshot as the current persisted shape when present.
3. Read migrations in `migration_order`; later operations may add, rename, transform, or remove earlier structures.
4. Reconcile final schema with migrations. Record unexplained drift rather than choosing silently.
5. Use safe auxiliary contracts, code, and notes to explain behavior that the database alone cannot prove.

## What SQL can prove

Extract and cite source paths for:

- domain entities, tables, columns, types, nullability, defaults, and generated values;
- primary/foreign keys, cardinality clues, unique/check constraints, and indexes;
- enums or state columns that constrain lifecycle;
- views, triggers, procedures, functions, events, and audit structures;
- tenant/owner boundaries represented structurally;
- migration chronology, renames, deprecations, and data-shape transitions;
- queue/outbox/integration tables and other persisted integration signals.

These are observed structural facts. Their product meaning can still be an inference.

## What SQL cannot prove alone

Do not invent:

- personas, permissions not structurally enforced, screens, navigation, or visual behavior;
- why the system exists or why it must be rebuilt;
- API semantics, notifications, background behavior, or external integrations without corroborating evidence;
- whether historical tables and columns remain desired;
- whether example/seed data represents mandatory product scope.

Put missing product intent and runtime behavior in classified open questions. A useful SQL-derived briefing reconstructs the supplied system first, then asks only for decisions the sources cannot answer.

## Evidence language

Use explicit labels while synthesizing:

```text
Observed — enforced or declared by SQL.
Strong inference — supported by compatible structures or multiple sources.
Hypothesis — plausible product meaning requiring confirmation.
Unknown — absent from the available evidence.
```

Never promote `Strong inference` or `Hypothesis` into the Source Promise Map as a required promise without user confirmation.

## Briefing mapping

- `## Context`: reconstructed system/domain and whether SQL is current state or target blueprint.
- `## Problem`: only evidence-backed pain/trigger; otherwise ask the one intent question.
- `## Proposed solution`: preserved target shape plus explicitly labeled hypotheses.
- `## Themes`: domain boundaries derived from related tables/contracts, not one theme per table.
- `## Risks`: incomplete migration order, schema drift, missing runtime rules, data sensitivity, destructive history, unsupported dialect.
- `## Identified gaps`: source contradictions and behavior not represented in SQL.
- `## Sources`: every SQL and auxiliary source with fingerprint, role, usage, and purpose.
- `## Open questions`: user-owned desired-state decisions and testable runtime unknowns.

The goal is a system-reconstruction briefing with traceable confidence, not a schema dump rewritten as prose.
