import * as vscode from 'vscode';
import JiraApi from 'jira-client';
import {
  getJiraHost,
  getShowInlineCommitMessage,
  getShowInlineCommitter,
  getShowInlineJiraIssueKey,
  getShowInlineRelativeCommitTime
} from '../configs';
import {
  convertJiraMarkdownToNormalMarkdown,
  getJiraIssueContent,
  getJiraIssueKey,
  getJiraIssueLink
} from '../services/jira';
import { GitBlameCommandInfo, GitBlameInfo } from '../services/git.types';

export default class InlineMessageController {
  private static _instance: InlineMessageController;
  private _inlineMessageEditor: vscode.TextEditor | undefined;
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
    issueKey: string,
    issueContent: JiraApi.JsonResponse
  ): vscode.MarkdownString {
    const issueLink = getJiraIssueLink(issueKey);
    const indent = '&nbsp;&nbsp;&nbsp;&nbsp;';

    const markdown = new vscode.MarkdownString(
      `## [${issueKey}: ${issueContent.summary}](${issueLink})
      \n`
    );

    markdown.appendMarkdown(
      `${convertJiraMarkdownToNormalMarkdown(issueContent.description)}
      \n`
    );

    markdown.appendMarkdown(`---\n`);

    if (issueContent.assignee) {
      markdown.appendMarkdown(
        `Assignee: [${
          issueContent.assignee.displayName
        }](https://${getJiraHost()}/secure/ViewProfile.jspa?name=${
          issueContent.assignee.name
        }&selectedTab=jira.user.profile.panels:user-profile-summary-panel)${indent}|${indent}`
      );
    } else {
      markdown.appendMarkdown(`Assignee: Unassigned${indent}|${indent}`);
    }

    markdown.appendMarkdown(
      `Status: [${issueContent.status.name}](${issueLink})${indent}|${indent}`
    );

    const versionList = issueContent.fixVersions.map(
      (fixVersion: any) => fixVersion.name
    );
    const fixVersions = versionList.length
      ? versionList.join(', ')
      : 'No fix version found';
    markdown.appendMarkdown(`Fix Version/s: ${fixVersions}${indent}|${indent}`);

    markdown.appendMarkdown('Attachments: ');
    if (issueContent.attachment.length > 0) {
      for (let i = 0; i < issueContent.attachment.length; i++) {
        const numbering = i + 1;
        markdown.appendMarkdown(
          `[(${numbering})](${issueContent.attachment[i].content}) `
        );
      }
    } else {
      markdown.appendMarkdown(`No attachment found`);
    }

    return markdown;
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
    const message = this.getInlineMessage(gitBlameInfo);
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
    let hoverMessage: vscode.MarkdownString = new vscode.MarkdownString(
      'Loading Jira information...'
    );
    this._inlineMessageEditor.setDecorations(
      this._inlineMessageDecorationType,
      [{ range, renderOptions, hoverMessage }]
    );
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
