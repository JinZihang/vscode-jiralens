import * as vscode from 'vscode';
import { STAUTS_BAR_ITEM_ACTIVE, registerCommands } from './commands';
import { runGitBlameCommand } from './git';
import {
  getHoverModalMarkdown,
  getJiraIssueKey,
  getJiraIssueLink,
  JiraViewProvider,
  getJiraIssueContent
} from './jira';
import {
  getInlineMessage,
  getLoadingWebviewContent,
  getWebviewContent
} from './utils';
import { GitBlameCommandInfo } from './types';

let globalContext: vscode.ExtensionContext;
let statusBarItem: vscode.StatusBarItem;
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
  globalContext = context;
  registerCommands(globalContext);
  registerStatusBarItemActiveCommand();
  initStatusBarItem();
  initWebview();
  bindEventListeners();
}

// Staus bar item functions
function registerStatusBarItemActiveCommand(): vscode.Disposable {
  return vscode.commands.registerCommand(STAUTS_BAR_ITEM_ACTIVE, async () => {
    if (!statusBarItem.text) {
      // This situation might happen when users manually trigger this command
      vscode.window.showErrorMessage(
        'No Jira issue found for the active line.'
      );
      return;
    }
    const jiraIssueKey = statusBarItem.text;
    const jiraIssueLink = getJiraIssueLink(jiraIssueKey);
    const selection = await vscode.window.showInformationMessage(
      `Open ${jiraIssueKey} in:`,
      'Tab',
      'Browser'
    );
    if (selection === 'Tab') {
      const panel = vscode.window.createWebviewPanel(
        'jira-issue',
        jiraIssueKey,
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          localResourceRoots: [
            vscode.Uri.joinPath(globalContext.extensionUri, 'media')
          ]
        }
      );
      panel.webview.html = getLoadingWebviewContent();
      const jiraIssueContent = await getJiraIssueContent(statusBarItem.text);
      let webviewContent: string;
      if (!jiraIssueContent) {
        webviewContent = getLoadingWebviewContent();
      } else {
        webviewContent = getWebviewContent(
          jiraIssueLink,
          jiraIssueContent,
          globalContext.extensionUri,
          panel.webview
        );
      }
      panel.webview.html = webviewContent;
    } else if (selection === 'Browser') {
      vscode.env.openExternal(vscode.Uri.parse(jiraIssueLink));
    }
  });
}
function initStatusBarItem(): void {
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBarItem.command = STAUTS_BAR_ITEM_ACTIVE;
  globalContext.subscriptions.push(statusBarItem);
}
function renderStatusBarItem(jiraIssueKey: string): void {
  if (!jiraIssueKey) {
    hideStatusBarItem();
  }
  statusBarItem.text = jiraIssueKey;
  statusBarItem.show();
}
function hideStatusBarItem(): void {
  statusBarItem.text = '';
  statusBarItem.hide();
}

// Inline message functions
async function renderInlineMessage(
  gitBlameCommandInfo: GitBlameCommandInfo,
  jiraIssueKey: string
): Promise<void> {
  const { gitBlameInfo, editor, line } = gitBlameCommandInfo;
  const message = getInlineMessage(gitBlameInfo);
  // Ensure the line has not changed since running the git command
  let activeEditor = vscode.window.activeTextEditor;
  if (
    !message ||
    !activeEditor ||
    activeEditor !== editor ||
    activeEditor.selection.active.line !== line.lineNumber
  ) {
    hideInlineMessage();
    return;
  }
  inlineMessageEditor = activeEditor;
  let activeLine = activeEditor.document.lineAt(
    activeEditor.selection.active.line
  );
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
      activeEditor.selection.active.line !== line.lineNumber
    ) {
      return;
    }
    activeLine = activeEditor.document.lineAt(
      activeEditor.selection.active.line
    );
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
  runGitBlameCommand()
    .then(async (gitBlameCommandInfo) => {
      if (gitBlameCommandInfo) {
        const commitMessage = gitBlameCommandInfo.gitBlameInfo.summary;
        const jiraIssueKey = getJiraIssueKey(commitMessage);
        renderStatusBarItem(jiraIssueKey);
        renderInlineMessage(gitBlameCommandInfo, jiraIssueKey);
        renderWebview(jiraIssueKey);
        return;
      }
      hideStatusBarItem();
      hideInlineMessage();
      renderWebview('');
    })
    .catch((error) => {
      console.error('runGitBlameCommand error: ', error.message);
      hideStatusBarItem();
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
