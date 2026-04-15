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
- [ ] Run `vsce login jinzihang` and paste the token when prompted

### Publish

- [ ] Double-check you are on `main` and the working tree is clean
- [ ] Run `vsce publish` to publish the extension
- [ ] Verify the new version appears on [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=jinzihang.jiralens)

## 5. Publish to Open VSX Registry

- [ ] Generate a token at <https://open-vsx.org/user-settings/tokens>
- [ ] Run `npx ovsx publish -p <token>` to publish the extension
- [ ] Verify the new version appears on [Open VSX Registry](https://open-vsx.org/extension/jinzihang/jiralens)

## 6. Post-release

- [ ] Go to [GitHub Releases](https://github.com/JinZihang/vscode-jiralens/releases/new), create a new release, set the tag (`vx.y.z`) to target the merged release commit on `main`, click **Generate release notes**, and ensure **Set as the latest release** is checked
