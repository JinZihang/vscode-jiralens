import * as vscode from 'vscode';

import registerCommands from './commands';
import Extension from './components/Extension';
import InlineMessageController from './components/InlineMessageController';
import StatusBarItemController from './components/StatusBarItemController';
import WebviewController from './components/webview/WebviewController';
import {
  getJiraBearerToken,
  getJiraEmail,
  getJiraHost,
  getMissingCoreConfigMessages,
  syncWorkspaceConfiguration
} from './configs';
import { invalidateGitBlameCache, runGitBlameCommand } from './services/git';
import { getJiraIssueKey, invalidateJiraCache } from './services/jira';
import { delay } from './utils';

export function activate(context: vscode.ExtensionContext): void {
  new Extension(context);
  registerCommands(context);
  bindEventListeners(context);
}

function bindEventListeners(context: vscode.ExtensionContext): void {
  // Debouncing was removed because any interval low enough to feel responsive
  // (< 200 ms) still fires on every key-repeat (~30 ms), while anything higher
  // makes deliberate navigation feel sluggish. Both git-blame results and Jira
  // responses are now cached, so repeated onChange calls are cheap Map lookups.
  // A debounce utility is available in utils.ts if burst-collapse protection is
  // ever wanted on top of the caches.
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(() => {
      const prevHost = getJiraHost();
      const prevToken = getJiraBearerToken();
      const prevEmail = getJiraEmail();
      syncWorkspaceConfiguration();
      if (
        getJiraHost() !== prevHost ||
        getJiraBearerToken() !== prevToken ||
        getJiraEmail() !== prevEmail
      ) {
        invalidateJiraCache();
      }
      onChange();
    }),
    // onDidChangeActiveTextEditor    - change of editor
    // onDidChangeTextEditorSelection - change of selection
    // onDidChangeTextDocument        - change of content
    //
    // After file A line 1 -> file B:
    // 1. file B -> file A line 1     - trigger change of editor
    // 2. file B -> file A line 2     - trigger change of editor and selection
    vscode.window.onDidChangeActiveTextEditor(async () => {
      // This could be triggered before the active line gets updated. Then, the git blame command
      // will run against a wrong line number and cause inline message to render incorrectly. To
      // avoid that, wait for a short period of time before requesting the information.
      await delay(50);
      onChange();
    }),
    vscode.window.onDidChangeTextEditorSelection(onChange),
    vscode.workspace.onDidChangeTextDocument((event) => {
      invalidateGitBlameCache(event.document.uri.fsPath);
      onChange();
    })
  );
}

function onChange(): void {
  const activeEditor = vscode.window.activeTextEditor;
  if (!activeEditor) {
    return;
  }

  const statusBarItemController = StatusBarItemController.getInstance();
  const inlineMessageController = InlineMessageController.getInstance();
  const webviewController = WebviewController.getInstance();

  const missingConfigs = getMissingCoreConfigMessages();
  if (missingConfigs.length > 0) {
    statusBarItemController.hideStatusBarItem();
    inlineMessageController.hideInlineMessage();
    webviewController.renderConfigurationRequiredWebview(missingConfigs);
    return;
  }

  runGitBlameCommand()
    .then(async (gitBlameCommandInfo) => {
      if (!gitBlameCommandInfo) {
        statusBarItemController.hideStatusBarItem();
        inlineMessageController.hideInlineMessage();
        webviewController.renderWebview('');
        return;
      }
      const commitMessage = gitBlameCommandInfo.gitBlameInfo.summary;
      const jiraIssueKey = getJiraIssueKey(commitMessage);
      // The no-Jira-issue-key situation is handled within rendering functions
      statusBarItemController.renderStatusBarItem(jiraIssueKey);
      inlineMessageController.renderInlineMessage(
        gitBlameCommandInfo,
        jiraIssueKey
      );
      webviewController.renderWebview(jiraIssueKey);
    })
    .catch((error) => {
      console.debug('runGitBlameCommand error:', error.message);
      statusBarItemController.hideStatusBarItem();
      inlineMessageController.hideInlineMessage();
      webviewController.renderWebview('');
    });
}
