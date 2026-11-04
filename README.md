# Developer Studio Desktop

A standalone, local-first desktop workspace for opening, understanding, editing, testing, previewing, and rebuilding software projects. It is independent from Restocash and can work with different repositories and local folders.

> **Status:** Initial working foundation (0.1.0). The editor, local project workspace, task runner, preview panel, Git inspection/commit flow, and Goose ACP integration are implemented. Full install/build/package verification still needs to be run on a machine with network access and the required toolchain.

## What it does

- **Open local projects:** select a project folder and browse its source files. Common generated folders and dependency directories are excluded from the explorer.
- **Edit safely:** Monaco editor with syntax highlighting, explicit Save, a 2 MB text-file limit, and an automatic pre-write backup in `.developer-studio/backups/`.
- **Run and rebuild:** discover the project's `package.json` scripts and run the supported `dev`, `build`, `test`, `typecheck`, `lint`, `start`, `preview`, or `web` tasks. Process output streams into the terminal panel.
- **Preview locally:** start the project's development script and display the detected localhost URL inside the app, with an option to open it externally.
- **Use Git locally:** inspect status and diffs, then create a local commit after entering a message. The app does not push or deploy automatically.
- **AI coding agent:** connect to the locally installed [Goose](https://github.com/aaif-goose/goose) coding agent using the stable [Agent Client Protocol (ACP)](https://agentclientprotocol.com/) TypeScript SDK. The AI can inspect the opened project, stream its answers and tool activity, and request permission before sensitive actions or file writes.
- **Local model option:** configure Goose to use Ollama or LM Studio when you want inference to remain on your own machine. Goose also supports hosted model providers. The Developer Studio app itself does not store provider API keys.

## Technology

- Electron desktop shell with context isolation, sandboxed renderer, disabled Node integration, and a narrow preload IPC API.
- React + TypeScript + Vite renderer.
- Monaco Editor for source editing.
- Goose as a separate local coding-agent process, connected through ACP rather than copied or embedded as a fork.

## Requirements

- Node.js 22 or newer and npm.
- Git, for source-control actions.
- Goose installed locally for AI coding features. Install it using the [official Goose installation guide](https://goose-docs.ai/docs/getting-started/installation).
- A configured model provider in Goose. For local inference, install Ollama or LM Studio and configure it in Goose first.

The desktop application and file operations run locally. **Model inference is only local when Goose is configured with a local model/provider**; using a hosted provider sends prompts and relevant context to that provider according to its policies.

## Run from source

```bash
git clone https://github.com/mahmoudhindam9-stack/Developer-studio-.git
cd Developer-studio-
npm install
npm run dev
```

To check the renderer and create its production assets:

```bash
npm run typecheck
npm run build
```

Create desktop installers:

```bash
npm run dist:win    # Windows x64 NSIS installer
npm run dist:mac    # macOS DMG
npm run dist:linux  # Linux AppImage
```

## First use

1. Open Developer Studio and choose **Open project folder**.
2. Select any local project, such as a separately cloned copy of Restocash.
3. Select files in Explorer, edit in Monaco, and press **Ctrl+S** to save. Existing files are backed up before replacement.
4. Use **Run**, **Build**, or **Test** to run the matching script defined by that project's `package.json`.
5. Connect Goose in the right-side AI panel. If `goose` is not on PATH, choose the Goose executable from the settings control.
6. Ask the agent to inspect or modify the project. Approve or deny tool permissions and every direct agent file-write request in the UI.
7. Review the output, Git status, and diff. Commit locally only when you are satisfied.

## Safety boundaries

- Filesystem access is limited to the currently selected project root. Symbolic links that escape the project root are rejected.
- The explorer omits `.git`, `node_modules`, build outputs, caches, virtual environments, and `.developer-studio` backups.
- Binary files and text files larger than 2 MB are not opened in the editor or exposed through the ACP file handlers.
- File writes are atomic and existing text files are backed up before they are replaced.
- Agent writes require a visible approval. ACP tool permissions are surfaced for an explicit user decision; the default response is cancellation when the user denies or disconnects.
- Project tasks run from a fixed allow-list of package scripts and are started without a shell on Unix. On Windows, only a validated fixed script name is passed to `cmd.exe` to invoke `npm.cmd`.
- Git commits are local. No automatic push, release, hosting deployment, or Supabase connection is performed.
- Provider credentials are configured in Goose and are not copied into this project's settings file.

## Current limitations

This first standalone foundation is not intended to replace a full IDE yet. It currently offers a single-file editor, a basic local preview, a terminal/output view, simple Git status/diff/commit, and ACP-based agent collaboration. Multi-file visual refactoring, integrated search/replace, project-wide diagnostics, debugger, terminal command approval UI, installer signing, and automatic update delivery are planned follow-up work. Always review generated changes and run the target project's own tests before releasing it.

## AI agent choice: why Goose + ACP?

Goose is an open-source local agent available as a desktop app and CLI, supports multiple model providers (including local providers), and can be controlled by an application through ACP. ACP provides a standard client/agent interface, so this desktop app owns the project workflow and interface while Goose owns model/provider and coding-agent capabilities. The project uses the protocol SDK and spawns the user's installed Goose executable; it does not bundle Goose or its model weights.

- [Goose source and license](https://github.com/aaif-goose/goose)
- [Goose installation](https://goose-docs.ai/docs/getting-started/installation)
- [Goose ACP provider guide](https://goose-docs.ai/docs/guides/acp-providers)
- [ACP protocol](https://agentclientprotocol.com/)
- [ACP TypeScript SDK](https://github.com/agentclientprotocol/typescript-sdk)

## Development notes

- Renderer code lives in `src/`.
- Electron main/preload and local services live in `electron/`.
- Do not add provider secrets, project credentials, or customer data to this repository.
- Keep the Electron main process as the only place with filesystem/process access. Add new renderer capabilities through validated IPC methods in `preload.cjs`.
