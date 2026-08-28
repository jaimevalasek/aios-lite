---
description: Partition a wave of outstanding work into a sequence of coherent commits instead of one undifferentiated dump
agents: [committer]
task_types: [commit, outstanding-work, commit-partition]
triggers: [commit everything, commit tudo, outstanding work, delivery parity advisory, many uncommitted files]
---

# Outstanding Work — partition before you stage

Load this when `aioson delivery:parity . --json` reports `tier=advisory`: the working tree holds a *wave*, not a change. One commit for the whole wave is the wrong answer — it destroys the ability to read, revert or bisect any single piece of it — and so is a mechanical file-by-file split.

## Why this exists

Work accumulates when nothing measures whether a delivery reached git. By the time someone asks for the commit, the tree may hold several unrelated waves at once: a refactor, a retirement, a doc pass, the tests for all three. The person asking says "commit everything", and means it — but "everything" is scope, not structure. Structure is your job.

## The partition

1. **Read the measurement first.** `delivery:parity --json` returns `areas` — outstanding files grouped into the slices a commit would follow, heaviest first. That is the starting hypothesis, never the answer: areas are *where* files live, and a commit is *why* they changed.

2. **Group by intent, not by directory.** Cross-cutting work belongs together: a new CLI command is its `src/commands/` file, its `src/cli.js` registration, its `src/lib/` measurement, its tests and its doc — one commit, five areas. Conversely, one directory holding two unrelated waves is two commits. Derive intent from the diff and from recent history (`git log`), not from paths alone.

3. **Keep each commit whole.** Every commit must leave the repository consistent on its own: code with the tests that cover it, a rename with every call site, a template change with its mirrored workspace copy. A commit that needs the next one to pass its own suite is a bad slice — merge them.

4. **Order by dependency.** Foundations before consumers: the measurement before the command that prints it, the retirement before the doc that stops mentioning it. Later commits may reference earlier ones; never the reverse.

5. **Confirm the partition, not each message.** Present the proposed slices — one line each, with file counts — and get one approval for the plan. Then run the full guarded flow (`commit:prepare` → `git:guard` → commit) once per slice. Asking for approval of every message across a large wave is its own failure.

## Boundaries

- The partition never changes what is committed, only how it is grouped. Nothing in the outstanding scope is silently dropped; if you deliberately leave something out, say so explicitly and say why.
- Runtime state the framework wrote itself (`.aioson/context/`, `.aioson/runtime/`) is reported separately by `delivery:parity` and is not authored work. Commit it only when the project tracks it and it belongs to a slice.
- Every slice still passes the same safety gate as any other commit. A partition is not a reason to relax `git:guard`, and a large wave is not a reason to bypass it "just this once".
- Stage each slice by concrete paths as operands to `commit:prepare`. A wave is exactly the situation where `git add -A` looks tempting and is most destructive.

## Done

The wave is delivered when `aioson delivery:parity . --json` reports `tier=clean` (or `runtime_only`) — the same measurement that opened the session, now closing it. Report the slices you shipped, in order, with their subjects.
