# Safe Git Workflows

## Protect current work

Begin with `git status --short --branch`. Untracked and modified files belong to the working tree and must not be discarded casually. Create a commit or a clearly named stash before operations that rewrite history.

## Understand the graph

Use `git log --oneline --graph --decorate -12` and inspect the target branches. Merge preserves branch history; rebase rewrites the current branch onto a new base. Do not rebase commits that collaborators already use without coordination.

## Resolve conflicts deliberately

Open each conflict, understand both intended changes, edit the final combined result, and run focused tests before continuing. Conflict markers must be fully removed. Review the staged diff before completing the merge or rebase.

## Recover safely

Prefer reversible inspection commands. `git reflog` can locate earlier branch tips. Avoid hard reset and forced checkout when the exact target and consequences are unclear.
