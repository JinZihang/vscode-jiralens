# Contribute to JiraLens

## Development Environment Setup

### Prerequisites

Ensure that you have the following tools and dependencies installed:

- Git
- VS Code 1.84.0
- VS Code Extension `amodio.tsl-problem-matcher`
- Node.js v22.16.0
- NPM 10.9.2

### Debugger Setup

1. Clone this repository and open it in VS Code.
2. Start a new terminal in the project's root directory and run `npm install` to install all dependencies.
3. Press `F5` in VS Code to start a debugging build of VS Code with JiraLens enabled. (After updating the source code, use `Ctrl/Command + R` to refresh the debugging build.)
4. Utilize `Ctrl/Command + Shift + P` to configure JiraLens settings (the Jira host, Jira authentication token, and project keys must be configured for the extension to function properly).

## Contribution Guidelines

### Engage the Community

Prior to development, kindly initiate a [GitHub issue](https://github.com/JinZihang/vscode-jiralens/issues) to share the purpose of your proposed changes and seek inputs from the community. This proactive step is integral to avoiding complications during the review process. Your cooperation is greatly appreciated.

### Create a Branch

Create a dedicated branch for every task following the conventional `<type>/<description>`. For example, `feat/configure-inline-message`, `fix/incorrect-jira-issue-key`, or `doc/update-contribution-guidelines`.

```
// Create a new branch from the current branch
git checkout -b <new-branch-name>
```

For the `<type>` field mentioned above, please follow the [conventional commit guidelines](https://www.conventionalcommits.org/en/v1.0.0/).

### Follow Development Best Practices

- Avoid pushing any credentials or sensitive information to the remote repository
- Use `npm run format` before committing you changes to maintain a consistent coding style
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
2. Update the title and description following the [conventional commit guidelines](https://www.conventionalcommits.org/en/v1.0.0/). The eventual merge commit will use them to compose the commit message.
3. Invite the community for reviews (a minimum of one approval is required to proceed with the merge).
