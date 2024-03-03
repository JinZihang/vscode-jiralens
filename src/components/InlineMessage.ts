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

  private hasTargetLineChanged(
    editor: vscode.TextEditor,
    lineNumber: number
  ): boolean {
    const activeEditor = vscode.window.activeTextEditor;
    return (
      !activeEditor ||
      activeEditor !== editor ||
      activeEditor.selection.active.line !== lineNumber
    );
  }

  async renderInlineMessage(
    gitBlameCommandInfo: GitBlameCommandInfo,
    jiraIssueKey: string
  ): Promise<void> {
    const { gitBlameInfo, editor, lineNumber } = gitBlameCommandInfo;
    const message = getInlineMessage(gitBlameInfo);
    // Ensure the target line has not changed since calling runGitBlameCommand()
    if (!message || this.hasTargetLineChanged(editor, lineNumber)) {
      this.hideInlineMessage();
      return;
    }
    this._inlineMessageEditor = vscode.window.activeTextEditor!;
    let activeLine = this._inlineMessageEditor.document.lineAt(lineNumber);
    // Render using the latest information since the length of the line could have changed
    let range = new vscode.Range(
      activeLine.lineNumber,
      activeLine.text.length,
      activeLine.lineNumber,
      activeLine.text.length + message.length
    );
    const renderOptions = { after: { contentText: message } };
    if (!jiraIssueKey) {
      this._inlineMessageEditor.setDecorations(
        this._inlineMessageDecorationType,
        [{ range, renderOptions }]
      );
      return;
    }
    let hoverMessage = new vscode.MarkdownString('Loading Jira information...');
    this._inlineMessageEditor.setDecorations(
      this._inlineMessageDecorationType,
      [{ range, renderOptions, hoverMessage }]
    );
    const jiraIssueContent = await getJiraIssueContent(jiraIssueKey);
    if (jiraIssueContent) {
      hoverMessage = getHoverModalMarkdown(
        jiraIssueKey,
        jiraIssueContent.fields
      );
    }
    // Ensure the target line has not changed since running getJiraIssueContent()
    if (this.hasTargetLineChanged(editor, lineNumber)) {
      return;
    }
    this._inlineMessageEditor = vscode.window.activeTextEditor!;
    activeLine = this._inlineMessageEditor.document.lineAt(lineNumber);
    // Render using the latest information since the length of the line could have changed
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

  hideInlineMessage(): void {
    if (this._inlineMessageEditor) {
      this._inlineMessageEditor.setDecorations(
        this._inlineMessageDecorationType,
        []
      );
    }
  }
}
