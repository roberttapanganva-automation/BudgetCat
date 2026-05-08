# Agent Instructions

## Command Execution

Use RTK for terminal commands when possible to reduce terminal output and keep command results easier to review.

Prefer RTK-wrapped commands:

```bash
rtk git status
rtk git diff
rtk ls
rtk grep "keyword" .
rtk npm run build
rtk npm run lint
rtk npm run typecheck
rtk tsc