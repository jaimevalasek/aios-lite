# Iteration 57 — Comprehensive Improvements → v0.1.19

## Date
2026-03-03

## Summary
Post-0.1.18 quality sprint: 5 focused improvements discovered during the comprehensive 8.5/10 audit,
each committed independently for traceable history.

---

## Commits in this iteration

| Hash     | Description |
|----------|-------------|
| 465891e  | fix(context): enforce .md-only rule for .aios-lite/context/ across all agents |
| d404341  | fix(ux-ui): add explicit file location rule — HTML deliverables go to project root |
| f311874  | fix(ux-ui): save HTML deliverable to project root instead of .aios-lite/context/ |
| 486c793  | fix(dev): mark architecture.md and discovery.md as optional for MICRO projects |
| dbf27c9  | feat(cli): add test:agents command — structural validation of all agent files |
| 2d1ff53  | feat(cli): add locale:diff command — detect section drift between base and locale agents |
| 0ce3932  | feat(skills): add django-patterns.md and fastapi-patterns.md |
| f222c20  | feat(skills): expand dynamic skill stubs with concrete URLs and fetch guidance |

---

## Passo 1 — @dev MICRO fix (486c793)
**Problem**: MICRO projects skip @analyst and @architect, so `architecture.md` and `discovery.md`
are never generated. @dev was listing them as required inputs without qualification.

**Fix**: Marked both files as `*(SMALL/MEDIUM only)*` in @dev Required input section.
Added MICRO callout: "only `project.context.md` is guaranteed — infer direction from it directly."

Files: `template/.aios-lite/agents/dev.md` + en/pt-BR/es/fr locales (5 files)

---

## Passo 2 — test:agents command (dbf27c9)
**New file**: `src/commands/test-agents.js`

99 structural checks:
- 8 base agents × 4 checks (exists, has Mission, has Hard constraints, has .md-only rule) = 32
- 8 agents × 4 locales × 2 checks (file exists, language instruction in top 15 lines) = 64
- 3 critical skills exist = 3

Running the new command revealed 11 real gaps immediately fixed:
- @dev, @qa, @orchestrator base: missing .md-only rule
- @orchestrator base: `## Rules` renamed to `## Hard constraints`
- locale/en: 7 agents missing ABSOLUTE INSTRUCTION at top

Final score after fixes: 99/99 ✓

Also registered: cli.js routes, JSON_SUPPORTED_COMMANDS, help strings in all 4 i18n files.

---

## Passo 3 — locale:diff command (2d1ff53)
**New file**: `src/commands/locale-diff.js`

Compares `## heading` structure of base agent vs locale files.
Uses accent-normalized heading comparison (strips diacritics) for cross-language matching.

Usage:
```
aios-lite locale:diff              # all agents, all locales
aios-lite locale:diff dev          # only @dev
aios-lite locale:diff --lang pt-BR # only pt-BR locale
aios-lite locale:diff --json       # machine-readable output
```

Output: list of sections present in base but missing in locale. Helps distinguish intentional
simplifications from unintentional drift.

---

## Passo 4 — django-patterns.md + fastapi-patterns.md (0ce3932)
Two new static skill files (~340 lines each):

**django-patterns.md** covers:
- Project structure with apps/ layout
- TimestampMixin abstract base model
- Service layer pattern (fat service, thin view)
- DRF serializers with read_only_fields
- URL namespacing with app_name
- Settings split (base/dev/prod)
- Admin with @admin.register
- pytest-django fixtures

**fastapi-patterns.md** covers:
- Async project structure (api/v1/, core/, models/, schemas/, services/)
- pydantic-settings for config
- SQLAlchemy async engine + session factory
- Pydantic v2 input/output schema separation
- Service layer pattern
- JWT with HTTPBearer dependency
- Alembic async migration setup
- pytest + httpx AsyncClient + ASGITransport

---

## Passo 5 — dynamic skills expansion (f222c20)
Updated all 6 dynamic skill stubs to include:
- Source URL(s)
- Focus area
- MCP tool fetch example

New `README.md` explaining static vs dynamic pattern:
- Static skills: framework conventions, project structure, best practices
- Dynamic skills: current API signatures, latest package versions, changelog entries

---

## Bugs fixed earlier in this session (0.1.18)

### Language bug (31db051)
Root cause: language rule was at the BOTTOM of locale agent files. LLMs process top-to-bottom
and default to English during framework detection. Fix: added absolute language instruction
blockquote as first content after the `#` title in all 24 locale agent files.

### ux-ui HTML output path (f311874 + d404341)
Agent was hardcoding `.aios-lite/context/landing-preview.html`. Fixed to `index.html` at
project root + added semantic rule: `.aios-lite/context/` accepts ONLY `.md` files.

---

## Test results
```
aios-lite test:agents
✓ 99/99 checks passed
Score: 100%
```

## Version
0.1.18 → 0.1.19
