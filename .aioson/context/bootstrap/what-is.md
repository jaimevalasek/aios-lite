---
generated_by: discover
generated_at: "2026-04-24T11:20:13-03:00"
confidence: high
---

# What Is This System

## Identity

AIOSON is a Node.js CLI framework for AI-assisted software development. It turns a project workspace into an agent-operated development environment with specialized roles, workflow gates, disk-first artifacts, runtime telemetry, and project-local memory.

This repository is the AIOSON core itself: the CLI, templates, agent prompts, process skills, runtime store, and governance docs that get installed into downstream projects.

## Who Uses It

- Developers who want Codex, Claude Code, or another LLM client to work through a structured software process instead of ad hoc prompting.
- Product and engineering leads who want PRD, analysis, architecture, implementation, QA, and handoff artifacts to remain recoverable between sessions.
- AIOSON agents such as `@product`, `@analyst`, `@architect`, `@dev`, `@qa`, `@neo`, and `@deyvin`, which use local files and CLI commands as the source of truth for context.

## Core Purpose

AIOSON reduces repeated project explanation by keeping durable context under `.aioson/context/`, project-specific rules under `.aioson/rules/`, structural code governance under `.aioson/design-docs/`, runtime history under `.aioson/runtime/`, session fallback logs under `aioson-logs/`, and procedural memory under `.aioson/brains/`.

The intended operating model is: agents load only the relevant memory layers, use CLI preflight/status commands for deterministic state, write decisions back to disk, and leave enough context for the next LLM session to resume without rediscovering the project from scratch.
