# Naming Registry — design-hybrid-forge

Load when naming a new hybrid or checking for conflicts.

---

## Registered hybrids

| Hybrid name | Parents | Shipped | Domain |
|---|---|---|---|
| `aurora-command-ui` | cognitive-core-ui × glassmorphism-ui | 2026-03-29 | SOC, AI platforms, dev tools |

---

## Naming conventions

### Rules

1. The name must be a compound of 2–3 words separated by hyphens.
2. Must end in `-ui` (consistent with native skills).
3. Must NOT contain either parent name (not "glass-core-ui", not "warm-glass-ui").
4. Must evoke the resolved creative tension — the hybrid's *vibe*, not its recipe.
5. Must be original — check this registry before finalizing.

### Patterns that work

| Pattern | Examples |
|---|---|
| `{atmosphere}-{function}-ui` | `aurora-command-ui`, `dusk-ops-ui`, `frost-bureau-ui` |
| `{material}-{role}-ui` | `crystal-forge-ui`, `void-craft-ui`, `obsidian-core-ui` |
| `{temperature}-{structure}-ui` | `warm-terminal-ui`, `cold-editorial-ui`, `ember-grid-ui` |
| `{light}-{discipline}-ui` | `shadow-data-ui`, `neon-ledger-ui`, `pale-signal-ui` |

### Patterns to avoid

- Concatenating parent names: `glass-cognitive-ui`, `brutalist-warm-ui` ✕
- Generic terms: `modern-ui`, `premium-dark-ui`, `clean-glass-ui` ✕
- Overclaiming: `perfect-ui`, `ultimate-command-ui` ✕
- Too abstract with no feel: `hybrid-alpha-ui`, `variant-b-ui` ✕

---

## Name ideas bank (unclaimed)

The following names are available for future hybrids. They are not reserved — first hybrid that ships with a matching identity claims the name.

### Dark + glass tier
- `void-glass-ui` — dark structural void with glass transparency
- `eclipse-dashboard-ui` — dark command, glass panels, celestial depth
- `obsidian-signal-ui` — black-glass surfaces with sharp operational precision
- `midnight-forge-ui` — deep dark atmosphere with raw structural energy

### Warm + structured tier
- `ember-command-ui` — warm earthy palette meeting command center density
- `clay-terminal-ui` — terracotta palette over raw grid structure
- `warm-bureau-ui` — humanized command center, serif meets mono
- `amber-ops-ui` — golden-warm atmosphere with operational structure

### Raw + luminous tier
- `brutalist-glass-ui` — raw borders made luminous through glass
- `frost-grid-ui` — neo-brutalist structure with glass frost treatment
- `chalk-signal-ui` — rough texture with precision data signals
- `raw-aurora-ui` — structural honesty floating on a glass aurora

### Editorial + depth tier
- `cinema-data-ui` — editorial cinematic rhythm with data density
- `manifesto-ops-ui` — bold editorial headlines + operational panels
- `dark-editorial-glass-ui` — editorial structure with glass depth layers
- `ink-command-ui` — editorial typography commanding operational data

### Clean + luminous tier
- `crystalline-saas-ui` — minimal glass precision for enterprise
- `cloud-command-ui` — clean systematic structure with glass elevation
- `pale-aurora-ui` — light glass system over soft gradient, enterprise-grade

---

## How to register a new hybrid

Only after explicit core promotion, add a row to the "Registered hybrids" table with:
- The exact skill name used in the directory
- Both parent skill names (alphabetical order)
- The date shipped (`YYYY-MM-DD`)
- 3–4 word domain description

Also remove the name from the ideas bank if it was claimed from there.

Project-local hybrids do not update this registry automatically. They should keep their chosen name in `.skill-meta.json` until a curator promotes them to core.
