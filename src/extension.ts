import * as vscode from 'vscode';
import { registerCommands } from './commands';
import Extension from './components/Extension';
import StatusBarItem from './components/StatusBarItem';
import InlineMessage from './components/InlineMessage';
import { runGitBlameCommand } from './git';
import {
  getJiraIssueKey,
  getJiraIssueLink,
  JiraViewProvider,
  getJiraIssueContent
} from './jira';

let globalContext: vscode.ExtensionContext;
let webviewProvider: JiraViewProvider;

export function activate(context: vscode.ExtensionContext): void {
  let extension = new Extension(context);
  globalContext = extension.getContext();
  registerCommands(globalContext);
  initWebview();
  bindEventListeners();
}

// Webview functions
function initWebview(): void {
  webviewProvider = new JiraViewProvider(globalContext.extensionUri);
  globalContext.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      JiraViewProvider.viewType,
      webviewProvider
    )
  );
}
async function renderWebview(jiraIssueKey: string): Promise<void> {
  if (!jiraIssueKey) {
    webviewProvider.setNoJiraIssueView();
    return;
  }
  if (webviewProvider.getCurrentIssueKey() === jiraIssueKey) {
    return;
  }
  webviewProvider.setLoadingView();
  const jiraIssueLink = getJiraIssueLink(jiraIssueKey);
  const jiraIssueContent = await getJiraIssueContent(jiraIssueKey);
  webviewProvider.setJiraIssueView(
    jiraIssueKey,
    jiraIssueLink,
    jiraIssueContent
  );
}

function onChange(): void {
  const statusBarItem = StatusBarItem.getInstance();
  const inlineMessage = InlineMessage.getInstance();
  runGitBlameCommand()
    .then(async (gitBlameCommandInfo) => {
      if (gitBlameCommandInfo) {
        const commitMessage = gitBlameCommandInfo.gitBlameInfo.summary;
        const jiraIssueKey = getJiraIssueKey(commitMessage);
        statusBarItem.renderStatusBarItem(jiraIssueKey);
        inlineMessage.renderInlineMessage(gitBlameCommandInfo, jiraIssueKey);
        renderWebview(jiraIssueKey);
      } else {
        statusBarItem.hideStatusBarItem();
        inlineMessage.hideInlineMessage();
        renderWebview('');
      }
    })
    .catch((error) => {
      console.error('runGitBlameCommand error: ', error.message);
      statusBarItem.hideStatusBarItem();
      inlineMessage.hideInlineMessage();
      renderWebview('');
    });
}
function bindEventListeners(): void {
  globalContext.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(onChange),
    vscode.window.onDidChangeTextEditorSelection(onChange),
    vscode.workspace.onDidChangeTextDocument(onChange)
  );
}
