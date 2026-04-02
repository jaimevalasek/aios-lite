# SDLC Genius — Pilot Install and Rollback Checklist

> Created: 2026-04-02
> Status: template — fill in before installation
> Purpose: Ensure the pilot is safe, scoped, and reversible before any installation

---

## Pre-Installation Gate

Do NOT proceed with installation until ALL of the following are confirmed:

- [ ] Plan 69 Phase 0 is complete (process-skill reference debt fixed)
- [ ] `docs/integrations/sdlc-genius-boundary.md` is read and understood by the pilot owner
- [ ] Public evaluation questions in `searchings/sdlc-genius-public-evaluation.md` are answered
- [ ] Privacy policy at https://sof.to/privacy-policy has been reviewed
- [ ] Pilot repo is chosen and is NOT a production-critical repo
- [ ] At least one person knows how to uninstall the app

---

## Pilot Scope

| Field | Value |
|-------|-------|
| Pilot repo | _(fill in)_ |
| Installer name | _(fill in)_ |
| Install date | _(fill in)_ |
| Planned end date | _(fill in)_ |
| Organization | _(fill in)_ |

---

## Permissions Review

Before installation, verify and record the permissions the app requests:

| Permission | Requested? | Acceptable? | Notes |
|------------|-----------|-------------|-------|
| Repository read (code) | _(confirm)_ | _(yes/no)_ | |
| Repository write (pull requests) | _(confirm)_ | _(yes/no)_ | |
| Repo limited to pilot repo only | _(confirm)_ | _(yes/no)_ | |
| Org-wide access | _(confirm)_ | _(yes/no/reject)_ | Reject if org-wide and cannot scope |
| Other permissions | _(list any)_ | _(yes/no)_ | |

**If org-wide write access cannot be scoped to a single repo: DO NOT INSTALL.**

---

## Rollback Path

| Step | Owner | Done? |
|------|-------|-------|
| Identify uninstall path in GitHub App settings | _(name)_ | [ ] |
| Confirm the pilot repo reverts to normal after uninstall | _(name)_ | [ ] |
| Identify who has permissions to uninstall | _(name)_ | [ ] |
| Document uninstall steps here | _(fill in)_ | [ ] |

Uninstall steps:
```
1. _(fill in after confirming from GitHub App settings)_
2. 
3. 
```

---

## Safety Settings to Verify Before First PR

- [ ] SDLC Genius comments are visible but not blocking (no required status checks set)
- [ ] The app cannot merge PRs automatically
- [ ] The app cannot push commits to the repo
- [ ] A pilot owner has verified the first comment output before telling others to use it

---

## Rollback Owner

| Role | Name |
|------|------|
| Pilot owner (decision to install) | _(fill in)_ |
| Uninstall owner (authorized to remove) | _(fill in)_ |
| Privacy review owner | _(fill in)_ |

---

## Post-Pilot Disposition

At the end of the pilot, one of the following applies:

- [ ] **Keep** — update boundary doc, promote to template
- [ ] **Keep with limits** — update scope in boundary doc, document narrow use
- [ ] **Remove** — uninstall, archive this checklist, record reason in `plans/70.1-RESULT-sdlc-genius-pilot.md`
