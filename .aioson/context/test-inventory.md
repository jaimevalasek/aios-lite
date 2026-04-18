---
generated: "2026-04-17T19:48:42-03:00"
framework: "Node.js"
test_runner: "node:test"
agent: "tester"
---

# Test Inventory — AIOSON

## Summary
- Total source files scanned: 246
- Files with full coverage: ~106
- Files with partial coverage: ~15
- Files with no coverage: ~125

## Coverage Map

### Core & Utilities

| Source file | Test file | Status |
|---|---|---|
| src/cli.js | tests/context-monitor-cli.test.js | ◑ partial (shared with context-monitor) |
| src/constants.js | — | ✗ missing |
| src/context.js | tests/context-writer.test.js | ◑ partial (shared) |
| src/context-cache.js | tests/context-cache.test.js | ✓ covered |
| src/context-memory.js | — | ✗ missing |
| src/context-parse-reason.js | — | ✗ missing |
| src/context-search.js | tests/context-search.test.js | ✓ covered |
| src/context-writer.js | tests/context-writer.test.js | ✓ covered |
| src/parser.js | — | ✗ missing |
| src/path-guard.js | — | ✗ missing |
| src/utils.js | — | ✗ missing |
| src/version.js | tests/version.test.js | ✓ covered |

### Agent System

| Source file | Test file | Status |
|---|---|---|
| src/agent-loader.js | tests/agent-loader.test.js | ✓ covered |
| src/agent-manifests.js | tests/agent-manifests.test.js | ✓ covered |
| src/agents.js | tests/agents.test.js | ◑ partial (general logic, no specialized validator) |
| src/autonomy-policy.js | tests/autonomy-policy.test.js | ✓ covered |
| src/commands/agents.js | tests/agents-command.test.js | ✓ covered |
| src/commands/agent-audit.js | — | ✗ missing |
| src/commands/agent-export-skill.js | tests/agent-export-skill.test.js | ✓ covered |
| src/commands/agent-loader.js | tests/agent-loader.test.js | ◑ partial (shared) |
| src/commands/test-agents.js | — | ✗ missing |

### Commands — Workflow

| Source file | Test file | Status |
|---|---|---|
| src/commands/workflow-next.js | tests/workflow-next.test.js | ✓ covered |
| src/commands/workflow-plan.js | tests/workflow-plan.test.js | ✓ covered |
| src/commands/workflow-execute.js | tests/workflow-execute.test.js | ✓ covered |
| src/commands/workflow-status.js | tests/workflow-status.test.js | ✓ covered |
| src/commands/workflow-harden.js | tests/workflow-harden.test.js | ✓ covered |
| src/commands/workflow-heal.js | tests/workflow-heal.test.js | ✓ covered |
| src/workflow-gates.js | — | ✗ missing |

### Commands — Context & Runtime

| Source file | Test file | Status |
|---|---|---|
| src/commands/context-cache.js | tests/context-cache.test.js | ◑ partial (shared) |
| src/commands/context-compact.js | tests/context-compactor.test.js | ✓ covered |
| src/commands/context-health.js | — | ✗ missing |
| src/commands/context-monitor.js | tests/squad-context-monitor.test.js | ◑ partial (shared) |
| src/commands/context-pack.js | tests/context-pack.test.js | ✓ covered |
| src/commands/context-search.js | tests/context-search.test.js | ◑ partial (shared) |
| src/commands/context-trim.js | — | ✗ missing |
| src/commands/context-validate.js | tests/context-validate-command.test.js | ✓ covered |
| src/commands/pulse-update.js | tests/pulse-update.test.js | ✓ covered |
| src/commands/runtime.js | tests/runtime-json-output.test.js | ◑ partial (JSON output only) |
| src/runtime-store.js | tests/runtime-store.test.js | ✓ covered |

### Commands — Setup & Install

| Source file | Test file | Status |
|---|---|---|
| src/commands/setup.js | tests/setup-context.test.js | ◑ partial (shared) |
| src/commands/setup-context.js | tests/setup-context.test.js | ✓ covered |
| src/commands/install.js | tests/install-wizard.test.js | ◑ partial (shared) |
| src/commands/init.js | tests/mcp-init.test.js | ◑ partial (shared naming) |
| src/installer.js | tests/installer.test.js | ✓ covered |
| src/install-profile.js | tests/install-profile.test.js | ✓ covered |
| src/install-wizard.js | tests/install-wizard.test.js | ✓ covered |
| src/install-animation.js | tests/install-animation.test.js | ✓ covered |
| src/onboarding.js | tests/onboarding.test.js | ✓ covered |

### Commands — Genome

| Source file | Test file | Status |
|---|---|---|
| src/commands/genome-migrate.js | tests/genome-migrate.test.js | ✓ covered |
| src/commands/genome-doctor.js | — | ✗ missing |
| src/commands/store-genome.js | — | ✗ missing |
| src/commands/store-skill.js | — | ✗ missing |
| src/commands/store-squad.js | — | ✗ missing |
| src/commands/store-system.js | — | ✗ missing |
| src/genomes.js | tests/genomes-core.test.js | ✓ covered |
| src/genome-files.js | — | ✗ missing |
| src/genome-format.js | — | ✗ missing |
| src/genome-schema.js | — | ✗ missing |
| src/genomes/bindings.js | tests/genome-bindings.test.js | ✓ covered |
| src/lib/genomes/compat.js | tests/genome-compat.test.js | ✓ covered |
| src/lib/genomes/migrate.js | tests/genome-migrate.test.js | ◑ partial (shared) |
| src/squads/apply-genome.js | tests/apply-genome-to-squad.test.js | ✓ covered |
| src/squads/genome-binding-service.js | — | ✗ missing |

### Commands — Squad

| Source file | Test file | Status |
|---|---|---|
| src/commands/squad-agent-create.js | — | ✗ missing |
| src/commands/squad-autorun.js | — | ✗ missing |
| src/commands/squad-bus.js | — | ✗ missing |
| src/commands/squad-card.js | tests/squad-card.test.js | ✓ covered |
| src/commands/squad-daemon.js | tests/squad-daemon.test.js | ✓ covered |
| src/commands/squad-dashboard.js | tests/squad-dashboard.test.js | ✓ covered |
| src/commands/squad-dependency-graph.js | — | ✗ missing |
| src/commands/squad-deploy.js | — | ✗ missing |
| src/commands/squad-doctor.js | tests/squad-doctor.test.js | ✓ covered |
| src/commands/squad-export.js | tests/squad-export.test.js | ✓ covered |
| src/commands/squad-investigate.js | tests/squad-investigate.test.js | ✓ covered |
| src/commands/squad-learning.js | tests/squad-learning.test.js | ✓ covered |
| src/commands/squad-mcp.js | tests/squad-mcp-db-connectors.test.js | ◑ partial (DB connectors only) |
| src/commands/squad-pipeline.js | tests/squad-pipeline.test.js | ✓ covered |
| src/commands/squad-plan.js | tests/squad-plan.test.js | ✓ covered |
| src/commands/squad-processes.js | tests/squad-processes-command.test.js | ✓ covered |
| src/commands/squad-recovery.js | tests/squad-recovery-context.test.js | ◑ partial (shared) |
| src/commands/squad-repair-genomes.js | — | ✗ missing |
| src/commands/squad-review.js | tests/squad-review-loops.test.js | ✓ covered |
| src/commands/squad-roi.js | tests/squad-roi.test.js | ✓ covered |
| src/commands/squad-scaffold.js | tests/squad-scaffold.test.js | ✓ covered |
| src/commands/squad-score.js | tests/squad-score.test.js | ✓ covered |
| src/commands/squad-status.js | tests/squad-status-command.test.js | ✓ covered |
| src/commands/squad-tool-register.js | — | ✗ missing |
| src/commands/squad-validate.js | tests/squad-validate.test.js | ✓ covered |
| src/commands/squad-webhook.js | tests/squad-webhook-production.test.js | ✓ covered |
| src/commands/squad-worker.js | tests/squad-worker.test.js | ✓ covered |
| src/commands/squad-worktrees.js | tests/squad-worktrees-command.test.js | ✓ covered |

### Commands — Runner

| Source file | Test file | Status |
|---|---|---|
| src/commands/runner-daemon.js | tests/runner-daemon.test.js | ✓ covered |
| src/commands/runner-plan.js | tests/runner-plan.test.js | ✓ covered |
| src/commands/runner-queue-from-plan.js | tests/runner-queue-from-plan.test.js | ✓ covered |
| src/commands/runner-queue.js | tests/runner-queue.test.js | ✓ covered |
| src/commands/runner-run.js | tests/runner-run.test.js | ✓ covered |
| src/runner/cascade.js | tests/runner-cascade.test.js | ✓ covered |
| src/runner/cli-launcher.js | — | ✗ missing |
| src/runner/plan-importer.js | — | ✗ missing |
| src/runner/queue-store.js | — | ✗ missing |

### Commands — Quality & Validation

| Source file | Test file | Status |
|---|---|---|
| src/commands/gate-check.js | tests/gate-check.test.js | ◑ partial (no contract support) |
| src/commands/verify-gate.js | tests/verify-gate.test.js | ✓ covered |
| src/commands/qa-doctor.js | tests/qa-doctor.test.js | ✓ covered |
| src/commands/qa-init.js | tests/qa-init.test.js | ✓ covered |
| src/commands/qa-report.js | tests/qa-report.test.js | ✓ covered |
| src/commands/qa-run.js | — | ✗ missing (requires Playwright + live server) |
| src/commands/qa-scan.js | — | ✗ missing (requires Playwright + live server) |
| src/commands/artifact-validate.js | tests/artifact-validate.test.js | ✓ covered |
| src/commands/brief-validate.js | — | ✗ missing |
| src/commands/self-implement-loop.js | — | ✗ missing |
| src/squad/verify-gate.js | tests/gate-check.test.js | ◑ partial (core logic tested, contract bridge not) |
| src/commands/harness.js | tests/harness-commands.test.js | ✓ covered |
| src/harness/circuit-breaker.js | tests/harness-commands.test.js | ◑ partial (covered via harness commands) |

### Commands — Parallel Workspace

| Source file | Test file | Status |
|---|---|---|
| src/commands/parallel-assign.js | tests/parallel-assign.test.js | ✓ covered |
| src/commands/parallel-doctor.js | tests/parallel-doctor.test.js | ✓ covered |
| src/commands/parallel-guard.js | tests/parallel-guard.test.js | ✓ covered |
| src/commands/parallel-init.js | tests/parallel-init.test.js | ✓ covered |
| src/commands/parallel-merge.js | tests/parallel-merge.test.js | ✓ covered |
| src/commands/parallel-status.js | tests/parallel-status.test.js | ✓ covered |
| src/parallel-workspace.js | — | ✗ missing |

### Commands — Live & Session

| Source file | Test file | Status |
|---|---|---|
| src/commands/live.js | tests/live-command.test.js | ✓ covered |
| src/commands/recovery.js | tests/squad-recovery-context.test.js | ◑ partial (shared) |
| src/commands/session-guard.js | — | ✗ missing |
| src/commands/state-save.js | tests/state-save.test.js | ✓ covered |
| src/recovery-context-session.js | tests/recovery-context-session.test.js | ✓ covered |
| src/session-handoff.js | — | ✗ missing |
| src/handoff-contract.js | — | ✗ missing |
| src/handoff-validator.js | tests/handoff-validator.test.js | ✓ covered |

### Commands — Scan & Doctor

| Source file | Test file | Status |
|---|---|---|
| src/commands/scan-project.js | tests/scan-project.test.js | ✓ covered |
| src/commands/doctor.js | tests/mcp-doctor.test.js | ◑ partial (shared naming) |
| src/doctor.js | tests/doctor.test.js | ✓ covered |
| src/commands/mcp-doctor.js | tests/mcp-doctor.test.js | ◑ partial (shared) |
| src/commands/mcp-init.js | tests/mcp-init.test.js | ◑ partial (shared) |

### Commands — Spec & Planning

| Source file | Test file | Status |
|---|---|---|
| src/commands/spec-checkpoint.js | — | ✗ missing |
| src/commands/spec-status.js | — | ✗ missing |
| src/commands/spec-sync.js | — | ✗ missing |
| src/commands/spec-tasks.js | — | ✗ missing |
| src/commands/implementation-plan.js | tests/implementation-plan.test.js | ✓ covered |
| src/commands/sizing.js | tests/sizing-command.test.js | ✓ covered |
| src/commands/classify.js | tests/classify-command.test.js | ✓ covered |

### Commands — Other

| Source file | Test file | Status |
|---|---|---|
| src/commands/auth.js | — | ✗ missing |
| src/commands/backup.js | — | ✗ missing |
| src/commands/backup-local-cmd.js | — | ✗ missing |
| src/commands/brief-gen.js | — | ✗ missing |
| src/commands/briefing.js | — | ✗ missing |
| src/commands/cloud.js | tests/cloud-command.test.js | ✓ covered |
| src/commands/commit-prepare.js | tests/commit-prepare.test.js | ✓ covered |
| src/commands/config.js | — | ✗ missing |
| src/commands/design-hybrid-options.js | tests/design-hybrid-options.test.js | ✓ covered |
| src/commands/detect-test-runner.js | tests/detect-test-runner.test.js | ✓ covered |
| src/commands/devlog-export-brains.js | — | ✗ missing |
| src/commands/devlog-process.js | — | ✗ missing |
| src/commands/devlog-watch.js | — | ✗ missing |
| src/commands/feature-close.js | tests/feature-close.test.js | ✓ covered |
| src/commands/health.js | — | ✗ missing |
| src/commands/hooks-emit.js | — | ✗ missing |
| src/commands/hooks-install.js | — | ✗ missing |
| src/commands/i18n-add.js | — | ✗ missing |
| src/commands/info.js | — | ✗ missing |
| src/commands/learning.js | tests/learning.test.js | ◑ partial (shared) |
| src/commands/learning-auto-promote.js | tests/learning-auto-promote.test.js | ◑ partial (shared) |
| src/commands/learning-evolve.js | — | ✗ missing |
| src/commands/learning-export.js | — | ✗ missing |
| src/commands/learning-rollback.js | — | ✗ missing |
| src/commands/locale-apply.js | tests/locale-apply-command.test.js | ✓ covered |
| src/commands/locale-diff.js | — | ✗ missing |
| src/commands/package-e2e.js | — | ✗ missing |
| src/commands/pattern-detect.js | tests/pattern-detector.test.js | ◑ partial (shared) |
| src/commands/preflight.js | tests/preflight-command.test.js | ✓ covered |
| src/commands/preflight-context.js | — | ✗ missing |
| src/commands/sandbox.js | tests/sandbox.test.js | ◑ partial (shared) |
| src/commands/skill.js | tests/agent-export-skill.test.js | ◑ partial (shared) |
| src/commands/smoke.js | tests/smoke.test.js | ✓ covered |
| src/commands/tool-registry-cmd.js | — | ✗ missing |
| src/commands/update.js | tests/update.test.js | ✓ covered |
| src/commands/web-map.js | — | ✗ missing |
| src/commands/web-scrape.js | — | ✗ missing |
| src/commands/workspace.js | — | ✗ missing |

### Squad Intelligence

| Source file | Test file | Status |
|---|---|---|
| src/squad/agent-teams-adapter.js | tests/agent-teams-adapter.test.js | ✓ covered |
| src/squad/brief-validator.js | tests/brief-validator.test.js | ✓ covered |
| src/squad/bus-bridge.js | tests/bus-bridge.test.js | ✓ covered |
| src/squad/context-compactor.js | tests/context-compactor.test.js | ✓ covered |
| src/squad/cross-ai-synthesizer.js | — | ✗ missing |
| src/squad/external-session.js | tests/external-session.test.js | ✓ covered |
| src/squad/hooks-generator.js | tests/hooks-generator.test.js | ✓ covered |
| src/squad/inter-squad.js | tests/squad-inter-squad.test.js | ✓ covered |
| src/squad/inter-squad-events.js | — | ✗ missing |
| src/squad/intra-bus.js | — | ✗ missing |
| src/squad/learning-extractor.js | — | ✗ missing |
| src/squad/pattern-detector.js | tests/pattern-detector.test.js | ✓ covered |
| src/squad/preflight-context.js | — | ✗ missing |
| src/squad/recovery-context.js | tests/squad-recovery-context.test.js | ◑ partial (shared) |
| src/squad/reflection.js | — | ✗ missing |
| src/squad/squad-scaffold.js | tests/squad-scaffold.test.js | ◑ partial (shared) |
| src/squad/state-manager.js | — | ✗ missing |
| src/squad/task-decomposer.js | — | ✗ missing |
| src/squad/verify-gate.js | tests/gate-check.test.js | ◑ partial (shared) |
| src/squad/worktree-manager.js | tests/squad-worktree-manager.test.js | ✓ covered |
| src/squad-daemon.js | tests/squad-daemon.test.js | ✓ covered |

### Squad Dashboard

| Source file | Test file | Status |
|---|---|---|
| src/squad-dashboard/api.js | tests/squad-api-endpoints.test.js | ✓ covered |
| src/squad-dashboard/attachment-handler.js | tests/squad-attachment-handler.test.js | ✓ covered |
| src/squad-dashboard/context-monitor.js | tests/squad-context-monitor.test.js | ◑ partial (shared) |
| src/squad-dashboard/execution-logs.js | tests/squad-execution-logs.test.js | ✓ covered |
| src/squad-dashboard/hunk-review.js | tests/squad-hunk-review.test.js | ✓ covered |
| src/squad-dashboard/metrics.js | — | ✗ missing |
| src/squad-dashboard/process-monitor.js | tests/squad-process-monitor.test.js | ✓ covered |
| src/squad-dashboard/renderer.js | — | ✗ missing |
| src/squad-dashboard/server.js | tests/webhook-server.test.js | ◑ partial (shared) |
| src/squad-dashboard/styles.js | — | ✗ missing |
| src/squad-dashboard/token-tracker.js | tests/squad-token-tracker.test.js | ✓ covered |

### i18n

| Source file | Test file | Status |
|---|---|---|
| src/i18n/index.js | — | ✗ missing |
| src/i18n/messages/en.js | tests/agent-loader.test.js | ◑ partial (shared) |
| src/i18n/messages/es.js | tests/mcp-init.test.js | ◑ partial (shared) |
| src/i18n/messages/fr.js | tests/runner-queue-from-plan.test.js | ◑ partial (shared) |
| src/i18n/messages/pt-BR.js | — | ✗ missing |
| src/i18n/scaffold.js | tests/i18n-scaffold.test.js | ✓ covered |
| src/locales.js | tests/locales.test.js | ✓ covered |
| src/commands/locale-apply.js | tests/locale-apply-command.test.js | ✓ covered |

### MCP & A2A

| Source file | Test file | Status |
|---|---|---|
| src/a2a/client.js | — | ✗ missing |
| src/a2a/server.js | tests/webhook-server.test.js | ◑ partial (shared) |
| src/mcp/apps/squad-dashboard/app.js | tests/locale-apply-command.test.js | ◑ partial (shared) |
| src/mcp-connectors/registry.js | — | ✗ missing |
| src/mcp/resources/squad-state.js | — | ✗ missing |

### Lib

| Source file | Test file | Status |
|---|---|---|
| src/lib/genomes/compat.js | tests/genome-compat.test.js | ✓ covered |
| src/lib/genomes/migrate.js | tests/genome-migrate.test.js | ◑ partial (shared) |
| src/lib/git-commit-guard.js | — | ✗ missing |
| src/lib/health-check.js | — | ✗ missing |
| src/lib/hook-protocol.js | — | ✗ missing |
| src/lib/squads/genome-repair.js | — | ✗ missing |
| src/lib/store/security-scan.js | — | ✗ missing |
| src/lib/terminal-checkbox.js | — | ✗ missing |
| src/lib/webhook-server.js | tests/webhook-server.test.js | ✓ covered |

### Other Core Modules

| Source file | Test file | Status |
|---|---|---|
| src/backup-local.js | — | ✗ missing |
| src/backup-provider.js | — | ✗ missing |
| src/delivery-runner.js | tests/delivery-runner.test.js | ✓ covered |
| src/design-variation-catalog.js | — | ✗ missing |
| src/detector.js | tests/detector.test.js | ✓ covered |
| src/execution-gateway.js | — | ✗ missing |
| src/friction-scanner.js | — | ✗ missing |
| src/preflight-engine.js | tests/preflight-engine.test.js | ✓ covered |
| src/prompt-tool.js | tests/prompt-tool.test.js | ✓ covered |
| src/qa-html-report.js | — | ✗ missing |
| src/sandbox.js | tests/sandbox.test.js | ✓ covered |
| src/self-healing.js | — | ✗ missing |
| src/tool-executor.js | — | ✗ missing |
| src/updater.js | — | ✗ missing |
| src/web.js | tests/squad-webhook-production.test.js | ◑ partial (shared) |
| src/worker-runner.js | — | ✗ missing |

## Risk Priorities

Based on `discovery.md` business rules and critical paths:

### Critical (C1) — Auth / Authorization & Governance
- `src/commands/auth.js` — no coverage
- `src/commands/verify-gate.js` — tests/verify-gate.test.js (business rule REQ-DISC-01: classification SDD gate)
- `src/squad/verify-gate.js` — partial (contract bridge missing)
- `src/workflow-gates.js` — no coverage (gate orchestration)
- `src/commands/gate-check.js` — partial (no contract support)

### High (C2) — Business Rules & Invariants
- `src/commands/self-implement-loop.js` — no coverage (critical for MEDIUM project governance)
- `src/commands/spec-*.js` — no coverage (spec checkpoint, status, sync, tasks)
- `src/commands/classify.js` — has tests but classification logic is critical
- `src/context.js`, `src/context-memory.js`, `src/context-parse-reason.js` — core context system
- `src/parser.js` — frontmatter/markdown parser used everywhere

### Medium (C3) — Data Integrity & External Integrations
- `src/a2a/client.js` — A2A protocol client
- `src/mcp-connectors/registry.js` — MCP connector registry
- `src/commands/store-*.js` — store system commands
- `src/runner/queue-store.js`, `src/runner/plan-importer.js` — runner persistence
- `src/lib/health-check.js` — health check utility
- `src/backup-*.js` — backup system

### Low (C4) — UI / Auxiliary
- `src/commands/devlog-*.js` — devlog commands
- `src/commands/info.js`, `src/commands/config.js`
- `src/squad-dashboard/renderer.js`, `src/squad-dashboard/styles.js`
- `src/i18n/messages/*.js` individual locale files
