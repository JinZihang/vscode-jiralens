import * as vscode from 'vscode';
import {
  addJiraProjectKey,
  deleteJiraProjectKey,
  getJiraBearerToken,
  getJiraHost,
  setJiraBearerToken,
  setJiraHost,
  setShowInlineCommitMessage,
  setShowInlineCommitter,
  setShowInlineRelativeCommitTime
} from './configs';
import { isValidJiraBearerToken } from './services/jira';
import { isValidUrl, isValidJiraProjectKey } from './utils';

// The command IDs here must match the command field in package.json
// Commands to modify extension configurations
const SET_JIRA_HOST = 'jiralens.setJiraHost';
const SET_JIRA_BEARER_TOKEN = 'jiralens.setJiraBearerToken';
const ADD_JIRA_PROJECT_KEY = 'jiralens.addJiraProjectKey';
const DELETE_JIRA_PROJECT_KEY = 'jiralens.deleteJiraProjectKey';
const SET_SHOW_INLINE_COMMITTER = 'jiralens.setShowInlineCommitter';
const SET_SHOW_RELATIVE_COMMIT_TIME = 'jiralens.setShowRelativeCommitTime';
const SET_SHOW_JIRA_ISSUE_KEY = 'jiralens.setShowJiraIssueKey';
const SET_SHOW_COMMIT_MESSAGE = 'jiralens.setShowCommitMessage';
// UI commands
export const STAUTS_BAR_ITEM_ACTIVE = 'jiralens.statusBarItemActive';

function registerSetJiraHostCommand(): vscode.Disposable {
  return vscode.commands.registerCommand(SET_JIRA_HOST, async () => {
    const hostInput = await vscode.window.showInputBox({
      prompt: 'Enter the Jira host:',
      placeHolder: '',
      value: getJiraHost()
    });
    if (!hostInput) {
      return;
    }
    if (!isValidUrl(`https://${hostInput}`)) {
      vscode.window.showErrorMessage('Invalid host input.');
      return;
    }
    await setJiraHost(hostInput);
    vscode.window.showInformationMessage(
      `Updated the Jira host to: ${getJiraHost()}`
    );
  });
}

function registerSetJiraBearerTokenCommand(): vscode.Disposable {
  return vscode.commands.registerCommand(SET_JIRA_BEARER_TOKEN, async () => {
    if (!getJiraHost()) {
      vscode.window.showErrorMessage('Please set the Jira host first.');
      return;
    }
    const tokenInput = await vscode.window.showInputBox({
      prompt:
        'Enter the bearer token (personal access token) for Jira authentication:',
      placeHolder: '',
      value: getJiraBearerToken()
    });
    if (!tokenInput) {
      return;
    }
    if (!isValidJiraBearerToken(tokenInput)) {
      vscode.window.showErrorMessage('Invalid token input.');
      return;
    }
    await setJiraBearerToken(tokenInput);
    vscode.window.showInformationMessage(
      'Successfully updated the bearer token.'
    );
  });
}

function registerAddJiraProjectKeyCommand(): vscode.Disposable {
  return vscode.commands.registerCommand(ADD_JIRA_PROJECT_KEY, async () => {
    const keyInput = await vscode.window.showInputBox({
      prompt: 'Enter the project key to add:',
      placeHolder: ''
    });
    if (!keyInput) {
      return;
    }
    const key = keyInput.toUpperCase();
    if (!isValidJiraProjectKey(key)) {
      vscode.window.showErrorMessage('Invalid project key input.');
      return;
    }
    addJiraProjectKey(key);
  });
}

function registerDeleteJiraProjectKeyCommand(): vscode.Disposable {
  return vscode.commands.registerCommand(DELETE_JIRA_PROJECT_KEY, async () => {
    const keyInput = await vscode.window.showInputBox({
      prompt: 'Enter the project key to delete:',
      placeHolder: ''
    });
    if (!keyInput) {
      return;
    }
    const key = keyInput.toUpperCase();
    if (!isValidJiraProjectKey(key)) {
      vscode.window.showErrorMessage('Invalid project key input.');
      return;
    }
    deleteJiraProjectKey(key);
  });
}

function registerSetInlineCommitterCommand(): vscode.Disposable {
  return vscode.commands.registerCommand(
    SET_SHOW_INLINE_COMMITTER,
    async () => {
      const show = await vscode.window.showQuickPick(['Yes', 'No'], {
        placeHolder: 'Show committer in the inline message?'
      });
      if (!show) {
        return;
      }
      setShowInlineCommitter(show === 'Yes');
    }
  );
}

function registerSetInlineRelativeCommitTimeCommand(): vscode.Disposable {
  return vscode.commands.registerCommand(
    SET_SHOW_RELATIVE_COMMIT_TIME,
    async () => {
      const show = await vscode.window.showQuickPick(['Yes', 'No'], {
        placeHolder: 'Show relative commit time in the inline message?'
      });
      if (!show) {
        return;
      }
      setShowInlineRelativeCommitTime(show === 'Yes');
    }
  );
}

function registerSetShowJiraIssueKeyCommand(): vscode.Disposable {
  return vscode.commands.registerCommand(SET_SHOW_JIRA_ISSUE_KEY, async () => {
    const show = await vscode.window.showQuickPick(['Yes', 'No'], {
      placeHolder: 'Show Jira issue key in the inline message?'
    });
    if (!show) {
      return;
    }
    setShowInlineCommitMessage(show === 'Yes');
  });
}

function registerSetShowCommitMessageCommand(): vscode.Disposable {
  return vscode.commands.registerCommand(SET_SHOW_COMMIT_MESSAGE, async () => {
    const show = await vscode.window.showQuickPick(['Yes', 'No'], {
      placeHolder: 'Show commit message in the inline message?'
    });
    if (!show) {
      return;
    }
    setShowInlineCommitMessage(show === 'Yes');
  });
}

export function registerCommands(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    registerSetJiraHostCommand(),
    registerSetJiraBearerTokenCommand(),
    registerAddJiraProjectKeyCommand(),
    registerDeleteJiraProjectKeyCommand(),
    registerSetInlineCommitterCommand(),
    registerSetInlineRelativeCommitTimeCommand(),
    registerSetShowJiraIssueKeyCommand(),
    registerSetShowCommitMessageCommand()
  );
}
