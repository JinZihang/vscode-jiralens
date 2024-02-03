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

1. Clone this repository and open it in VS Code.
2. Start a new terminal in the project's root directory and run `npm install` to install all dependencies.
3. Press `F5` in VS Code to start a debugging build of VS Code with JiraLens enabled. (After updating the source code, use `Ctrl/Command + R` to refresh the debugging build.)
4. Utilize `Ctrl/Command + Shift + P` to configure JiraLens settings (the Jira host, Jira authentication token, and project keys must be configured for the extension to function properly).

## Contribution Guidelines

### Engage the Community

Prior to development, kindly initiate a [GitHub issue](https://github.com/JinZihang/vscode-jiralens/issues) to share the purpose of your proposed changes and seek inputs from the community. This proactive step is integral to avoiding complications during the review process. Your cooperation is greatly appreciated.

### Create a Branch

Create a dedicated branch for every task following the convention `<category>/<description>`. For example, `feature/configure-inline-message`, `fix/incorrect-jira-issue-key`, or `documentation/update-contribution-guidelines`.

```
// Create a new branch from the current branch
git checkout -b <new-branch-name>
```

#### Categories

These categories aim to assit the community in quickly grasping the intent of your branch. Feel free to use alternative category names that align with your changes.

- `feat`: introduce new logic or features
- `fix`: address reported issues or bugs
- `ref`: code formatting or file architecture changes
- `perf`: performance improvements
- `doc`: documentation updates

### Follow Development Best Practices

- Avoid pushing any credentials or sensitive information to the remote repository
- Use `npm run format` before commiting you changes to maintain a consistent coding style
- To obtain updates from another branch, use `git rebase` instead of `git merge` for a linear history

```
// Get updates from branch A to branch B
git checkout A
git pull
git checkout B
git rebase A
```

### Submit a GitHub Pull Request

The `main` branch is protected from direct commits. To merge your updates:

1. Raise a [GitHub pull request](https://github.com/JinZihang/vscode-jiralens/pulls) from your branch targeting `main`.
2. Provide a clear title and description to explain your changes.
3. Invite the community for reviews (a minimum of one approval is required to proceed with the merge).
