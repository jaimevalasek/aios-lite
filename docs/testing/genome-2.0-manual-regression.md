# Genome 2.0 Manual Regression

Run this only after the gated rollout in `genome-2.0-rollout.md` finishes green.

## Core

- Create a Genome 2.0 file with the core helpers or CLI and confirm both markdown and `.meta.json` are written.
- Read a legacy genome markdown and confirm the core still normalizes it without error.
- Apply a genome to a squad and inspect `squad.manifest.json`, `.designs/*.blueprint.json` and `docs/readiness.md`.

## Dashboard

- Open `/genomes` and confirm the new genome appears with metadata and binding counts.
- Open `/squads` and confirm the target squad shows genome badges.
- Open the squad workspace and use `Manage genomes` to inspect bindings.
- Open `/pipelines` and confirm pipelines still load with squad-only nodes.
- Open a pipeline node inspector and confirm genome bindings appear as contextual badges and inspector items.

## Compatibility

- Re-run the same flow with a legacy genome fixture and confirm no page crashes or malformed payloads.
- Confirm pipelines never accept genome as executable node.
- Confirm removing a binding from the dashboard does not corrupt the persisted manifest.
