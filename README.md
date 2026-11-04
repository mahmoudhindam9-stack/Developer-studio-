# Developer Studio Pro — Independent Visual Workspace

This repository is the independent web/desktop distribution of the visual Developer Studio. The authoritative source for visual-editor features and design changes is the Developer Studio page in the Juba repository; changes should be reviewed there first, then ported into this repository without copying Juba runtime services or credentials.

## Feature set

- Live, same-origin visual preview with selectable DOM elements and a visual editing toolbar.
- Content, style, dimension, spacing, responsive layout, hover and interaction editing.
- Page management, nested element tree, duplicate/visibility/lock controls, and reusable components.
- Global design tokens, theme presets, typography, spacing, radius and shadows.
- Media library with upload, search, folders, replacement and usage-aware deletion.
- Accessibility, responsive and design-consistency audits with safe fixes.
- Find/replace, command palette, code inspection, arithmetic/workflow helpers and JSON import/export.
- Undo/redo, local saved drafts, named checkpoints, version history, compare and local publish/rollback.
- Optional Gemini design assistant routed through this repository's own Vercel Function.

## Strict isolation boundaries

| Area | Juba | Independent Developer Studio |
| --- | --- | --- |
| GitHub | mahmoudhindam9-stack/jupa-sep | mahmoudhindam9-stack/Developer-studio- |
| Vercel project | juba-aug | developer-studio-isolated |
| Data store | Juba's configured Supabase project | Browser IndexedDB + localStorage only |
| Authentication | Juba's own Supabase Auth | No Juba login/session or shared user table |
| Secrets | Juba Vercel environment only | No Juba keys; optional DEVELOPER_STUDIO_GEMINI_* variables belong only to the standalone Vercel project |

The standalone app must not add @supabase/supabase-js, import a Juba integration client, use Juba's project URL/ID, reuse Juba environment variables, or run Juba database migrations. Its local namespace is developer-studio-independent-pro and its key prefix is developer-studio-independent-pro:v1.

The app does not transmit drafts, assets, published snapshots or user data to Juba. Local publish/versioning updates the standalone browser's own local published snapshot; it does not publish to Juba or deploy Vercel. Use JSON export/import when moving a workspace between browsers or machines.

## Optional isolated Gemini assistant

The visual assistant calls /api/studio-assist, a function stored in this repository. It reads only these optional environment variables from the developer-studio-isolated Vercel project:

- DEVELOPER_STUDIO_GEMINI_API_KEY
- DEVELOPER_STUDIO_GEMINI_MODEL

Do not copy values from Juba or from any other project. Until both variables are configured independently, the assistant reports that it is not configured; all non-AI editing features remain available. The API key is never compiled into the browser bundle or committed to GitHub.

## Development

Requirements: Node.js 22+ and npm.

npm install
npm run verify:isolation
npm run typecheck
npm run build
npm run dev

The production build contains two static entry points: the main visual editor and studio-preview.html, which is the isolated same-origin target used by the live DOM editor.

## Release policy

1. Juba's Developer Studio page is the reference implementation for feature parity and visual behavior.
2. Port only the editor/model/UI capability. Reimplement persistence, publishing, history and assistant access on this repository's isolated local store and standalone function.
3. Do not copy Juba .env files, Vercel variables, Supabase clients, migrations, user IDs, authentication callbacks or database URLs.
4. Run npm run verify:isolation, typecheck and build in GitHub Actions before merging.
5. Deploy the main branch only to developer-studio-isolated; do not point this project at the Juba repository or project.

## Desktop wrapper

The original Electron shell remains available in this repository. It is an optional desktop host for the same renderer; its local IPC API is not used by the hosted web version. The web build does not require Goose, Electron or a local project folder.
