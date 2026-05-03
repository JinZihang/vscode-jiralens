# JiraLens – VS Code Extension

JiraLens bridges the gap between your code and Jira. It runs `git blame` on the active editor line, extracts a Jira issue key from the commit message, and surfaces that issue's details via:

- An **inline decoration** (committer, relative time, issue key, commit message)
- A **status bar item**
- A **webview panel** in the activity bar showing the full Jira issue

## Build & Development

```bash
npm run compile           # single webpack build (dev)
npm run watch             # webpack watch mode
npm run package           # production build (hidden source map)
npm run lint              # eslint src/**/*.ts
npm run format            # prettier --write
npm run format:check      # prettier --check (CI)
npm run test              # lint + unit tests (used by pre-push hook)
npm run test:unit         # vitest run (one-shot)
npm run test:unit:watch   # vitest watch (dev loop)
npm run test:integration  # placeholder – see test/integration/README.md
```

The compiled output is `dist/extension.js` (defined by `main` in `package.json`).

To launch the extension in a VS Code Extension Development Host, press **F5** (uses `.vscode/launch.json`).

## Project Structure

```
src/
  extension.ts                       # Entry point: activate(), event listener wiring
  commands.ts                        # All VS Code command registrations
  configs.ts                         # Read/write workspace configuration (jiralens.*)
  utils.ts                           # Shared utilities (isValidUrl, delay, getRelativeTimePassed, truncateMessage, …)
  components/
    Extension.ts                     # Singleton wrapper around ExtensionContext
    StatusBarItemController.ts       # Status bar item lifecycle
    InlineMessageController.ts       # Editor inline decoration lifecycle
    inlineHoverMarkdown.ts           # Builds the hover MarkdownString from Jira issue fields
    webview/
      WebviewController.ts           # Singleton managing the webview view (sidebar + tab)
      WebviewViewProvider.ts         # WebviewViewProvider lifecycle / state management
      jiraIssueHtml.ts               # Pure HTML builders for the Jira issue webview
  services/
    git.ts                           # Spawns `git blame --porcelain` and parses output
    git.types.ts                     # GitBlameInfo, GitBlameCommandInfo interfaces
    jira.ts                          # Jira REST API v2 fetch, URL helpers, issue key extraction
    jiraMarkdown.ts                  # Jira wiki markup → HTML → normal markdown pipeline
    jira.types.ts                    # Jira-related type definitions
test/
  __mocks__/
    vscode.ts                        # Minimal vscode API mock (used by vitest alias)
  unit/                              # Vitest unit tests (no VS Code host required)
    utils.test.ts
    commands.test.ts
    configs.test.ts
    components/
      webview.test.ts
    services/
      git.test.ts
      jira.test.ts
  integration/                       # Future: @vscode/test-cli + @vscode/test-electron
    README.md                        # Setup instructions and planned structure
  data/                              # Shared mock JSON fixtures
```

## Architecture Patterns

- **Singleton controllers**: `Extension`, `StatusBarItemController`, `InlineMessageController`, and `WebviewController` all expose a `getInstance()` static method. `Extension` must be constructed first in `activate()` before other controllers can call `Extension.getInstance()`.
- **Event-driven updates**: Four VS Code events funnel into `onChange()` in `extension.ts`: `onDidChangeActiveTextEditor` (with a 50 ms delay to avoid a race with the active line number update), `onDidChangeTextEditorSelection`, `onDidChangeTextDocument`, and `onDidChangeConfiguration` (which also calls `syncWorkspaceConfiguration()` first).
- **Config layer**: All reads/writes to `vscode.workspace.getConfiguration('jiralens')` go through `src/configs.ts`. Call `syncWorkspaceConfiguration()` after any write to refresh the module-level cache.
- **Jira API call**: `fetchJiraIssue()` in `src/services/jira.ts` makes a single `GET /rest/api/2/issue/{key}` call using the Node.js global `fetch`. Auth is `Authorization: Basic base64(email:token)` for Jira Cloud and `Authorization: Bearer {token}` for Jira Server/DC. No external HTTP library is used.
- **Jira markdown pipeline**: Lives in `src/services/jiraMarkdown.ts`. Jira wiki markup → ProseMirror node (via `@atlaskit/editor-wikimarkup-transformer`) → HTML (via `prosemirror-model` DOMSerializer + jsdom) → normal markdown (via turndown). Re-exported from `jira.ts` for convenience.

## Configuration Keys (`jiralens.*`)

| Key                        | Type     | Default             | Description                                                 |
| -------------------------- | -------- | ------------------- | ----------------------------------------------------------- |
| `jiraHost`                 | string   | `jira.jiralens.com` | Jira instance host                                          |
| `jiraEmail`                | string   | `""`                | Email for Jira Cloud basic auth (leave empty for Server/DC) |
| `jiraBearerToken`          | string   | `""`                | PAT for Jira Server/DC, or API token for Jira Cloud         |
| `jiraProjectKeys`          | string[] | `[]`                | Project key list for issue key extraction                   |
| `inlineCommitter`          | boolean  | `true`              | Show committer in inline message                            |
| `inlineRelativeCommitTime` | boolean  | `true`              | Show relative commit time                                   |
| `inlineJiraIssueKey`       | boolean  | `true`              | Show Jira issue key                                         |
| `inlineCommitMessage`      | boolean  | `false`             | Show commit message                                         |

## Working Practices

When making any code change, always:

1. **Check and update tests** — find the corresponding test file(s) in `test/unit/` and add, update, or remove tests to match the new behavior. Never leave tests that assert stale behavior.
2. **Check and update documentation** — if the change affects configuration keys, architecture patterns, project structure, or public-facing behavior, update the relevant section(s) in this file (`CLAUDE.md`) to reflect the new state.
3. **Update `package.json` contributions** — if a new `jiralens.*` configuration key is added or removed, keep the `contributes.configuration` block in `package.json` in sync with the table above.

These checks are mandatory, not optional. Do not mark a task complete without verifying all three.

4. **Never push, publish, or release** — do not run `git push`, `npm publish`, `vsce publish`, `semantic-release`, or any command that delivers changes to a remote or registry. Local commits are fine; remote delivery requires explicit user instruction.

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
  - `pre-push`: `npm run test:unit`
- **Releases**: semantic-release on `main` — bumps `package.json`, generates `CHANGELOG.md`, creates a GitHub release.
- **PRs**: Use the template in `.github/pull_request_template.md` (description, previous/current behavior, checklist).

## Key Dependencies

| Package                                   | Purpose                               |
| ----------------------------------------- | ------------------------------------- |
| `@atlaskit/adf-schema`                    | Jira ADF/wiki schema                  |
| `@atlaskit/editor-wikimarkup-transformer` | Parse Jira wiki markup to ProseMirror |
| `prosemirror-model`                       | Serialize ProseMirror nodes to HTML   |
| `jsdom`                                   | Headless DOM for HTML serialization   |
| `turndown`                                | HTML → Markdown                       |
| `vitest`                                  | Unit test runner                      |
