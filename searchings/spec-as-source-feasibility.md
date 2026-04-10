# Research: Spec-as-Source Feasibility

> Phase 4.4 of Plan 78 | April 2026
> Question: Can `conformance-{slug}.yaml` auto-generate test files?

---

## 1. AIOSON Conformance Format (as-is)

The conformance contract is defined in `template/.aioson/agents/analyst.md` (line 274) and consumed by `template/.aioson/agents/tester.md` (line 28). Format:

```yaml
feature: checkout
spec_version: 1
generated_at: 2026-04-01T10:00:00Z

acceptance_criteria:
  - id: AC-checkout-01
    description: "Patient can book appointment for available slot"
    type: behavior          # behavior | data | security | performance
    preconditions:
      - "Slot exists and is not booked"
      - "User is authenticated as patient"
    action: "POST /appointments with valid slot_id"
    expected:
      - "Returns 201 with appointment object"
      - "Slot status changes to booked"
    negative_cases:
      - input: "slot_id for already booked slot"
        expected: "Returns 409 Conflict"
      - input: "slot_id in the past"
        expected: "Returns 422 with validation error"
```

Key observations:
- The format is **already structured for test generation**: preconditions map to setup, action maps to execution, expected maps to assertions, negative_cases map to failure paths.
- @tester already manually performs this mapping (tester.md lines 33-41).
- The format exists only for MEDIUM projects. MICRO/SMALL fall back to prose ACs in `requirements-{slug}.md`.

---

## 2. Can conformance YAML auto-generate test files?

**Yes, deterministically, for the skeleton.** The mapping is mechanical:

| YAML field | Test construct |
|---|---|
| `id` | Test name / describe block |
| `description` | Test docstring / comment |
| `preconditions[]` | Setup / arrange phase (comments or factory stubs) |
| `action` | Act phase (HTTP call, function invocation) |
| `expected[]` | Assert phase (one assertion per expected item) |
| `negative_cases[]` | Additional test cases (one per entry) |
| `type` | Test category grouping (behavior vs security vs performance) |

**What is deterministic:** test file structure, test names, AC traceability IDs, grouping by type, number of test cases per AC, setup/act/assert skeleton with comments.

**What requires LLM or human:** actual assertion code (e.g., `expect(response.status).toBe(201)`), factory/fixture setup code, mock configuration, imports specific to the project.

### Prototype: Laravel/Pest

Given the conformance YAML above, a generator would produce:

```php
<?php
// Auto-generated from conformance-checkout.yaml v1
// Generated: 2026-04-04 | Do not edit — regenerate from spec

use function Pest\Laravel\{actingAs, postJson};

describe('AC-checkout-01: Patient can book appointment for available slot', function () {

    // Preconditions:
    // - Slot exists and is not booked
    // - User is authenticated as patient

    it('books appointment for available slot', function () {
        // ARRANGE: Slot exists and is not booked
        // ARRANGE: User is authenticated as patient

        // ACT: POST /appointments with valid slot_id

        // ASSERT: Returns 201 with appointment object
        // ASSERT: Slot status changes to booked
    })->todo();

    it('AC-checkout-01-neg-1: rejects already booked slot', function () {
        // INPUT: slot_id for already booked slot
        // ASSERT: Returns 409 Conflict
    })->todo();

    it('AC-checkout-01-neg-2: rejects past slot', function () {
        // INPUT: slot_id in the past
        // ASSERT: Returns 422 with validation error
    })->todo();
});
```

### Prototype: Next.js/Vitest

```ts
// Auto-generated from conformance-checkout.yaml v1
// Generated: 2026-04-04 | Do not edit — regenerate from spec

import { describe, it, expect } from 'vitest'

describe('AC-checkout-01: Patient can book appointment for available slot', () => {

  // Preconditions:
  // - Slot exists and is not booked
  // - User is authenticated as patient

  it('books appointment for available slot', () => {
    // ARRANGE: Slot exists and is not booked
    // ARRANGE: User is authenticated as patient

    // ACT: POST /appointments with valid slot_id

    // ASSERT: Returns 201 with appointment object
    // ASSERT: Slot status changes to booked
    expect.fail('TODO: implement test')
  })

  it('AC-checkout-01-neg-1: rejects already booked slot', () => {
    // INPUT: slot_id for already booked slot
    // ASSERT: Returns 409 Conflict
    expect.fail('TODO: implement test')
  })

  it('AC-checkout-01-neg-2: rejects past slot', () => {
    // INPUT: slot_id in the past
    // ASSERT: Returns 422 with validation error
    expect.fail('TODO: implement test')
  })
})
```

---

## 3. What test frameworks support YAML-driven test generation?

### Direct YAML consumption (no intermediate step)

| Framework | YAML support | How |
|---|---|---|
| Pest (PHP) | Datasets from array/generator | `pest->with(yaml_parse_file(...))` for parameterized — but not for skeleton generation |
| Vitest | No native YAML datasets | Would need a custom plugin or pre-generation step |
| pytest | `@pytest.mark.parametrize` + PyYAML | Most natural fit — Python has first-class YAML support |
| RSpec | Shared examples + YAML | Possible but uncommon in Rails ecosystem |

### Cucumber/Gherkin as intermediate format

The conformance YAML could generate `.feature` files:

```gherkin
Feature: checkout

  Scenario: AC-checkout-01 — Patient can book appointment for available slot
    Given Slot exists and is not booked
    And User is authenticated as patient
    When POST /appointments with valid slot_id
    Then Returns 201 with appointment object
    And Slot status changes to booked

  Scenario: AC-checkout-01-neg-1 — rejects already booked slot
    When slot_id for already booked slot
    Then Returns 409 Conflict
```

**Verdict on Gherkin intermediate:** Technically clean, but introduces a dependency (Cucumber/Behat) that most AIOSON target projects do not use. The conformance YAML is already more precise than Gherkin (it has typed fields). Going YAML -> Gherkin -> test code adds a layer without adding information.

### Best path: direct code generation

The conformance format is already richer than Gherkin. A direct YAML-to-test-skeleton generator is simpler and produces more useful output than routing through an intermediate format.

---

## 4. Could `aioson spec:test-gen` be a viable command?

### Deterministic vs LLM-assisted

**Level 1 — Deterministic skeleton (viable now):**
- Reads `conformance-{slug}.yaml`
- Detects framework from `project.context.md`
- Generates test file with correct structure, names, grouping, and TODO comments
- Output: runnable test file where every test is marked as `todo`/`skip`/`expect.fail`
- Zero LLM cost, reproducible, fast

**Level 2 — LLM-assisted fill (viable but risky):**
- Takes the skeleton + reads actual source code
- Fills in real assertions, factory calls, mock setup
- Output: tests that might actually pass
- Requires LLM, non-reproducible, expensive, often wrong

**Recommendation: implement Level 1 only.** Level 2 is what @tester already does manually with full context. Automating Level 2 poorly would be worse than having @tester do it with judgment.

### Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Generated tests create false confidence ("we have 47 tests!") | High | Mark all generated tests as `todo` — they do not pass CI until filled |
| Generated skeletons become maintenance burden (drift from YAML) | Medium | Regenerate, do not edit — treat generated files as derived artifacts |
| Developers skip filling tests because skeleton "looks complete" | Medium | CI gate: `todo` tests count as failures in coverage report |
| Format lock-in: changing conformance YAML structure breaks generator | Low | Generator is <200 lines — easy to update |

---

## 5. What does "Spec-as-Source" mean in practice?

### Maturity levels

| Level | Name | Description | AIOSON status |
|---|---|---|---|
| 1 | Spec-First | Spec written before code | Has this (analyst -> dev flow) |
| 2 | Spec-Anchored | Spec maintained after delivery, used for resumption | Has this (spec-{slug}.md with phase_gates) |
| 3 | Spec-as-Source | Spec IS the executable test suite | Research target |

### What Level 3 means concretely

At Level 3, the conformance YAML is the single source of truth for acceptance verification:
- Change an AC in the YAML -> test file regenerates -> CI detects the delta
- Add a negative case in YAML -> new test case appears automatically
- Remove an AC -> corresponding test disappears (or is flagged as orphaned)

**Level 3 requires:**
1. A generator (`spec:test-gen`) that produces deterministic skeletons
2. A separation between generated skeleton and human-written test body (so regeneration does not destroy implementation)
3. A drift detector: if YAML changes but test file was not regenerated, warn

**The hard problem is #2.** Options:
- **Partial file approach:** generated file has `// @generated` markers; human fills the body between markers. Regeneration preserves filled sections, updates structure around them. Fragile, error-prone.
- **Two-file approach:** `checkout.gen.test.ts` (generated, never edit) + `checkout.test.ts` (human, imports from gen). Generated file exports test metadata; human file provides implementations. Clean but unusual pattern.
- **Companion file approach:** Generated file is test skeleton. Human writes a separate `checkout.impl.test.ts` that the skeleton file imports for setup/teardown helpers. Simplest, least friction.

**Practical assessment:** The two-file or companion approach works. But the value proposition is narrow — it saves @tester maybe 5 minutes of structuring per feature. The real work is writing the assertions, which stays manual regardless.

---

## 6. Recommendation

**Implement `spec:test-gen` as Level 1 (deterministic skeleton) only.**

Rationale:
- The conformance YAML already has the right structure — the mapping is mechanical
- It eliminates a manual step that @tester currently does by reading YAML and creating test files
- It enforces AC traceability (test names always match AC IDs)
- It costs nothing at runtime (no LLM, pure template)
- It does not create false confidence when tests are marked `todo`

**Do not pursue full Level 3 (Spec-as-Source) now.** The two-file separation pattern needed for regeneration without data loss adds complexity that is not justified given AIOSON's current project scale. Revisit when there are 10+ conformance contracts in active use across real projects.

**Defer Gherkin intermediate format.** The conformance YAML is already more structured than Gherkin. Adding Cucumber/Behat as a dependency would increase complexity without adding value.

---

## 7. If implement: scope for plan

### Minimal viable scope

**Command:** `aioson spec:test-gen <slug> [--framework=auto]`

**Inputs:**
- `.aioson/context/conformance-{slug}.yaml` (required)
- `.aioson/context/project.context.md` (for framework detection)

**Outputs:**
- `tests/Feature/AC-{slug}.test.{ext}` (or framework-appropriate path)
- All tests marked as `todo`/pending
- Header comment with generation timestamp and source YAML version

**Framework templates needed (start with 2):**
1. Laravel/Pest (PHP) — `describe` + `it()->todo()`
2. Vitest (TypeScript) — `describe` + `it` with `expect.fail('TODO')`

**Implementation estimate:** ~150 lines of JS/TS for the generator + 2 framework templates (~50 lines each). Single file in `src/commands/spec-test-gen.js`. No external dependencies beyond `js-yaml`.

**What this does NOT include:**
- LLM-assisted test body generation (Level 2)
- Drift detection between YAML and test files
- Regeneration with preservation of human-written sections
- Support for MICRO/SMALL projects (no conformance YAML)

### Acceptance criteria for the command itself

- AC-1: Given a valid conformance YAML, generates a test file with one `describe` per AC and one `it` per expected + negative case
- AC-2: All generated tests are marked as pending/todo (zero passing tests on fresh generation)
- AC-3: Test names include AC IDs for traceability (`AC-{slug}-{N}`)
- AC-4: Running the generated test file does not error (syntax is valid for target framework)
- AC-5: If conformance YAML does not exist, exits with clear error message
