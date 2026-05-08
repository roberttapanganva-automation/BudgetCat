## Terminal Commands

Use RTK for terminal commands when possible, but only for commands that exist as real executables on Windows.

Prefer:

- `rtk git status`
- `rtk git diff`
- `rtk npm run build`
- `rtk npm run lint`
- `rtk npx tsc --noEmit`

Do not use `rtk ls` in Windows PowerShell because `ls` is only a PowerShell alias, not a real executable.

For listing files in PowerShell, use:

- `Get-ChildItem`
- `dir`

For searching text in PowerShell, use:

- `Select-String`

If RTK fails or is unavailable, fall back to the normal command and explain why.