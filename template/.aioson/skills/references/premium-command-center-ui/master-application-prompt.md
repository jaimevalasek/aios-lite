# Master Application Prompt

Use the prompt below when another agent needs to apply `premium-command-center-ui` to a new project.

---

## Prompt

```text
Apply the `premium-command-center-ui` skill to this project.

Your job is to produce a premium operational interface derived from the real AIOS Dashboard patterns, not a generic dark admin panel.

Work from the current codebase and data model first. Do not invent abstract design systems disconnected from the implementation.

Required behavior:
1. Inspect the existing routes, components, and real domain objects before proposing layout changes.
2. Identify the true operational nouns and verbs of the product.
3. Translate raw domain records into UI-native objects when needed (for example: lanes, queues, memory assets, grouped registries, current signal summaries).
4. Choose the right page archetype per route:
   - command center overview
   - queue / control tower
   - workflow catalog
   - knowledge explorer
   - grouped registry
5. If the product has enough complexity, use a tri-rail shell on desktop:
   - left navigation
   - center workspace
   - right contextual activity rail
6. Preserve the visual system:
   - deep graphite or cool-mist base
   - aurora page atmosphere
   - borders-first depth
   - 3 surface levels max
   - compact density
   - restrained semantic tones
7. Preserve the interaction system:
   - search-first top bar
   - command palette if route count justifies it
   - direct drill-down actions inside major cards
   - styled empty states
   - contextual status/history/metrics support
8. Keep the result responsive by collapsing progressively rather than inventing a disconnected mobile UI.
9. Avoid generic solutions:
   - no flat card wall
   - no washed-out contrast
   - no oversized spacing
   - no random gradients
   - no equal importance for every section
10. Implement real code, not a moodboard.

Before coding, state briefly:
- visual direction
- shell decision
- page archetype per affected route
- primary reusable components you will create or reuse

During implementation, maintain these quality rules:
- runtime / primary operations appear before infrastructure
- one focal block per page
- every major card has a next action when relevant
- semantic colors mean something specific
- compact density is preserved
- premium feel comes from behavior as much as appearance

Final output must include:
- what changed in the UI and why
- which components or routes were updated
- responsive notes
- validation against the premium-command-center-ui checklist
```

---

## How to use this prompt

- Use it when the target project is operational, multi-module, and needs a premium shell.
- Pair it with the visual system and UX playbook references, not by itself.
- If the project is a landing page or marketing site, do not use this prompt; use a site-focused skill instead.
