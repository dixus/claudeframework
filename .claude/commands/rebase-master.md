---
description: Fetch origin/master and rebase the current branch onto it
---

Rebase the current branch onto the latest `origin/master`:

1. Run `git fetch origin master` to get the latest master.
2. Check for uncommitted changes with `git status --short`. If there are any, stash them with `git stash push -m "auto-stash before rebase"`.
3. Run `git rebase origin/master`.
4. If there are merge conflicts:
   - Show the conflicted files.
   - For each conflict, read the file, resolve it by keeping both sides where sensible (prefer master for infrastructure, prefer branch for feature code), then `git add` the resolved file.
   - Run `git rebase --continue`. Repeat until done.
5. If changes were stashed in step 2, run `git stash pop` to restore them.
6. Run `git push --force` to update the remote branch with the rebased history.
7. Show `git log --oneline -5` to confirm the result.
