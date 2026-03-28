# JiraLens – VS Code Extension

JiraLens bridges the gap between your code and Jira. It runs `git blame` on the active editor line, extracts a Jira issue key from the commit message, and surfaces that issue's details via:

- An **inline decoration** (committer, relative time, issue key, commit message)
- A **status bar item**
- A **webview panel** in the activity bar showing the full Jira issue

## Build & Development

```bash
npm run compile      # single webpack build (dev)
npm run watch        # webpack watch mode
npm run package      # production build (hidden source map)
npm run lint         # eslint src/**/*.ts
npm run format       # prettier --write
npm run format:check # prettier --check (CI)
npm run test         # placeholder – no real tests yet
```

The compiled output is `dist/extension.js` (defined by `main` in `package.json`).

To launch the extension in a VS Code Extension Development Host, press **F5** (uses `.vscode/launch.json`).

## Project Structure

```
src/
  extension.ts                       # Entry point: activate(), event listener wiring
  commands.ts                        # All VS Code command registrations
  configs.ts                         # Read/write workspace configuration (jiralens.*)
  utils.ts                           # Shared utilities (isValidUrl, delay, …)
  components/
    Extension.ts                     # Singleton wrapper around ExtensionContext
    StatusBarItemController.ts       # Status bar item lifecycle
    InlineMessageController.ts       # Editor inline decoration lifecycle
    webview/
      WebviewController.ts           # Singleton managing the webview view
      WebviewViewProvider.ts         # WebviewViewProvider implementation
  services/
    git.ts                           # Spawns `git blame --porcelain` and parses output
    git.types.ts                     # GitBlameInfo, GitBlameCommandInfo interfaces
    jira.ts                          # Jira REST API calls + markdown conversion helpers
    jira.types.ts                    # Jira-related type definitions
```

## Architecture Patterns

- **Singleton controllers**: `Extension`, `StatusBarItemController`, `InlineMessageController`, and `WebviewController` all expose a `getInstance()` static method. `Extension` must be constructed first in `activate()` before other controllers can call `Extension.getInstance()`.
- **Event-driven updates**: Three VS Code events (`onDidChangeActiveTextEditor`, `onDidChangeTextEditorSelection`, `onDidChangeTextDocument`) funnel into a single `onChange()` function in `extension.ts`. A 50 ms delay is applied on editor change to avoid a race with the active line number update.
- **Config layer**: All reads/writes to `vscode.workspace.getConfiguration('jiralens')` go through `src/configs.ts`. Call `syncWorkspaceConfiguration()` after any write to refresh the module-level cache.
- **Jira markdown pipeline**: Jira wiki markup → ProseMirror node (via `@atlaskit/editor-wikimarkup-transformer`) → HTML (via `prosemirror-model` DOMSerializer + jsdom) → normal markdown (via turndown).

## Configuration Keys (`jiralens.*`)

| Key                        | Type     | Default             | Description                               |
| -------------------------- | -------- | ------------------- | ----------------------------------------- |
| `jiraHost`                 | string   | `jira.jiralens.com` | Jira instance host                        |
| `jiraBearerToken`          | string   | `""`                | Personal access token                     |
| `jiraProjectKeys`          | string[] | `[]`                | Project key list for issue key extraction |
| `inlineCommitter`          | boolean  | `true`              | Show committer in inline message          |
| `inlineRelativeCommitTime` | boolean  | `true`              | Show relative commit time                 |
| `inlineJiraIssueKey`       | boolean  | `true`              | Show Jira issue key                       |
| `inlineCommitMessage`      | boolean  | `false`             | Show commit message                       |

## Code Style

- **Formatter**: Prettier — 2 spaces, single quotes, semicolons, no trailing commas, LF endings.
- **Linter**: ESLint with `@typescript-eslint`. Import names must be camelCase or PascalCase.
- **TypeScript**: `~5.3.0`, `ecmaVersion: 6`, `sourceType: module`.
- Run `npm run format` before committing, or rely on the pre-commit hook (lint-staged runs eslint --fix + prettier automatically).

## Git Workflow

- **Commit messages**: Conventional Commits enforced by commitlint (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`, etc.).
- **Hooks** (husky):
  - `pre-commit`: lint-staged (eslint fix + prettier on staged `.ts` files)
  - `commit-msg`: commitlint
  - `pre-push`: `npm run test` (currently a placeholder, always passes)
- **Releases**: semantic-release on `main` — bumps `package.json`, generates `CHANGELOG.md`, creates a GitHub release.
- **PRs**: Use the template in `.github/pull_request_template.md` (description, previous/current behavior, checklist).

## Key Dependencies

| Package                                   | Purpose                               |
| ----------------------------------------- | ------------------------------------- |
| `jira-client`                             | Jira REST API v2                      |
| `@atlaskit/adf-schema`                    | Jira ADF/wiki schema                  |
| `@atlaskit/editor-wikimarkup-transformer` | Parse Jira wiki markup to ProseMirror |
| `prosemirror-model`                       | Serialize ProseMirror nodes to HTML   |
| `jsdom`                                   | Headless DOM for HTML serialization   |
| `turndown`                                | HTML → Markdown                       |
