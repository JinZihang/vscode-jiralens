# Release Checklist

## 1. Prepare the release branch

- [ ] Create a release branch from `main`: `git checkout -b release/x.y.z`
- [ ] Bump the version in `package.json` (`"version": "x.y.z"`)
- [ ] Run `npm i` to update `package-lock.json`
- [ ] Commit: `chore: release version x.y.z`

## 2. Verify the build

- [ ] Run `npm run lint` — no errors
- [ ] Run `npm run test:unit` — all tests pass
- [ ] Run `npm run package` — `dist/extension.js` builds without errors
- [ ] Press **F5** in VS Code to launch the Extension Development Host and do a quick smoke test

## 3. Merge to main

- [ ] Open a PR from `release/x.y.z` → `main` using the PR template (`.github/pull_request_template.md`)
- [ ] Update the PR title to `chore: release version x.y.z`
- [ ] Get the PR reviewed and merged

## 4. Publish to VS Code Marketplace

### Refresh the Azure DevOps token (if expired)

- [ ] Go to <https://dev.azure.com/jiralens/_usersSettings/tokens>
- [ ] Create a new token with these settings:
  - **Name**: Marketplace access token
  - **Organization**: All accessible organizations
  - **Scopes**: Custom defined → **Marketplace**: Manage
- [ ] Copy the token

### Publish

- [ ] Run `vsce login jinzihang` and paste the token when prompted
- [ ] Double-check you are on `main` and the working tree is clean
- [ ] Run `vsce publish` to publish the extension

## 5. Post-release

- [ ] Verify the new version appears on the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=jinzihang.jiralens)
- [ ] Go to [GitHub Releases](https://github.com/JinZihang/vscode-jiralens/releases/new), create a new release, and set the tag (`vx.y.z`) to target the merged release commit on `main`
