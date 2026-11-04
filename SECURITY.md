# Security policy

Please do not publish secrets, provider API keys, tokens, private source code, or customer data in bug reports.

## Reporting a vulnerability

Open a private GitHub Security Advisory for this repository when available. If private reporting is unavailable, contact the repository owner through GitHub rather than posting exploit details publicly.

## Security design

- Renderer has `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, and `webSecurity: true`.
- The preload exposes a small allow-listed API. Renderer code does not receive Node.js or Electron primitives.
- File access is scoped to the current workspace. Path traversal and symlink escapes are rejected.
- Existing files are backed up before atomic replacement.
- AI file writes and ACP tool permissions require explicit approval.
- No credentials are persisted by this application; provider credentials belong in Goose configuration.
- Do not expose an unauthenticated Goose server, arbitrary remote shell, or project-root access to a network listener.
