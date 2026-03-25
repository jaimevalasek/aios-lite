# Git Worktrees — Isolated Development

> Optional but recommended for SMALL/MEDIUM feature work.
> Keeps main branch clean while you develop.

## When to use
- Starting implementation of a new feature branch
- When you want to be able to discard work safely
- When you need to switch context between features

## Quick setup
```bash
# Create worktree for feature
git worktree add ../project-feature-name -b feature/name

# Work in the worktree
cd ../project-feature-name
# ... install deps, run setup ...

# When done: merge or discard
git worktree remove ../project-feature-name
```

## Safety rule
The worktrees directory must be in `.gitignore`.
Add before creating:
```bash
echo ".worktrees/" >> .gitignore
git add .gitignore && git commit -m "chore: add worktrees to gitignore"
```

## Finish options
1. Merge back to main locally
2. Push and create PR
3. Keep branch as-is (continue later)
4. Discard (requires typing "discard" to confirm)
