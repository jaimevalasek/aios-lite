# SDLC Genius — Public Capability and Risk Summary

> Created: 2026-04-02
> Sources: GitHub Marketplace listing, sof.to product page
> Purpose: Pre-pilot research artifact for Plan 70

---

## What the App Claims to Do

| Feature | Confirmed From |
|---------|----------------|
| PR Code Review (AI-assisted feedback on pull requests) | GitHub Marketplace |
| Automated Documentation (keeps docs current) | GitHub Marketplace |
| Test Optimization (generates test cases, flags risks) | GitHub Marketplace |
| Workflow Insights (AI-driven metrics and recommendations) | GitHub Marketplace |
| Planning/Requirements (User Story Creator, Evaluator, Estimator) | sof.to |
| Design Phase agents (Brainstorm, Design Reviewer) | sof.to |

**Important ambiguity:** The GitHub Marketplace listing focuses on code review, docs, and tests. The sof.to page describes a broader SDLC platform with planning and design agents. It is unclear whether all features are in the GitHub App specifically or whether sof.to describes a larger product offering. This must be confirmed before integration.

---

## Pricing

| Finding | Source |
|---------|--------|
| Free "Early Bird" plan available | GitHub Marketplace |
| Restricted to organizations (not individual users) | GitHub Marketplace |
| Only 2 installations as of research date | GitHub Marketplace |
| No other pricing tiers published | GitHub Marketplace |
| No pricing disclosed on sof.to | sof.to |

---

## GitHub Permissions

| Permission | Details | Source |
|------------|---------|--------|
| Repository read access (code and metadata) | Confirmed | GitHub Marketplace |
| Repository write access (pull requests) | Confirmed | GitHub Marketplace |
| Per-repo scoping | Not mentioned | Not found in public material |

---

## Output and Actions in GitHub

| Capability | Status |
|------------|--------|
| PR comments / feedback | Confirmed |
| Review summaries | Not mentioned |
| GitHub Checks API usage | Not mentioned |
| Issue creation | Not mentioned |
| Test case delivery method | Implied but unclear (PR comment? committed to repo? CI?) |

---

## Data Retention and Privacy

| Item | Finding |
|------|---------|
| Data retention policy | Not disclosed publicly |
| Privacy policy | https://sof.to/privacy-policy (linked but not reviewed) |
| Data deletion | Not mentioned |
| GDPR / compliance | Not mentioned |

---

## Repo Scoping

| Question | Finding |
|----------|---------|
| Can be limited to selected repos? | Not stated — implied org-wide |
| Selective repo activation? | Not mentioned |

---

## Configuration and Tuning

| Item | Finding |
|------|---------|
| Configuration interface | "GitHub's native interface" (generic, no specifics) |
| Detailed config options | Not disclosed |
| Language support | JavaScript, TypeScript, Python, Java, C#, Kotlin, Ruby, PHP, CSS, HTML |
| Customization knobs | Not mentioned |

---

## Unknowns that Block Deep Integration

The following questions must be answered before proceeding past Phase 1 of the pilot:

1. **GitHub App vs sof.to product** — are they the same thing or different products?
2. **GitHub permissions scope** — can it be limited to specific repos, not org-wide?
3. **PR comment format** — inline diffs, summary comment, or GitHub Checks?
4. **Test artifact delivery** — how are generated tests surfaced?
5. **Data retention and privacy** — what data is stored and for how long?
6. **Disable/uninstall path** — is there a clean removal process?
7. **Noise control** — can comment volume be tuned to avoid spam?
8. **Support and SLA** — what support level exists for a free plan?

---

## Risk Assessment

| Risk | Level | Reason |
|------|-------|--------|
| Org-wide write access before scoping is confirmed | HIGH | Write access to PRs org-wide is a broad permission |
| Low adoption signal | MEDIUM | Only 2 installations — product may be early/unstable |
| Unclear product scope | MEDIUM | GitHub App vs broader platform ambiguity |
| No public data retention info | MEDIUM | Cannot evaluate compliance without this |
| Comment noise | LOW-MEDIUM | No tuning details available — unknown until tested |

---

## Recommended Next Actions Before Pilot

1. Contact support via https://sof.to/contact-us to clarify:
   - GitHub App vs sof.to platform relationship
   - Per-repo scoping capability
   - Data retention and compliance details
   - PR comment format and volume control
   - Uninstall path

2. Review the privacy policy at https://sof.to/privacy-policy

3. Only after questions above are answered: proceed to Phase 2 (sandbox pilot)
