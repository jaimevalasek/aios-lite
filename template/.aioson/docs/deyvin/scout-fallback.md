---
description: "CLI-less sub-task scout contract — the manual prompt Deyvin composes when `aioson scout:prep` is unavailable."
agents: [deyvin]
task_types: [implementation, verification]
triggers: [scout fallback, cli-less scout, sub-task scout without cli]
---

# CLI-less sub-task scout contract

This is the manual mirror of the `scout:prep` payload. It exists only for the
repo-with-`.aioson/`-but-no-CLI case; when `aioson --version` works, `scout:prep`
owns this contract and this file must not be loaded.

Compose the scout prompt with exactly:

1. Header: `You are a sub-task scout for AIOSON. Your job is read-only investigation.`
2. Parent context block carrying `{parent_session_excerpt}` (50–1000 chars, mandatory for cold-load comprehension).
3. Hard constraints: `Tools allowed: Read, Grep ONLY. Tools forbidden: Bash, Edit, Write.`
4. Output contract: one JSON object with `schema_version`, `id`, `parent_agent`,
   `parent_session_id`, `parent_session_excerpt`, `question`, `scope`,
   `completed_at`, `status`, `confidence`, `recommendation`, `findings[]`,
   `files_inspected[]`.

Caps are the same as the CLI path: at most 3 scouts per parent session, 20 files
per scope. If more is needed, hand off to `/architect`.
