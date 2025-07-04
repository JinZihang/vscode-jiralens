import * as vscode from 'vscode';
import JiraApi from 'jira-client';
import {
  getShowInlineCommitMessage,
  getShowInlineCommitter,
  getShowInlineJiraIssueKey,
  getShowInlineRelativeCommitTime
} from '../configs';
import {
  convertJiraMarkdownToNormalMarkdown,
  getJiraIssueContent,
  getJiraIssueKey,
  getJiraIssueUrl,
  getJiraProfileUrl,
  getJiraQueryUrl
} from '../services/jira';
import { GitBlameCommandInfo, GitBlameInfo } from '../services/git.types';
import { JiraUserInfo, JiraVersionInfo } from '../services/jira.types';

export default class InlineMessageController {
  private static _instance: InlineMessageController;
  private _renderedEditor: vscode.TextEditor | undefined;
  private _renderedLineNumber: number | undefined;
  private _inlineMessageDecorationType =
    vscode.window.createTextEditorDecorationType({
      after: {
        textDecoration: 'none; opacity: 0.25;',
        margin: '0 0 0 6em'
      }
    });

  constructor() {
    InlineMessageController._instance = this;
  }

  static getInstance(): InlineMessageController {
    if (!InlineMessageController._instance) {
      InlineMessageController._instance = new InlineMessageController();
    }
    return InlineMessageController._instance;
  }

  private getRelativeTimePassed(curr: number, prev: number): string {
    const msMinute = 60 * 1000;
    const msHour = msMinute * 60;
    const msDay = msHour * 24;
    const msMonth = msDay * 30;
    const msYear = msDay * 365;
    const elapsedTime = curr - prev;
    let value = 0;
    let unit = '';
    if (elapsedTime < msMinute) {
      value = Math.round(elapsedTime / 1000);
      unit = 'second';
    } else if (elapsedTime < msHour) {
      value = Math.round(elapsedTime / msMinute);
      unit = 'minute';
    } else if (elapsedTime < msDay) {
      value = Math.round(elapsedTime / msHour);
      unit = 'hour';
    } else if (elapsedTime < msMonth) {
      value = Math.round(elapsedTime / msDay);
      unit = 'day';
    } else if (elapsedTime < msYear) {
      value = Math.round(elapsedTime / msMonth);
      unit = 'month';
    } else {
      value = Math.round(elapsedTime / msYear);
      unit = 'year';
    }
    const plural = value > 1 ? 's' : '';
    return `${value} ${unit}${plural} ago`;
  }

  private truncateMessage(message: string): string {
    const lengthLimit = 30;
    if (message.length < lengthLimit) {
      return message;
    }
    const words = message.split(' ');
    let truncatedMessage = '';
    let i = 0;
    while (truncatedMessage.length + words[i].length < lengthLimit) {
      truncatedMessage += `${words[i]} `;
      i++;
    }
    return `${truncatedMessage.trim()}...`;
  }

  private getInlineMessage(gitBlameInfo: GitBlameInfo): string {
    if (gitBlameInfo.author === 'Not Committed Yet') {
      return 'Not committed yet';
    }
    const messages: string[] = [];
    if (getShowInlineCommitter()) {
      messages.push(gitBlameInfo.author);
    }
    if (getShowInlineRelativeCommitTime()) {
      const relativeTimePassed = this.getRelativeTimePassed(
        Date.now(),
        parseInt(gitBlameInfo['committer-time']) * 1000
      );
      messages.push(relativeTimePassed);
    }
    const commitMessage = gitBlameInfo.summary;
    if (getShowInlineJiraIssueKey()) {
      const jiraIssueKey = getJiraIssueKey(commitMessage);
      if (jiraIssueKey) {
        messages.push(jiraIssueKey);
      }
    }
    const truncatedCommitMessage = this.truncateMessage(commitMessage);
    if (getShowInlineCommitMessage()) {
      messages.push(truncatedCommitMessage);
    }
    return messages.length ? messages.join(' • ') : '';
  }

  private getHoverModalMarkdown(
    jiraIssueKey: string,
    jiraIssueContent: JiraApi.JsonResponse
  ): vscode.MarkdownString {
    const issueUrl = getJiraIssueUrl(jiraIssueKey);
    const indent = '&nbsp;&nbsp;&nbsp;&nbsp;';
    const markdown = new vscode.MarkdownString(
      `## [${jiraIssueKey}: ${jiraIssueContent.summary}](${issueUrl})
      \n`
    );
    markdown.appendMarkdown(
      `${convertJiraMarkdownToNormalMarkdown(jiraIssueContent.description)}
      \n`
    );
    markdown.appendMarkdown(`---\n`);
    const issueType = jiraIssueContent.issuetype;
    if (issueType) {
      markdown.appendMarkdown(`Type: ${issueType.name}`);
    }
    const issueStatus = jiraIssueContent.status;
    const issueResolution = jiraIssueContent.resolution;
    if (issueStatus) {
      if (issueType) {
        markdown.appendMarkdown(`${indent}|${indent}`);
      }
      markdown.appendMarkdown(`Status: ${issueStatus.name}`);
      if (issueResolution) {
        markdown.appendMarkdown(` (${issueResolution.name})`);
      }
    }
    const assignee: JiraUserInfo | undefined = jiraIssueContent.assignee;
    if (assignee) {
      if (issueType || issueStatus) {
        markdown.appendMarkdown(`${indent}|${indent}`);
      }
      markdown.appendMarkdown(
        `Assignee: [${
          assignee.displayName
        }](${getJiraProfileUrl(assignee.name)})`
      );
    }
    const fixVersions = jiraIssueContent.fixVersions;
    if (fixVersions && fixVersions.length > 0) {
      if (issueType || issueStatus || assignee) {
        markdown.appendMarkdown(`${indent}|${indent}`);
      }
      const fixVersionsMarkdown = fixVersions
        .map(
          (v: JiraVersionInfo) =>
            `[${v.name}](${getJiraQueryUrl('fixVersion', v.name)})`
        )
        .join(', ');
      markdown.appendMarkdown(`Fix Versions: ${fixVersionsMarkdown}`);
    }
    return markdown;
  }

  private hasTargetLineChanged(fileName: string, lineNumber: number): boolean {
    if (!this._renderedEditor) {
      // No inline message is being displayed
      return false;
    }
    return (
      fileName !== this._renderedEditor.document.fileName ||
      lineNumber !== this._renderedLineNumber
    );
  }

  private updateRenderRecord(
    editor: vscode.TextEditor,
    lineNumber: number
  ): void {
    this._renderedEditor = editor;
    this._renderedLineNumber = lineNumber;
  }

  async renderInlineMessage(
    gitBlameCommandInfo: GitBlameCommandInfo,
    jiraIssueKey: string
  ): Promise<void> {
    const { gitBlameInfo, editor, lineNumber } = gitBlameCommandInfo;
    const inlineMessage = this.getInlineMessage(gitBlameInfo);
    if (this.hasTargetLineChanged(editor.document.fileName, lineNumber)) {
      this.hideInlineMessage();
    }
    // Render using the latest information since the length of the line could have changed
    let activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      return;
    }
    let activeLine = activeEditor.document.lineAt(lineNumber);
    /**
     * Since hasTargetLineChanged() is not based on the active editor, if the active line
     * changed while running the git blame command, the range to render will be incorrect.
     * However, as the git blame command runs fast, we expect the situation to not happen.
     */
    let range = new vscode.Range(
      activeLine.lineNumber,
      activeLine.text.length,
      activeLine.lineNumber,
      activeLine.text.length + inlineMessage.length
    );
    const renderOptions = { after: { contentText: inlineMessage } };
    if (!jiraIssueKey) {
      // Render the no-Jira-issue message
      activeEditor.setDecorations(this._inlineMessageDecorationType, [
        { range, renderOptions }
      ]);
      this.updateRenderRecord(activeEditor, lineNumber);
      return;
    }
    // Render the message with loading hover modal
    let hoverMessage: vscode.MarkdownString = new vscode.MarkdownString(
      'Loading Jira information...'
    );
    activeEditor.setDecorations(this._inlineMessageDecorationType, [
      { range, renderOptions, hoverMessage }
    ]);
    this.updateRenderRecord(activeEditor, lineNumber);
    // Fetch the Jira issue content
    const jiraIssueContent = await getJiraIssueContent(jiraIssueKey);
    if (jiraIssueContent) {
      hoverMessage = this.getHoverModalMarkdown(
        jiraIssueKey,
        jiraIssueContent.fields
      );
    } else {
      hoverMessage = new vscode.MarkdownString(
        `Failed to load the content of ${jiraIssueKey}.`
      );
    }
    if (this.hasTargetLineChanged(editor.document.fileName, lineNumber)) {
      // The message with loading hover modal should have been hidden by the new rendering call
      return;
    }
    activeEditor = vscode.window.activeTextEditor!;
    if (!activeEditor) {
      return;
    }
    activeLine = activeEditor.document.lineAt(lineNumber);
    // Render using the latest information since the length of the line could have changed
    range = new vscode.Range(
      activeLine.lineNumber,
      activeLine.text.length,
      activeLine.lineNumber,
      activeLine.text.length + inlineMessage.length
    );
    const newDecorations = [{ range, renderOptions, hoverMessage }];
    activeEditor.setDecorations(
      this._inlineMessageDecorationType,
      newDecorations
    );
  }

  hideInlineMessage(): void {
    if (this._renderedEditor) {
      this._renderedEditor.setDecorations(
        this._inlineMessageDecorationType,
        []
      );
      this._renderedEditor = undefined;
    }
  }
}
