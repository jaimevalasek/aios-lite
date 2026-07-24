---
description: Static local Briefing Refiner review surface contract used only when the CLI renderer is unavailable
agents: [briefing-refiner]
task_types: [review-surface-fallback]
triggers: [briefing review CLI unavailable]
---

# Briefing Review Surface Fallback

Use only when `aioson briefing:review` is genuinely unavailable. CLI validation errors are not unavailability; fix their input.

`review.html` must be static, local, self-contained, and in the interaction language:

- no server or external scripts, styles, fonts, or services;
- editable plain-text sections with `unchanged`, `accepted`, `change_requested`, `remove_requested`, and `blocked`;
- findings grouped by section with `pending`, `accepted`, `rejected`, or `deferred`, note fields, and working category filters;
- section notes plus a summary of intended changes, uncertainties, and PRD blockers;
- localStorage autosave and restore;
- export/download/copy JSON always available;
- File System Access API only as progressive enhancement, falling back to download on `SecurityError`;
- canonical feedback v1.1 JSON with source hash embedded.

Self-check:

```bash
aioson verify:artifact . --kind=review --slug={slug} --advisory 2>/dev/null || true
```

The fallback changes only surface rendering. Structured JSON remains canonical and the normal dry-run, explicit-confirmation, application, review-intelligence, and handoff contracts remain active.
