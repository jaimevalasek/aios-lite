# Compatibility Matrix

## Goal
Ensure predictable behavior across Claude Code, Codex CLI, Gemini CLI, and OpenCode.

## Single source of truth
- Real prompts and rules: `.aios-lite/`
- IDE-specific gateways: bootstrap only, no business logic.

## Tools

### Claude Code
- Entry: `CLAUDE.md`
- Commands: slash commands mapped to `.aios-lite/agents/*`.
- Expected behavior: run setup if `project.context.md` does not exist.

### Codex CLI
- Entry: `AGENTS.md`
- Commands: `@setup`, `@analyst`, `@architect`, `@pm`, `@dev`, `@qa`, `@orchestrator`.
- Expected behavior: same context order and dependencies.

### Gemini CLI
- Entry: `.gemini/GEMINI.md`
- Commands: `.gemini/commands/*.toml`
- Expected behavior: command files point to the same agent files.

### OpenCode
- Entry: `OPENCODE.md`
- Commands: agent aliases mapping to `.aios-lite/agents/*`.
- Expected behavior: same startup and context rules.

## Required contracts
- `project.context.md` must include parseable metadata.
- All agents must depend on the same context files.
- No IDE can host exclusive business rules outside `.aios-lite/agents`.
