# Contribute to JiraLens

## Development Environment Setup

### Prerequisites

Ensure that you have the following tools and dependencies installed:

- Git
- VS Code 1.84.0
- VS Code Extension `amodio.tsl-problem-matcher`
- Node.js v20.8.0
- NPM 10.1.0

### Debugger Setup

1. Clone this repository and open it in VS Code
2. Start a new terminal in the project's root directory and run `npm install` to install all dependencies
3. Press `F5` in VS Code to start a debugging build of VS Code with JiraLens enabled. After updating the source code, use `Ctrl/Command + R` to refresh the debugging build
4. Utilize `Ctrl/Command + Shift + P` to configure JiraLens settings. The Jira host, Jira authentication token, and project keys must be configured for the extension to function properly

## Contribution Guidelines

### Branches

When making changes, develop them on branches following the convention `<category>/<change-description>`. For example, `feature/configure-inline-message`, `fix/incorrect-jira-issue-key`, or `documentation/update-contribution-guidelines`.

```
// Create a new branch from the current branch
git checkout -b <new-branch-name>
```

### Categories

- `feature`: introduce new logic or features
- `fix`: fix reported issues or bugs
- `refactor`: code formatting or file architecture changes
- `performance`: performance improvements
- `documentation`: documentation updates

### Commits

- **DO NOT PUT ANY CREDENTIAL INFORMATION IN YOUR COMMIT**
- Run `npm run format` before committing
- To merge a branch, use `git rebase` instead of `git merge` for a linear history

```
// Get updates from branch A to branch B
git checkout A
git pull
git checkout B
git rebase A
```

### Pull Requests

After developing and testing your changes, create a pull request on GitHub to merge your changes back to the main branch.

## TODOs

- Handle the issue that certain configuration constraints (e.g. project key patterns) are not applied if users edit settings through the VS Code setting editor UI
- Reduce the number of JiraApi calls by sharing the retrieved issue content at different UI components' functions
- Introduce cache to store recently loaded issue information
- Handle the markdowns from JiraApi properly (e.g. links, bullet points, images)
- Allow opening the corresponding issue tab from the hover modal directly
- Implement a sidebar view that shows the Jira issue timeline of the active file
- Implement [vscode-webview-ui-toolkit](https://github.com/microsoft/vscode-webview-ui-toolkit)
- Implement tests and set up pipelines to run them for every pull request
