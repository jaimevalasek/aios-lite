# Context trigger evals

Deterministic reachability proof for the routed knowledge tree. Every `*.json`
file here holds scenarios that `aioson context:evals .` replays through the
real retrieval engine (`context:brief`): an `expect` asserts the artifact
surfaces for a realistic task, an `absent` asserts it stays quiet on an
unrelated one, and coverage lists every rule/doc/skill that declares routing
frontmatter but is proven by no scenario.

```json
{
  "version": 1,
  "scenarios": [
    {
      "name": "kanban rule is law on board work",
      "agent": "dev",
      "mode": "executing",
      "task": "add drag and drop between kanban columns",
      "paths": ["src/ui/Board.tsx"],
      "expect": [{ "path": ".aioson/rules/status-flow-drag-and-drop.md", "in": "must_load" }],
      "absent": [{ "path": ".aioson/rules/management-home-widgets.md", "in": "must_load" }]
    }
  ]
}
```

`in`: `must_load` | `should_load` | `skills` | `selected` (any section).
Defaults: `selected` for expect, `must_load` for absent. Optional
`max_must_bytes` fails the scenario when `must_load` pulls more bytes than the
budget.

When you add a project rule, add at least one positive scenario for it — a
failed expect prints the exclusion cause and a concrete frontmatter
suggestion. `--strict` turns failures and uncovered artifacts into a non-zero
exit for CI.

## Negatives are half the proof

Coverage says every artifact fires somewhere; it says nothing about firing
where it should not. The report carries a confusion matrix — `recall`
(expects that surfaced), `precision` (absents that stayed quiet against the
positives), `f1` — and precision is only as real as the corpus of `absent`
checks behind it. `negatives.evals.json` holds neutral, realistic tasks
(a README typo, a dependency bump, a date-helper refactor, a migration) that
assert the rules and skills with the broadest triggers stay quiet. Write one
whenever a rule fires on a task it was never meant for: a bare trigger such as
`column`, `prints` or `report` reads as a database column, a printed version
string or a CSV export just as easily as a kanban column, a screenshot or a
dashboard widget — narrow it to the phrase your domain actually uses.

## From reachable to consulted

Evals prove the selector offers the artifact; whether an agent asked for the
brief is runtime telemetry. `aioson context:usage .` reads it: selections per
artifact, confirmed loads (`context:load`), session ends without a brief for
agents whose kernel mandates one, artifacts loaded that no brief offered
(a routing gap — run `context:select --explain=<path>`), and active skills no
brief selected in the window (trigger review or retirement candidates).
