# AIOSON Architecture Report

**Project:** @jaimevalasek/aioson  
**Version:** 1.6.0  
**Generated:** 2026-04-02  
**Purpose:** Comparative analysis for architectural research

---

## 1. Project Overview and Purpose

AIOSON is an AI operating framework for hyper-personalized software development. It provides a multi-agent orchestration system where specialized agents collaborate through defined workflows to deliver software projects. The framework acts as an AI development "squad" with specialized roles including product management, architecture, design, development, and QA.

**Core philosophy:** "Small project, small solution" - complexity must match problem size.

**Key differentiators:**
- Context-driven agent activation with dependency management
- Squad-based multi-agent coordination with intra-squad communication bus
- Genome system for capturing and reusing agent/persona knowledge
- Token optimization through semantic sharding and context caching
- Multi-locale support (en, pt-BR, es, fr)
- SQLite-based runtime telemetry for dashboard observability

---

## 2. Directory Structure Explanation

```
aioson/
├── bin/
│   └── aioson.js              # CLI entry point (executable as `aios` or `aioson`)
├── src/
│   ├── cli.js                 # Main CLI router (~950 lines, 150+ commands)
│   ├── constants.js           # AGENT_DEFINITIONS, REQUIRED_FILES, CONTEXT_REQUIRED_FIELDS
│   ├── parser.js              # Argument parsing
│   ├── locales.js             # Locale resolution (en, pt-BR, es, fr)
│   ├── utils.js               # Shared utilities (exists, ensureDir, etc.)
│   ├── version.js             # Version info
│   │
│   ├── commands/              # 80+ command implementations
│   │   ├── init.js, install.js, setup.js, update.js
│   │   ├── workflow-*.js      # Workflow orchestration
│   │   ├── parallel-*.js     # Parallel execution
│   │   ├── squad-*.js        # Squad management (30+ squad commands)
│   │   ├── runtime*.js       # Runtime telemetry
│   │   ├── live.js           # Live session management
│   │   ├── cloud.js          # Cloud publishing
│   │   ├── skill.js          # Skill management
│   │   ├── context-*.js      # Context operations
│   │   ├── agent-*.js        # Agent utilities
│   │   └── mcp-*.js          # MCP server management
│   │
│   ├── squad/                 # Core squad infrastructure
│   │   ├── task-decomposer.js     # Goal → execution plan (heuristic or LLM)
│   │   ├── intra-bus.js           # Real-time inter-executor messaging (JSONL)
│   │   ├── reflection.js         # Post-task reflection
│   │   ├── external-session.js    # External client session handling
│   │   ├── recovery-context.js    # Context recovery after compact
│   │   └── worktree-manager.js    # Git worktree isolation
│   │
│   ├── squads/               # Multi-squad coordination
│   │   ├── inter-squad.js    # Inter-squad communication
│   │   ├── webhook-server.js # Webhook endpoint server
│   │   └── recovery-context.js
│   │
│   ├── runtime-store.js      # SQLite-based runtime database
│   ├── execution-gateway.js # Runtime operation recording
│   ├── delivery-runner.js    # Webhook/worker delivery with retry
│   ├── worker-runner.js      # Worker script execution (Node/Python)
│   ├── context-memory.js     # Context document indexing (~26KB)
│   ├── context-cache.js     # RAM shadow cache (24h TTL)
│   ├── context-search.js     # FTS5 full-text search index
│   ├── context-trim.js       # Context window trimming
│   ├── genomes.js            # Genome v2/v3 format handling
│   ├── genomes/              # Genome sub-system
│   ├── i18n/                  # Internationalization
│   ├── lib/                   # Internal library modules
│   ├── mcp-connectors/        # MCP server integrations
│   ├── squad-daemon.js       # Cron-based scheduled worker runner
│   └── agent-loader.js       # Semantic shard indexing for agents
│
├── template/                 # Project scaffolding template
│   ├── AGENTS.md             # Master agent invocation guide
│   ├── CLAUDE.md             # Claude Code instructions
│   ├── OPENCODE.md           # OpenCode instructions
│   └── .aioson/
│       ├── config.md         # Project configuration
│       ├── agents/           # 22 agent .md files
│       ├── squads/           # Squad templates
│       ├── skills/            # Skill definitions
│       ├── brains/           # Brain data files
│       ├── schemas/          # JSON schemas
│       ├── locales/          # Localized agent instructions
│       └── context/           # Context document templates
│
├── docs/                     # Schema documentation
├── mapping/                  # Decision records & engineering notes (75+ files)
├── products-features/        # Product briefs and specifications
├── scripts/                  # Automation scripts
├── tests/                    # Test fixtures
└── package.json
```

---

## 3. CLI Commands and Their Purposes

The CLI (`src/cli.js`) is the central entry point with **150+ commands** organized into categories:

### Core Lifecycle Commands
| Command | Purpose |
|---------|---------|
| `init` | Initialize new project with AIOSON structure |
| `install` | Install AIOSON into existing project |
| `setup` | Configure project context and preferences |
| `update` | Update AIOSON to latest version |
| `info` | Show AIOSON version and project info |
| `doctor` | Diagnose environment and configuration issues |

### Agent Commands
| Command | Purpose |
|---------|---------|
| `agents` | List all available agents |
| `agent:prompt` | Invoke agent with custom prompt |
| `agent:done` | Mark agent task complete |
| `agent:recover` | Recover agent session |
| `agent:load` | Load agent with semantic sharding |
| `agent:shard:index` | Index agent files as shards |
| `agent:audit` | Audit agent definitions |

### Workflow Commands
| Command | Purpose |
|---------|---------|
| `workflow:next` | Advance to next workflow stage |
| `workflow:plan` | Show planned workflow stages |
| `workflow:status` | Show current workflow state |

### Parallel/Orchestration Commands
| Command | Purpose |
|---------|---------|
| `parallel:init` | Initialize parallel execution |
| `parallel:doctor` | Validate parallel setup |
| `parallel:assign` | Assign tasks to parallel lanes |
| `parallel:status` | Show parallel execution status |

### Squad Commands (30+)
| Command | Purpose |
|---------|---------|
| `squad:create` | Create new squad |
| `squad:agent-create` | Create agent within squad |
| `squad:status` | Show squad status |
| `squad:doctor` | Diagnose squad issues |
| `squad:validate` | Validate squad manifest |
| `squad:pipeline` | Execute squad pipeline |
| `squad:autorun` | Autonomous squad execution |
| `squad:bus` | Inter-executor messaging bus |
| `squad:daemon` | Run squad as background daemon |
| `squad:worker` | Execute squad worker |
| `squad:mcp` | MCP server for squad |
| `squad:learning` | Squad learning system |
| `squad:roi` | Return on investment analysis |
| `squad:score` | Score squad performance |
| `squad:processes` | List squad processes |
| `squad:worktrees` | Manage git worktrees |
| `squad:recovery` | Squad recovery operations |
| `squad:deploy` | Deploy squad outputs |
| `squad:webhook` | Manage webhooks |
| `squad:investigate` | Investigate squad issues |
| `squad:plan` | Create squad execution plan |

### Runtime/Telemetry Commands
| Command | Purpose |
|---------|---------|
| `runtime:init` | Initialize runtime database |
| `runtime:start` | Start runtime session |
| `runtime:task:start` | Mark task started |
| `runtime:task:finish` | Mark task completed |
| `runtime:task:fail` | Mark task failed |
| `runtime:finish` | Finish runtime session |
| `runtime:status` | Show runtime status |
| `runtime:log` | Log runtime event |
| `runtime:session:start/log/finish/status` | Session management |
| `runtime:emit` | Emit runtime event |
| `runtime:backup/restore` | Backup/restore runtime |
| `live:start/status/handoff/close/list` | Live session management |

### Context Commands
| Command | Purpose |
|---------|---------|
| `context:validate` | Validate project.context.md |
| `context:pack` | Pack context for transfer |
| `context:monitor` | Monitor context window |
| `context:health` | Context health check |
| `context:trim` | Trim excessive context |
| `context:search` | Search context (FTS5) |
| `context:cache` | Context caching operations |

### Skill & Genome Commands
| Command | Purpose |
|---------|---------|
| `skill:install/list/remove` | Manage skills |
| `genome:doctor` | Validate genome files |
| `genome:migrate` | Migrate genome format |

### QA Commands
| Command | Purpose |
|---------|---------|
| `qa:init/scan/run/report` | QA workflow |
| `qa:doctor` | QA environment check |

### Other Commands
| Command | Purpose |
|---------|---------|
| `scan:project` | Scan project structure |
| `web:map/scrape` | Web utilities |
| `devlog:*` | Development log processing |
| `hooks:emit/install/uninstall` | Hook management |
| `spec:sync/status/checkpoint` | Spec management |
| `design-hybrid:options` | Design hybrid options |

---

## 4. Agent Architecture Breakdown

### Agent Definition System

Agents are defined in `src/constants.js` (`AGENT_DEFINITIONS` array) with these properties:

```javascript
{
  id: 'dev',
  displayName: 'Dev',
  command: '@dev',
  path: '.aioson/agents/dev.md',
  dependsOn: ['.aioson/context/project.context.md', ...],
  output: 'code changes'
}
```

### Official Agents (22 defined)

| Agent | Purpose | Key Dependency |
|-------|---------|----------------|
| `@setup` | Project initialization | None |
| `@discovery-design-doc` | Scope & design documentation | project.context.md |
| `@product` | Product vision & PRD | project.context.md |
| `@analyst` | Requirements analysis | project.context.md |
| `@architect` | Technical architecture | project.context.md + discovery.md |
| `@ux-ui` | UI/UX design | project.context + prd + discovery + architecture |
| `@pm` | Project management & user stories | project.context + prd + discovery + architecture |
| `@dev` | Implementation | project.context + discovery + architecture |
| `@qa` | Quality assurance | discovery.md |
| `@tester` | Test engineering | project.context.md |
| `@orchestrator` | Parallel execution coordination | discovery + architecture + prd |
| `@squad` | Squad assembly & management | None |
| `@orache` | Market/competitor research | None |
| `@genome` | Genome generation | None |
| `@profiler-researcher` | Persona research | None |
| `@profiler-enricher` | Profile enrichment | research-report.md |
| `@profiler-forge` | Advisor genome creation | enriched-profile.md |
| `@design-hybrid-forge` | Hybrid design skill creation | project.context.md |
| `@site-forge` | Site cloning/rebuild | project.context.md |
| `@deyvin` | Pair programming / continuity | project.context.md (aliases: @pair) |
| `@sheldon` | Deep technical review | - |
| `@neo` | System router / guidance | - |

### Agent Invocation Methods

1. **@ mention** (Codex v0.110+): Type `@agent-name` in prompt
2. **Natural language**: "use the dev agent", "iniciar o setup"
3. **CLI command**: `aioson agent:prompt <agent> . --tool=<tool>`
4. **Workflow routing**: `aioson workflow:next . --tool=<tool>`

### Agent File Structure

Agent files are markdown (`.aioson/agents/*.md`) with sections:
- Mission/identity block
- Operational instructions
- Handoff rules
- Quality criteria
- Runtime telemetry calls (observable commands)

### Semantic Sharding (`src/agent-loader.js`)

Agents are indexed as semantic shards by H2/H3 headings:
- Each shard has: `id`, `heading`, `level`, `content`, `tokens`
- Only relevant shards loaded based on goal query
- Target: ~2000 tokens per shard
- FTS5 index in `~/.aioson/shards/`

### Locale System (`src/locales.js`)

Supported locales: `en`, `pt-BR`, `es`, `fr`
- `getLocalizedAgentPath(agentId, locale)` returns `.aioson/locales/{locale}/agents/{id}.md`
- `applyAgentLocale()` copies localized agents to active path

---

## 5. Squad Architecture Breakdown

### Squad Manifest (`squad.manifest.json`)

Full JSON schema at `template/.aioson/schemas/squad-manifest.schema.json` (710 lines).

Key structure:

```json
{
  "schemaVersion": "1.0.0",
  "slug": "content-team",
  "name": "Content Team",
  "mode": "content|software|research|mixed",
  "mission": "...",
  "goal": "...",
  "visibility": "private|public",
  "ephemeral": false,
  "ttl": "24h",
  
  "executors": [
    {
      "slug": "writer",
      "type": "agent|worker|clone|assistant|human-gate",
      "role": "Content Writer",
      "usesLLM": true,
      "modelTier": "powerful|balanced|fast|none",
      "tasks": [...],
      "skills": [...],
      "genomes": [...]
    }
  ],
  
  "skills": [...],
  "mcps": [...],
  "genomes": {...},
  "workflows": [
    {
      "slug": "publish-pipeline",
      "phases": [
        { "id": "research", "executor": "researcher", "dependsOn": [] },
        { "id": "write", "executor": "writer", "dependsOn": ["research"] },
        { "id": "review", "executor": "editor", "dependsOn": ["write"] }
      ]
    }
  ],
  
  "outputStrategy": {
    "mode": "files|sqlite|hybrid",
    "delivery": {
      "webhooks": [...],
      "autoPublish": false
    }
  },
  
  "contextMonitor": {
    "enabled": true,
    "windowSize": 120000,
    "thresholds": { "warning": 0.85, "critical": 0.95 }
  },
  
  "isolation": {
    "strategy": "worktree|branch-only|shared",
    "autoMerge": false
  },
  
  "recovery": {
    "enabled": true,
    "maxTokens": 2000
  },
  
  "ports": {
    "inputs": [...],
    "outputs": [...]
  }
}
```

### Executor Types

| Type | LLM Cost | Description |
|------|----------|-------------|
| `agent` | Yes | Standard LLM-powered agent |
| `worker` | No | Deterministic script (Node/Python) |
| `clone` | Yes | Cognitive replica of real person (genome-based) |
| `assistant` | Yes | Domain specialist with behavioral profile (DISC) |
| `human-gate` | N/A | Human approval checkpoint |

### Squad Modes

- **content**: Content production pipeline
- **software**: Software development lifecycle
- **research**: Investigation and analysis
- **mixed**: Combination of above

### Squad Creation Pipeline

1. `squad:create` - Scaffold squad structure
2. `squad:agent-create` - Create executors within squad
3. `squad:validate` - Validate manifest
4. `squad:plan` - Create execution plan

### Task Decomposer (`src/squad/task-decomposer.js`)

Decomposes high-level goals into execution plans:

**Two modes:**
1. **heuristic** (default): Regex + keyword matching, zero LLM calls, instant
2. **structured**: Uses prompt template for LLM completion

**Plan format:**
```json
{
  "id": "session-uuid",
  "squad_slug": "...",
  "goal": "...",
  "tasks": [
    {
      "id": "task-1",
      "title": "...",
      "description": "...",
      "acceptance_criteria": [...],
      "executor": "writer",
      "dependencies": [],
      "priority": 1,
      "parallel_group": null,
      "status": "pending"
    }
  ],
  "execution_order": ["task-1", "task-2"],
  "parallel_groups": { "1": ["task-2", "task-3"] }
}
```

---

## 6. Process and Workflow Patterns

### Project Classification Workflow

```
MICRO (0-1 points): @setup -> @product (optional) -> @dev
SMALL (2-3 points): @setup -> @product -> @analyst -> @architect -> @dev -> @qa
MEDIUM (4-6 points): @setup -> @product -> @analyst -> @architect -> @ux-ui -> @pm -> @orchestrator -> @dev -> @qa
```

Classification scoring:
- User types: 1=0, 2=1, 3+=2
- External integrations: 0=0, 1-2=1, 3+=2
- Non-obvious rules: none=0, some=1, complex=2

### Workflow Enforcement (from `template/AGENTS.md`)

**Hard constraints:**
- Implementation requests must go through workflow routing
- `@deyvin` / `@pair` may work directly only for continuity on validated small slices
- Between agent handoffs, ONLY valid output is: which agent is next and why
- Never silently bypass workflow after @setup

**Tracked execution:**
- Use `aioson workflow:next . --tool=claude` for tracked sessions
- Use `aioson live:start . --tool=claude --agent=deyvin --no-launch` for explicit continuity envelope
- Emit milestones via `aioson runtime:emit . --agent=<agent> --type=<event> --summary="..."`

### Parallel Execution (`parallel-*.js` commands)

- `parallel:init` - Initialize parallel lanes
- `parallel:assign` - Extract scopes from PRD/architecture/discovery and assign
- `parallel:doctor` - Validate parallel setup
- `parallel:status` - Monitor parallel execution

Scope extraction: H2/H3 headings or bullet lists from source documents
Max scopes: 24 per parallel session

### Squad Autorun (`squad:autorun`)

Autonomous execution flow:
1. Decompose goal into tasks (heuristic or structured)
2. Activate intra-squad bus for real-time communication
3. Run each task through worker-runner with optional reflection
4. Coordinator monitors bus for blocks/feedback
5. Report final session summary

Options:
- `--reflect` - Run reflection after each task
- `--bus` - Enable intra-bus (default: true)
- `--mode` - Decomposition mode (heuristic|structured)
- `--plan` - Resume from saved session plan
- `--dry-run` - Show plan without executing
- `--sequential` - Force sequential execution
- `--timeout` - Per-task timeout (default: 120s)

### Live Session Management (`live.js`)

For external client integration:
- `live:start` - Create tracked session envelope
- `live:handoff` - Transfer session to another agent
- `live:status` - Monitor active sessions
- `live:close` - Close session with summary
- `live:list` - List active sessions

---

## 7. Token Optimization Techniques

### Context Window Management

**Thresholds by classification:**
| Classification | Warning Threshold |
|----------------|-------------------|
| MICRO | 75% |
| SMALL | 65% (default) |
| MEDIUM | 55% |

**When approaching threshold:**
1. Write all artifacts to disk (disk-first)
2. Emit warning: "Context at {X}% - recommend /clear before next phase"
3. Include last_checkpoint in handoff

### Context Caching (`context-cache.js`)

RAM shadow cache stored in `~/.aioson/temp/`:
- 24-hour TTL by default
- Session-based organization
- Metadata: goal, agent, projectDir, size, createdAt
- `saveContextShadow()`, `listSessions()`, `restoreContext()`, `cleanup()`

### Context Search / FTS5 (`context-search.js`)

Full-text search index at `~/.aioson/search/context-search.sqlite`:
- FTS5 with unicode61 tokenizer (remove_diacritics)
- Indexes: `.md`, `.txt`, `.json` files
- Tracks: rel_path, title, content, project_dir, indexed_at, file_mtime, size
- 24-hour stale detection

### Agent Semantic Sharding (`agent-loader.js`)

- Splits agent markdown by H2/H3 headings
- Each shard ~2000 tokens target
- FTS5 index for goal-based shard selection
- Stored in `~/.aioson/shards/agent-shards/{agentId}/`

### Context Trimming (`context-trim.js`)

Automatic trimming of context when window exceeds thresholds

### Context Monitor (`context-monitor.js`)

Real-time context window monitoring with configurable thresholds and notifications

### Recovery Context (`recovery-context.js`)

After compact events (>30% context drop):
- Auto-generate `recovery-context.md`
- Max token budget: 2000
- Triggered on: task_completed, decision_made, handoff

---

## 8. Configuration Patterns

### Project Configuration (`.aioson/config.md`)

Core configuration file with YAML frontmatter:

```yaml
---
project_name: My Project
project_type: web_app|api|site|script|dapp
profile: developer|beginner|team
framework: laravel|nextjs|rails|express|...
framework_installed: true|false
classification: MICRO|SMALL|MEDIUM
conversation_language: en|pt-BR|es|fr
aioson_version: 1.6.0
design_skill: cognitive-ui|premium-command-center|...
test_runner: jest|pest|pytest|...
---
```

### Squad Manifest Configuration

JSON-based configuration (see Section 5 above)

### Locale Configuration

- `AIOS_LITE_LOCALE` environment variable
- `--locale` CLI option
- Fallback: `en`

### Runtime Configuration

SQLite database at `.aioson/runtime/aios.sqlite` with tables:
- `squads` - Squad metadata
- `squad_executors` - Executor configurations
- `tasks` - Task tracking
- `agent_runs` - Agent execution records
- `agent_events` - Agent lifecycle events
- `execution_events` - Detailed execution telemetry
- `artifacts` - Output artifacts

---

## 9. Inter-Agent/Inter-Squad Communication Patterns

### Intra-Squad Bus (`squad/intra-bus.js`)

Real-time messaging between executors in same squad session:
- File-based: `.aioson/squads/{slug}/sessions/{sessionId}/bus.jsonl`
- Append-only JSONL format
- Message types: `finding`, `feedback`, `question`, `result`, `status`, `block`

**Message schema:**
```json
{
  "id": "uuid",
  "session_id": "...",
  "from": "executor-slug",
  "to": "*|specific-slug",
  "type": "finding",
  "content": "...",
  "ts": "2026-04-02T...",
  "metadata": {}
}
```

**API:**
- `bus.post(projectDir, squadSlug, sessionId, msg)` - Post message
- `bus.read(projectDir, squadSlug, sessionId, filters)` - Read messages
- `bus.watch(projectDir, squadSlug, sessionId, options)` - Poll for new messages

### Inter-Squad Communication (`squads/inter-squad.js`)

Cross-squad communication via ports system:
- Squads declare `ports.inputs` and `ports.outputs`
- Data types: `text`, `json`, `file`, `file-list`, `any`
- Webhook-based delivery

### Webhook Delivery (`delivery-runner.js`)

For output delivery:
- HTTP webhook or worker script execution
- Retry with exponential backoff (3 attempts: 1s, 3s, 8s)
- 15-second timeout
- ENV variable placeholder substitution: `{{ENV:VAR}}`
- Trigger types: `on-publish`, `on-create`, `manual`

### Live Session Handoff (`live.js`)

For external client session transfer:
- `live:handoff` - Transfer active session to another agent
- Includes: `--to`, `--reason` parameters
- Preserves session context

---

## 10. Current Weaknesses and Areas for Improvement

Based on code analysis:

### 1. Squad Recovery Context Issues

The `recovery-context.js` in `src/squads/` appears to be a stub implementation that may not fully handle context recovery after aggressive compact events.

### 2. Worktree Manager

`src/squads/worktree-manager.js` exists but the implementation appears limited - git worktree creation for isolation is a complex feature that may need more robust handling.

### 3. Parallel Execution Complexity

The parallel-assign system extracts scopes via regex which may be fragile. The heuristic approach works for simple cases but complex documents may not parse correctly.

### 4. Runtime Store Complexity

The `runtime-store.js` (~94KB) is a large, complex SQLite wrapper with many concerns mixed together. Testing and debugging may be difficult.

### 5. Agent Shard Index

The shard indexing in `agent-loader.js` is stored in `~/.aioson/shards/` globally which could cause issues with multiple projects or stale indexes.

### 6. Context Monitor Performance

The context window monitoring adds overhead on every operation. The threshold checks happen frequently during agent execution.

### 7. Webhook Delivery Reliability

While there is retry logic, the webhook delivery system has no circuit breaker or dead-letter queue for permanently failed deliveries.

### 8. Squad Daemon Complexity

The `squad-daemon.js` implements cron scheduling from scratch rather than using a proven library. Edge cases in cron parsing may exist.

### 9. Limited Error Recovery

Many operations have basic error handling but lack sophisticated recovery strategies (e.g., no exponential backoff with jitter, no fallback to alternative resources).

### 10. Test Coverage

The codebase has `scripts/smoke/` and `scripts/testing/` directories but comprehensive test coverage is unclear from architecture analysis.

---

## 11. Scripts and Automation Found

### Build/Test Scripts (`package.json`)

```json
{
  "test": "node --test",
  "test:genome": "node --test tests/genome-compat.test.js tests/genome-migrate.test.js",
  "test:genome-2.0-smoke": "node scripts/smoke/genome-2.0-smoke.js",
  "test:genome-2.0:block-a": "node scripts/smoke/genome-2.0-smoke.js && npm run test:genome && npm test && npm run lint",
  "test:genome-2.0:rollout": "node scripts/testing/genome-2.0-rollout.js",
  "lint": "node --check src/*.js src/commands/*.js src/i18n/*.js src/i18n/messages/*.js bin/*.js",
  "ci": "npm run lint && npm test"
}
```

### Smoke Tests (`scripts/smoke/`)

- `genome-2.0-smoke.js` - Genome 2.0 compatibility smoke test

### Testing Scripts (`scripts/testing/`)

- `genome-2.0-rollout.js` - Genome 2.0 rollout validation

### Squad Daemon Cron Jobs

Built-in cron preset shortcuts:
- `@yearly`, `@monthly`, `@weekly`, `@daily`, `@hourly`
- `@every5m`, `@every10m`, `@every15m`, `@every30m`

---

## 12. Technology Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js >= 18.0.0 |
| CLI Framework | Custom (argv parsing) |
| Database | better-sqlite3 (SQLite) |
| Internationalization | Custom i18n system |
| Worker Execution | Node.js child_process / Python subprocess |
| Full-Text Search | SQLite FTS5 |
| HTTP Delivery | Native fetch |
| Configuration | YAML frontmatter + JSON |

---

## 13. Key Files Reference

| File | Size | Purpose |
|------|------|---------|
| `src/cli.js` | ~950 lines | Main CLI router |
| `src/runtime-store.js` | ~94KB | SQLite runtime database |
| `src/runtime.js` | ~65KB | Runtime command handlers |
| `src/live.js` | ~50KB | Live session management |
| `src/scan-project.js` | ~49KB | Project scanning |
| `src/qa-run.js` | ~38KB | QA execution |
| `src/cloud.js` | ~63KB | Cloud publishing |
| `src/context-memory.js` | ~27KB | Context indexing |
| `src/delivery-runner.js` | ~9KB | Webhook delivery |
| `src/worker-runner.js` | ~9KB | Worker script runner |
| `src/squad-daemon.js` | ~16KB | Squad cron daemon |
| `src/agent-loader.js` | ~8KB | Agent semantic sharding |

---

## 14. Summary

AIOSON is a comprehensive multi-agent development framework that provides:

1. **Structured Agent System**: 22+ specialized agents with dependency-based activation
2. **Squad Coordination**: Multi-executor squads with manifest-based configuration
3. **Workflow Orchestration**: Classification-driven workflows (MICRO/SMALL/MEDIUM)
4. **Real-time Communication**: Intra-squad JSONL bus for executor messaging
5. **Token Optimization**: Semantic sharding, FTS5 search, context caching, trimming
6. **Runtime Telemetry**: SQLite-based observability for dashboard integration
7. **Delivery Pipeline**: Webhook/worker delivery with retry logic
8. **Multi-locale Support**: English, Portuguese-BR, Spanish, French

The architecture is sophisticated but complex, with some areas (recovery context, worktree management, parallel execution) showing signs of ongoing development. The framework prioritizes observable, tracked execution with strong separation between CLI orchestration and agent implementation.

