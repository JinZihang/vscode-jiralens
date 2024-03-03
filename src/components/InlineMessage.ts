import * as vscode from 'vscode';
import { getHoverModalMarkdown, getJiraIssueContent } from '../jira';
import { getInlineMessage } from '../utils';
import { GitBlameCommandInfo } from '../types';

export default class InlineMessage {
  private static _instance: InlineMessage;
  private _inlineMessageEditor: vscode.TextEditor | undefined;
  private _inlineMessageDecorationType =
    vscode.window.createTextEditorDecorationType({
      after: {
        textDecoration: 'none; opacity: 0.25;',
        margin: '0 0 0 6em'
      }
    });

  constructor() {
    InlineMessage._instance = this;
  }

  static getInstance(): InlineMessage {
    if (!InlineMessage._instance) {
      InlineMessage._instance = new InlineMessage();
    }
    return InlineMessage._instance;
  }

  async renderInlineMessage(
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
      this.hideInlineMessage();
      return;
    }
    this._inlineMessageEditor = activeEditor;
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
    this._inlineMessageEditor.setDecorations(
      this._inlineMessageDecorationType,
      decorations
    );
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
      this._inlineMessageEditor.setDecorations(
        this._inlineMessageDecorationType,
        newDecorations
      );
    }
  }

  hideInlineMessage(): void {
    if (this._inlineMessageEditor) {
      this._inlineMessageEditor.setDecorations(
        this._inlineMessageDecorationType,
        []
      );
    }
  }
}
