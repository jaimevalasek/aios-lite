# Git Conventions

> Clean history is documentation. Every commit tells a story. Make it worth reading.

---

## Conventional Commits — format

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### Types

| Type | When to use |
|---|---|
| `feat` | New feature or capability |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, whitespace — no logic change |
| `refactor` | Code restructuring — no feature/fix |
| `perf` | Performance improvement |
| `test` | Adding or fixing tests |
| `chore` | Build process, dependencies, tooling |
| `ci` | CI configuration |
| `revert` | Reverts a previous commit |

### Scope (optional but recommended)

Use the affected module, layer, or feature: `auth`, `appointments`, `billing`, `api`, `ui`, `db`.

---

## Commit message examples

```bash
# Good — specific, uses type + scope
feat(appointments): add conflict detection when booking same doctor

fix(auth): redirect to intended URL after login

docs(api): add Postman collection for appointments endpoints

refactor(billing): extract InvoiceCalculator from OrderService

test(appointments): add edge cases for past-date booking validation

chore(deps): bump laravel/framework to 11.3.0

perf(db): add index on appointments(doctor_id, date)

ci(release): skip npm publish when version already exists
```

```bash
# Bad — no context, no type
git commit -m "fix bug"
git commit -m "changes"
git commit -m "WIP"
git commit -m "update stuff"
```

---

## Subject line rules

- Imperative mood: "add", "fix", "remove" — not "added", "fixed", "removes"
- No period at the end
- Max 72 characters
- If you can't describe it in 72 chars, the commit is too large — split it

---

## Commit body (when needed)

Use the body to explain **why**, not **what**. The diff shows what changed.

```
fix(appointments): prevent double-booking under concurrent requests

Without a database-level lock, two simultaneous booking requests for the
same doctor+timeslot could both pass the in-memory conflict check and
create duplicate appointments.

Added SELECT ... FOR UPDATE to the conflict check query to serialize
concurrent writes at the database level.

Closes #142
```

---

## Branching strategy

### Git Flow (default for projects with releases)

```
main          ← production, protected, tagged releases only
develop       ← integration branch, latest stable work
feature/*     ← new features (branch from develop)
fix/*         ← bug fixes (branch from develop or main)
release/*     ← release preparation (branch from develop)
hotfix/*      ← urgent production fixes (branch from main)
```

### GitHub Flow (simpler, for continuous deployment)

```
main          ← always deployable, protected
feature/*     ← short-lived feature branches (branch from main)
fix/*         ← short-lived fix branches (branch from main)
```

**Use GitHub Flow** for small/medium teams shipping continuously. Use Git Flow when maintaining multiple versions.

---

## Branch naming

```bash
feature/appointment-conflict-detection
feature/stripe-billing-integration
fix/login-redirect-loop
fix/n1-query-appointments-index
hotfix/production-500-on-checkout
chore/upgrade-laravel-11
docs/add-api-postman-collection
```

---

## Pull Request conventions

**Title:** same format as a commit message — `type(scope): subject`

**Description template:**
```markdown
## What
Brief description of the change.

## Why
Context — what problem does this solve? Link issues.

## How
Key technical decisions made. Alternatives considered.

## Test plan
- [ ] Manual steps to verify the change
- [ ] Automated tests added/updated

## Screenshots (if UI change)
```

---

## Tagging and releases

```bash
# Semantic versioning: MAJOR.MINOR.PATCH
git tag -a v1.2.3 -m "Release v1.2.3"
git push origin v1.2.3

# MAJOR — breaking changes
# MINOR — new backwards-compatible features
# PATCH — bug fixes
```

---

## Protecting shared history

```bash
# NEVER force push to shared branches
git push --force origin main   # FORBIDDEN

# Rebase private branches before merging (keep history clean)
git checkout feature/my-feature
git rebase develop

# Squash noisy WIP commits before PR
git rebase -i develop   # interactive rebase
```

---

## Useful git commands

```bash
# See what changed in last commit
git show --stat

# Amend last commit message (before push only)
git commit --amend -m "fix(auth): correct redirect target"

# Stash uncommitted changes
git stash push -m "WIP: appointment form validation"
git stash pop

# Find which commit introduced a bug
git bisect start
git bisect bad HEAD
git bisect good v1.1.0

# Clean untracked files (dry run first)
git clean -n   # preview
git clean -fd  # execute
```

---

## ALWAYS
- Write imperative, specific commit messages
- One logical change per commit
- Branch from the correct base (`main` or `develop`)
- Rebase feature branches before merging
- Tag releases with semantic versions

## NEVER
- Force push to `main` or `develop`
- Commit secrets, `.env` files, or credentials
- Use generic messages ("fix", "update", "changes")
- Commit commented-out code — delete it instead
- Leave WIP commits in a PR — squash or amend before review
