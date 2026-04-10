# Spec-Kit Deep Analysis — GitHub's Spec-Driven Development Toolkit

**Date:** 2026-04-02
**Purpose:** Architectural deep-dive into github/spec-kit for AIOSON improvement opportunities
**Sources:** WebFetch from github.com/github/spec-kit (README, AGENTS.md, spec-driven.md, templates, extensions API)

---

## 1. Executive Summary

**Spec-Kit** (github/spec-kit, ~84.7k stars) is GitHub's official toolkit for **Spec-Driven Development (SDD)** — a methodology where specifications are the primary artifact that generates implementations, not just documents them. It provides a structured workflow with command-line tools, extension catalogs, and AI agent integrations.

**AIOSON** is a multi-agent orchestration framework with 22+ specialized agents, squad coordination, and context optimization — already partially spec-driven but lacking formal artifact contracts and extension system.

**Key insight:** Spec-Kit's most transplantable innovations are: (1) **constitution-driven quality gates**, (2) **executable task lists from specs**, (3) **extension/preset system for customization**, (4) **multi-agent command registration**, and (5) **formal artifact templates with completeness checklists**.

---

## 2. Spec-Kit Architecture

### 2.1 Core Workflow (6 Steps)

```
1. Install Specify CLI     → uv tool install specify-cli
2. Create Constitution     → /speckit.constitution (project principles)
3. Write Spec             → /speckit.specify (feature description)
4. Make Technical Plan     → /speckit.plan (architecture)
5. Break Into Tasks       → /speckit.tasks (executable checklist)
6. Execute                → /speckit.implement (build)
```

### 2.2 File Format System

**Constitution** (`speckit.constitution`):
- 9 articles governing development principles
- Library-first, CLI interface, test-first, simplicity (max 3 projects), anti-abstraction, integration-first
- Acts as legal framework that all specs must pass

**Spec** (`speckit.specify`):
- User scenarios with Given/When/Then acceptance tests
- Functional requirements (FR-001 onward)
- Key entities for data modeling
- Success criteria (SC-001 onward) — measurable, technology-agnostic
- Independent testability requirement

**Plan** (`speckit.plan`):
- Constitutional gate check (must pass before Phase 0 research)
- Technical context (language, dependencies, storage, testing, platform)
- Project structure decision (single/web mobile/api)
- Complexity tracking table (violations + why + simpler alternative rejected)

**Tasks** (`speckit.tasks`):
- Phase-organized (Setup → Foundational → User Stories → Polish)
- `[P]` parallel marker, `[Story]` linkage
- Each story independently testable
- Tests written first, must fail before implementation

### 2.3 Extension System

**Architecture:**
```
extensions/
  catalog.json           → Organization's curated (empty by default)
  catalog.community.json → 50+ community extensions
  selftest/              → Self-testing utility extension
  template/              → Extension template for developers
  EXTENSION-API-REFERENCE.md
  EXTENSION-DEVELOPMENT-GUIDE.md
  EXTENSION-PUBLISHING-GUIDE.md
  EXTENSION-USER-GUIDE.md
  RFC-EXTENSION-SYSTEM.md
```

**Extension Manifest (`extension.yml`):**
```yaml
extension:
  id: my-extension
  name: My Extension
  version: 1.0.0  # SEMVER, not v1.0
  description: ...
  author: ...
  repository: ...
  license: MIT
provides:
  commands:
    - speckit.my-extension.cmd1
    - speckit.my-extension.cmd2
defaults:
  config_key: default_value
```

**Installation:**
```bash
specify extension search     # Browse catalogs
specify extension add <name>  # From catalog
specify extension add <name> --from <url>  # Direct URL
```

**Hook System:**
- Lifecycle hooks: `after_specify`, `after_plan`, `after_tasks`, `after_implement`
- Mandatory vs optional hooks
- Stored in `.specify/extensions.yml`

**Configuration Layers (4 levels, priority order):**
1. Extension defaults in `extension.yml`
2. Project config: `{extension-id}-config.yml`
3. Local override: `{extension-id}-config.local.yml` (gitignored)
4. Environment variables: `SPECKIT_{EXTENSION}_{KEY}`

### 2.4 Preset System

**Purpose:** Customize terminology, templates, and commands without modifying core files.

**Resolution:** Priority-based stack (lower number wins), full override not merge.

**Files in presets/:**
- `scaffold/` — Project scaffolding templates
- `self-test/` — Self-validation preset
- `ARCHITECTURE.md` — Preset system design
- `PUBLISHING.md` — How to publish presets
- `catalog.json` / `catalog.community.json`

### 2.5 Templates

```
templates/
  agent-file-template.md
  checklist-template.md
  constitution-template.md
  plan-template.md
  spec-template.md
  tasks-template.md
  vscode-settings.json
  commands/              # Command-related templates
```

**Spec Template sections:**
- Header (feature name, branch, status, input args)
- User Scenarios & Testing (P1/P2/P3 prioritization, Given/When/Then)
- Requirements (FR-001 onward, Key Entities)
- Success Criteria (SC-001 onward — measurable outcomes)
- Assumptions

**Plan Template sections:**
- Constitutional gate check
- Technical context (all domain-specific fields)
- Project structure (with 3 options: single/web-app/mobile+api)
- Complexity tracking table

**Constitution Template:**
- Core principles section (5 named principles)
- Additional sections (named by project)
- Governance rules
- Version/ratification tracking

**Tasks Template:**
- 4 phases: Setup → Foundational → User Stories → Polish
- Dependency tracking (Setup → Foundational → all stories)
- Parallel markers, story linkage

### 2.6 Multi-Agent Integration

**Supported agents (25+):**

CLI-based: Claude Code, Gemini CLI, Qwen Code, opencode, Codex CLI, Junie, Auggie, CodeBuddy, Qoder, Kiro CLI, Amp, SHAI, Tabnine, Kimi Code, Mistral Vive, Pi, iFlow

IDE-based: GitHub Copilot, Cursor, Windsurf, Kilo Code, Roo Code, IBM Bob, Trae, Antigravity

**Agent Configuration in `src/specify_cli/agents.py`:**
```python
AGENT_CONFIG = {
    "cli-tool-name": {
        "name": "Display Name",
        "folder": ".agentfolder/",
        "commands_subdir": "commands",  # or workflows/prompts/skills
        "install_url": "https://...",
        "requires_cli": True,
    },
}
```

**Directory conventions per agent:**
| Agent | Directory |
|-------|-----------|
| Most CLI | `.<agent>/commands/` |
| opencode | `.opencode/command/` (singular) |
| Tabnine | `.tabnine/agent/commands/` |
| Codex | `.agents/skills/` |
| Copilot | `.github/agents/` |
| Windsurf | `.<name>/workflows/` |

**Command file formats:**
- Markdown with YAML frontmatter + `$ARGUMENTS`
- TOML with `{{args}}` (Gemini, Tabnine)

---

## 3. Gap Analysis — Spec-Kit vs AIOSON

### 3.1 Artifact Contract Strength

| Aspect | Spec-Kit | AIOSON | Gap |
|--------|----------|--------|-----|
| Constitution | 9-article legal framework, gate-checked | None — no formal principles doc | **HIGH** |
| Spec format | Formal with FR-001/SC-001 IDs, Given/When/Then | `prd*.md`, `discovery.md` loose formats | **HIGH** |
| Plan format | Structured with complexity tracking | `implementation-plan*.md` varies by agent | **MEDIUM** |
| Task format | Executable checklist from plan | `tasks.md` informal | **HIGH** |
| Output contracts | Agent files have formal contracts | Agent files have informal contracts | **MEDIUM** |

### 3.2 Quality Gates

| Aspect | Spec-Kit | AIOSON | Gap |
|--------|----------|--------|-----|
| Constitution gate | Must pass before Phase 0 | None | **HIGH** |
| Test-first enforcement | No code before tests approved | TDD gate exists but enforcement unclear | **MEDIUM** |
| Completeness checklist | Formal in templates | None | **HIGH** |
| Independent testability | Required for user stories | Not enforced | **MEDIUM** |

### 3.3 Extension/Plugin System

| Aspect | Spec-Kit | AIOSON | Gap |
|--------|----------|--------|-----|
| Plugin manifest | YAML with full metadata | Squad manifest (JSON) | **MEDIUM** |
| Plugin discovery | Catalog system with search | Manual installation | **HIGH** |
| Lifecycle hooks | after_specify, after_plan, etc. | `hooks:emit` basic | **HIGH** |
| Config layers | 4-level priority override | Shallow override only | **HIGH** |
| Community catalog | 50+ extensions | No catalog system | **HIGH** |

### 3.4 Multi-Agent Support

| Aspect | Spec-Kit | AIOSON | Gap |
|--------|----------|--------|-----|
| Agent registration | 25+ agents with format auto-detect | 22 agents, manual config | **LOW** |
| Command registration | Automatic per-agent directory mapping | Via AGENTS.md only | **MEDIUM** |
| Preset system | Terminology/template customization | No preset system | **HIGH** |
| Agent config file | TOML/MD auto-conversion | MD only | **MEDIUM** |

### 3.5 Template System

| Aspect | Spec-Kit | AIOSON | Gap |
|--------|----------|--------|-----|
| Template catalog | 7 files + commands/ | Minimal template system | **HIGH** |
| Template inheritance | Project → preset → extension → core | No inheritance | **HIGH** |
| VSCode settings | Included in template | No VSCode integration | **MEDIUM** |
| Checklist template | Formal with P1/P2/P3 | No formal checklist | **HIGH** |

---

## 4. Transplantable Patterns

### 4.1 Constitution Framework (HIGH PRIORITY)

**Spec-Kit approach:**
- `/speckit.constitution` with 9 articles
- Constitutional gate check in `/speckit.plan`
- Articles enforce: Library-first, CLI-first, Test-first, Simplicity (≤3 projects), Anti-abstraction, Integration-first

**AIOSON opportunity:**
- Create `.aioson/constitution.md` with AIOSON-specific principles
- Integrate as gate in `workflow:next` before agent handoffs
- Principles should complement, not conflict with, existing agent rules

**Recommended AIOSON constitution articles:**
1. **Spec-first** — Features begin as specs, not code
2. **Small solution** — Complexity must match problem size (existing philosophy)
3. **Observable** — All agent actions emit runtime telemetry
4. **Testable** — Each feature spec must have independently verifiable acceptance criteria
5. **Handoff-clean** — Artifacts must be self-contained for next agent

### 4.2 Formal Spec Template with IDs (HIGH PRIORITY)

**Spec-Kit approach:**
- FR-001, FR-002... for functional requirements
- SC-001, SC-002... for success criteria
- Given/When/Then acceptance scenarios
- Edge cases section

**AIOSON opportunity:**
- Strengthen `discovery.md` and `spec-{slug}.md` templates with ID systems
- Already partially done in `plans/33-IMPL-spec-driven-aioson.md` with REQ-{slug}-{N}, AC-{slug}-{N}
- Need to integrate into actual agent templates

### 4.3 Executable Task List (HIGH PRIORITY)

**Spec-Kit approach:**
- `/speckit.tasks` generated from `/speckit.plan`
- Phase-organized: Setup → Foundational → User Stories → Polish
- `[P]` parallel marker, `[Story]` linkage
- Each story independently testable

**AIOSON opportunity:**
- Create `squad:tasks` command that generates task list from implementation-plan
- Add phase gates to `implementation-plan*.md`
- Integrate with `squad:autorun` for task-level execution

### 4.4 Extension System Architecture (MEDIUM PRIORITY)

**Spec-Kit approach:**
- `extension.yml` manifest
- Hook system: after_specify, after_plan, after_tasks, after_implement
- 4-level config override
- Catalog-based discovery

**AIOSON opportunity:**
- AIOSON skills already exist but lack:
  - Formal manifest structure
  - Lifecycle hooks (only `hooks:emit` basic)
  - Catalog/discovery system
  - Multi-level config override

### 4.5 Preset System (MEDIUM PRIORITY)

**Spec-Kit approach:**
- Customize terminology, templates, commands
- Priority-based stack (lower wins)
- Full override not merge

**AIOSON opportunity:**
- Create `presets/` system for:
  - Terminology presets (e.g., "pirate mode" → fun naming)
  - Process presets (e.g., "TDD-lite", "ship-only")
  - Template presets (e.g., "minimal", "comprehensive")

### 4.6 Multi-Agent Command Registration (MEDIUM PRIORITY)

**Spec-Kit approach:**
- `CommandRegistrar` class handles 25+ agents
- Auto-detects installed agents via `shutil.which()`
- Generates agent-specific command files
- Format conversion: Markdown ↔ TOML

**AIOSON opportunity:**
- `AGENTS.md` already handles agent invocation
- Could add command registration to `.claude/commands/`, `.gemini/commands/`, etc.
- Already done for Claude Code (`/agent:prompt`)

### 4.7 Constitutional Gate in Plan (MEDIUM PRIORITY)

**Spec-Kit approach:**
```markdown
## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

[Automated checks based on constitution articles]
```

**AIOSON opportunity:**
- Add constitution gate section to `implementation-plan*.md`
- Check: max 3 projects, library-first, test-first
- Could integrate with `workflow:next` as automated gate

---

## 5. Specific File Improvements for AIOSON

### 5.1 Create: `.aioson/constitution.md`

```markdown
# AIOSON Constitution — Project Principles

## Article I — Spec-First
Features begin as specifications. Code expresses specs in particular languages.

## Article II — Small Solution
Complexity must match problem size. MICRO ≠ MEDIUM requirements.

## Article III — Observable
All agent actions emit runtime telemetry. No silent actions.

## Article IV — Testable
Each spec must have independently verifiable acceptance criteria.

## Article V — Handoff-Clean
Artifacts must be self-contained for next agent. No tribal knowledge.

## Article VI — No Abstraction Bloat
Use framework features directly. Do not add layers "for flexibility."

## Article VII — Integration-First
Real environments over mocks. Test against actual services.

## Article VIII — Simplicity
Maximum 3 projects. No future-proofing.

## Article IX — CLI-Native
Text input/output. Maximum observability.

*Version: 1.0.0 | Ratified: 2026-04-02*
```

### 5.2 Improve: `spec-{slug}.md` template

Add phase gates and IDs:
```yaml
---
feature: {slug}
status: in_progress
started: {ISO-date}
phase_gates:
  requirements: approved
  design: pending
  plan: pending
requirements:
  - id: REQ-{slug}-001
    statement: ...
  - id: REQ-{slug}-002
    statement: ...
success_criteria:
  - id: SC-{slug}-001
    metric: ...
  - id: SC-{slug}-002
    metric: ...
last_checkpoint: null
pending_review: []
---
```

### 5.3 Create: `squad:tasks` command

Generate executable task list from `implementation-plan*.md`:
```bash
aioson squad:tasks . --plan=implementation-plan.feature-x.md
```

Output format:
```markdown
# Tasks — Feature X

## Setup
- [ ] Task S1: Initialize project structure

## Foundational (blocks all stories)
- [ ] Task F1: Create data model

## User Stories
- [P] [US1] Task 1.1: Implement feature slice 1

## Polish
- [ ] Task P1: Final review
```

### 5.4 Create: Extension catalog

```json
{
  "extensions": [
    {
      "id": "aioson-tdd-gate",
      "name": "TDD Gate",
      "description": "Enforces test-first workflow",
      "version": "1.0.0",
      "hooks": ["before-dev"],
      "repository": "..."
    }
  ]
}
```

---

## 6. Implementation Priority

### Priority 1 — Quick Wins

1. **Constitution file** (`.aioson/constitution.md`)
   - Low effort, high impact on workflow quality
   - Creates shared vocabulary for agents

2. **Spec template IDs** (extend existing plan work)
   - REQ-{slug}-{N}, AC-{slug}-{N} in spec outputs
   - Already designed in plans/33, needs implementation

3. **Constitutional gate in implementation-plan**
   - Add Article I-IX checks before Phase 0
   - Simple text checklist, no LLM needed

### Priority 2 — Core System

4. **Executable task list** (`squad:tasks` command)
   - Parse implementation-plan → tasks.md
   - Add phase organization and parallel markers
   - Integrate with `squad:autorun`

5. **Extension manifest structure** (for skills)
   - Add `extension.yml` equivalent for skills
   - Define lifecycle hooks
   - 4-level config override

6. **Formal checklist template**
   - Add to templates directory
   - P1/P2/P3 prioritization
   - Given/When/Then format

### Priority 3 — Ecosystem

7. **Extension catalog system**
   - `catalog.json` for installed extensions
   - `catalog.community.json` for discovery
   - `specify extension search` equivalent

8. **Preset system**
   - Terminology presets
   - Process presets
   - Template presets

---

## 7. Anti-Patterns to Avoid

1. **Do not clone spec-kit** — Adapt philosophy, not structure
2. **Do not add constitution gate that requires LLM** — Keep it heuristic/textual
3. **Do not create new agents** — Integrate into existing agents
4. **Do not replace AIOSON artifacts** — Extend .aioson/ structure
5. **Do not add 3rd-party catalog without curation** — Empty catalog default

---

## 8. Conclusion

Spec-Kit's core innovations that AIOSON should adopt:

1. **Constitution as quality framework** — Creates shared vocabulary and automated gates
2. **Formal ID system for requirements** — REQ-001, SC-001 enable tracking
3. **Executable task lists** — Bridging spec → implementation
4. **Extension system** — Catalog + hooks + config layers
5. **Template inheritance** — Project → preset → core

AIOSON's advantages to preserve:
- 22+ specialized agents (spec-kit has none built-in)
- Squad coordination with intra-bus
- Context optimization (semantic sharding, FTS5)
- Runtime telemetry

**Key principle:** Add spec-kit's discipline without replacing AIOSON's sophistication.

---

## 9. Source Files Reference

### Spec-Kit (for implementation)
- `spec-driven.md` — SDD methodology guide
- `AGENTS.md` — Multi-agent configuration (25+ agents)
- `templates/spec-template.md` — Spec format
- `templates/plan-template.md` — Plan format with constitution gate
- `templates/tasks-template.md` — Task list format
- `templates/constitution-template.md` — Constitution template
- `extensions/EXTENSION-API-REFERENCE.md` — Extension development
- `extensions/catalog.community.json` — 50+ community extensions

### AIOSON (improvement targets)
- `src/cli.js` — Main CLI (150+ commands)
- `src/constants.js` — AGENT_DEFINITIONS
- `src/squad/task-decomposer.js` — Task decomposition
- `src/squad/intra-bus.js` — Squad messaging
- `template/.aioson/agents/*.md` — 22 agent files
- `template/.aioson/skills/` — Existing skills
- `plans/33-IMPL-spec-driven-aioson.md` — Existing spec-driven plan
- `plans/32.2-PLAN-spec-driven-master-skill.md` — Skill structure plan
