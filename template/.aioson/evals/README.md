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
