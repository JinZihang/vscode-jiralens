import * as vscode from 'vscode';
import { registerCommands } from './commands';
import Extension from './components/Extension';
import StatusBarItem from './components/StatusBarItem';
import InlineMessage from './components/InlineMessage';
import Webview from './components/Webview';
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
  const statusBarItem = StatusBarItem.getInstance();
  const inlineMessage = InlineMessage.getInstance();
  const webview = Webview.getInstance();
  runGitBlameCommand()
    .then(async (gitBlameCommandInfo) => {
      if (gitBlameCommandInfo) {
        const commitMessage = gitBlameCommandInfo.gitBlameInfo.summary;
        const jiraIssueKey = getJiraIssueKey(commitMessage);
        statusBarItem.renderStatusBarItem(jiraIssueKey);
        inlineMessage.renderInlineMessage(gitBlameCommandInfo, jiraIssueKey);
        webview.renderWebview(jiraIssueKey);
      } else {
        statusBarItem.hideStatusBarItem();
        inlineMessage.hideInlineMessage();
        webview.renderWebview('');
      }
    })
    .catch((error) => {
      console.error('runGitBlameCommand error: ', error.message);
      statusBarItem.hideStatusBarItem();
      inlineMessage.hideInlineMessage();
      webview.renderWebview('');
    });
}
