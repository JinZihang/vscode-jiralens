import * as vscode from 'vscode';
import registerCommands from './commands';
import Extension from './components/Extension';
import StatusBarItemController from './components/StatusBarItemController';
import InlineMessageController from './components/InlineMessageController';
import WebviewController from './components/webview/WebviewController';
import { runGitBlameCommand } from './services/git';
import { getJiraIssueKey } from './services/jira';

export function activate(context: vscode.ExtensionContext): void {
  new Extension(context);
  registerCommands(context);
  bindEventListeners(context);
}

function bindEventListeners(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(onChange),
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
      if (gitBlameCommandInfo) {
        const commitMessage = gitBlameCommandInfo.gitBlameInfo.summary;
        const jiraIssueKey = getJiraIssueKey(commitMessage);
        statusBarItemController.renderStatusBarItem(jiraIssueKey);
        inlineMessageController.renderInlineMessage(
          gitBlameCommandInfo,
          jiraIssueKey
        );
        webviewController.renderWebview(jiraIssueKey);
      } else {
        statusBarItemController.hideStatusBarItem();
        inlineMessageController.hideInlineMessage();
        webviewController.renderWebview('');
      }
    })
    .catch((error) => {
      console.error('runGitBlameCommand error: ', error.message);
      statusBarItemController.hideStatusBarItem();
      inlineMessageController.hideInlineMessage();
      webviewController.renderWebview('');
    });
}
