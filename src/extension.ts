import * as vscode from 'vscode';
import { syncWorkspaceConfiguration } from './configs';
import registerCommands from './commands';
import Extension from './components/Extension';
import StatusBarItemController from './components/StatusBarItemController';
import InlineMessageController from './components/InlineMessageController';
import WebviewController from './components/webview/WebviewController';
import { runGitBlameCommand } from './services/git';
import { getJiraIssueKey } from './services/jira';
import { delay } from './utils';

export function activate(context: vscode.ExtensionContext): void {
  new Extension(context);
  registerCommands(context);
  bindEventListeners(context);
}

function bindEventListeners(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(syncWorkspaceConfiguration),
    /**
     * onDidChangeActiveTextEditor    - change of editor
     * onDidChangeTextEditorSelection - change of selection
     * onDidChangeTextDocument        - change of content
     *
     * After file A line 1 -> file B:
     * 1. file B -> file A line 1     - trigger change of editor
     * 2. file B -> file A line 2     - trigger change of editor and selection
     */
    vscode.window.onDidChangeActiveTextEditor(async () => {
      /**
       * This could be triggered before the active line gets updated. Then, the git blame command
       * will run against a wrong line number and cause inline message to render incorrectly. To
       * avoid that, wait for a short period of time before requesting the information.
       */
      await delay(50);
      onChange();
    }),
    vscode.window.onDidChangeTextEditorSelection(onChange),
    vscode.workspace.onDidChangeTextDocument(onChange)
  );
}

function onChange(): void {
  const statusBarItemController = StatusBarItemController.getInstance();
  const inlineMessageController = InlineMessageController.getInstance();
  const webviewController = WebviewController.getInstance();
  runGitBlameCommand()
    .then(async (gitBlameCommandInfo) => {
      if (!gitBlameCommandInfo) {
        throw new Error('gitBlameCommandInfo is undefined.');
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
      console.error('runGitBlameCommand error:', error.message);
      statusBarItemController.hideStatusBarItem();
      inlineMessageController.hideInlineMessage();
      webviewController.renderWebview('');
    });
}
