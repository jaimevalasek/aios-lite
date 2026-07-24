---
description: Profiler Forge doctor commands, bounded repair, terminal states, and artifact evidence
agents: [profiler-forge]
task_types: [genome-validation, forge-verification, artifact-repair]
triggers: [verify forged genome, run genome doctor, repair persona genome]
paths: [.aioson/genomes/*/SKILL.md, .aioson/genomes/*/manifest.json]
---

# Profiler Forge Verification

## Genome gates

For a new modular package, run the positional folder command:

```bash
aioson genome:doctor .aioson/genomes/<genome-slug> --json
aioson verify:artifact . --kind=genome --slug=<genome-slug>
```

Do not pass the project root with a separate slug option; `genome:doctor` accepts the exact file or folder as its positional target.

Inspect:

- `SKILL.md` exists and matches manifest identity;
- `manifest.json` parses;
- all declared references exist and remain inside the folder;
- Track 4.2 references are structured and include method plus evidence/decision sources;
- dependencies resolve;
- advisor-ready requirements are present when enabled;
- package contains compiler-visible procedure, restrictions, checklist, style, and output behavior.

Warnings about evidence/fidelity remain visible even when structure passes.

## Advisor checks

When generated, verify the Advisor includes its model disclaimer, Genome path, operating modes, challenge protocol, current-information policy, limitations/not-for uses, and no unresolved placeholders. Advisor success does not imply a squad binding.

## Bounded repair

One repair pass may fix objective structure: missing file, invalid JSON, undeclared reference, placeholder, or identifier mismatch. Do not repair evidence limitations by inventing content. If the same gate fails again, return `NEEDS_REPAIR` with exact output and owner.

## Terminal evidence

- `PASS`: both doctor and `verify:artifact` exit successfully for the requested Genome; requested Advisor checks also pass.
- `READY_WITH_LIMITS`: Genome passes at lower stated confidence/fidelity or optional Advisor/binding is intentionally absent.
- `NEEDS_REPAIR`: a deterministic gate still fails after the bounded pass.
- `HANDOFF_REQUIRED`: missing source/rights/identity/hybrid ownership/binding target requires another owner.

Report exact commands, exit status, artifact paths, and any non-blocking warning. Prose inspection alone is not completion evidence.
