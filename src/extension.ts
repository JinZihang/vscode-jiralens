import * as vscode from 'vscode';
import { registerCommands } from './commands';
import Extension from './components/Extension';
import StatusBarItem from './components/StatusBarItem';
import { runGitBlameCommand } from './git';
import {
  getHoverModalMarkdown,
  getJiraIssueKey,
  getJiraIssueLink,
  JiraViewProvider,
  getJiraIssueContent
} from './jira';
import { getInlineMessage } from './utils';
import { GitBlameCommandInfo } from './types';

let globalContext: vscode.ExtensionContext;
let webviewProvider: JiraViewProvider;

let inlineMessageEditor: vscode.TextEditor;
const inlineMessageDecorationType =
  vscode.window.createTextEditorDecorationType({
    after: {
      textDecoration: 'none; opacity: 0.25;',
      margin: '0 0 0 6em'
    }
  });

export function activate(context: vscode.ExtensionContext): void {
  let extension = new Extension(context);
  globalContext = extension.getContext();
  registerCommands(globalContext);
  initWebview();
  bindEventListeners();
}

// Inline message functions
async function renderInlineMessage(
  gitBlameCommandInfo: GitBlameCommandInfo,
  jiraIssueKey: string
): Promise<void> {
  const { gitBlameInfo, editor, lineNumber } = gitBlameCommandInfo;
  const message = getInlineMessage(gitBlameInfo);
  // Ensure the line has not changed since running the git command
  let activeEditor = vscode.window.activeTextEditor;
  if (
    !message ||
    !activeEditor ||
    activeEditor !== editor ||
    activeEditor.selection.active.line !== lineNumber
  ) {
    hideInlineMessage();
    return;
  }
  inlineMessageEditor = activeEditor;
  let activeLine = activeEditor.document.lineAt(lineNumber);
  // Render using the latest information since the length of the line could have changed
  let range = new vscode.Range(
    activeLine.lineNumber,
    activeLine.text.length,
    activeLine.lineNumber,
    activeLine.text.length + message.length
  );
  const renderOptions = { after: { contentText: message } };
  let hoverMessage: string | vscode.MarkdownString | undefined;
  if (jiraIssueKey) {
    hoverMessage = 'Loading Jira information...';
  }
  const decorations = [{ range, renderOptions, hoverMessage }];
  inlineMessageEditor.setDecorations(inlineMessageDecorationType, decorations);
  if (jiraIssueKey) {
    const jiraIssueContent = await getJiraIssueContent(jiraIssueKey);
    if (jiraIssueContent) {
      hoverMessage = getHoverModalMarkdown(
        jiraIssueKey,
        jiraIssueContent.fields
      );
    }
    // Ensure the line has not changed since running the git command
    activeEditor = vscode.window.activeTextEditor;
    if (
      !activeEditor ||
      activeEditor !== editor ||
      activeEditor.selection.active.line !== lineNumber
    ) {
      return;
    }
    activeLine = activeEditor.document.lineAt(lineNumber);
    range = new vscode.Range(
      activeLine.lineNumber,
      activeLine.text.length,
      activeLine.lineNumber,
      activeLine.text.length + message.length
    );
    const newDecorations = [{ range, renderOptions, hoverMessage }];
    inlineMessageEditor.setDecorations(
      inlineMessageDecorationType,
      newDecorations
    );
  }
}
function hideInlineMessage(): void {
  if (inlineMessageEditor) {
    inlineMessageEditor.setDecorations(inlineMessageDecorationType, []);
  }
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
  runGitBlameCommand()
    .then(async (gitBlameCommandInfo) => {
      if (gitBlameCommandInfo) {
        const commitMessage = gitBlameCommandInfo.gitBlameInfo.summary;
        const jiraIssueKey = getJiraIssueKey(commitMessage);
        statusBarItem.renderStatusBarItem(jiraIssueKey);
        renderInlineMessage(gitBlameCommandInfo, jiraIssueKey);
        renderWebview(jiraIssueKey);
      } else {
        statusBarItem.hideStatusBarItem();
        hideInlineMessage();
        renderWebview('');
      }
    })
    .catch((error) => {
      console.error('runGitBlameCommand error: ', error.message);
      statusBarItem.hideStatusBarItem();
      hideInlineMessage();
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
