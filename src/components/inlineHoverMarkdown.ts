import * as vscode from 'vscode';

import {
  getJiraIssueUrl,
  getJiraProfileUrl,
  getJiraQueryUrl
} from '../services/jira';
import {
  JiraIssueFields,
  JiraUserInfo,
  JiraVersionInfo
} from '../services/jira.types';
import { convertJiraMarkdownToNormalMarkdown } from '../services/jiraMarkdown';

export function getHoverModalMarkdown(
  jiraIssueKey: string,
  jiraIssueContent: JiraIssueFields
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
  const assignee: JiraUserInfo | undefined =
    jiraIssueContent.assignee ?? undefined;
  if (assignee) {
    if (issueType || issueStatus) {
      markdown.appendMarkdown(`${indent}|${indent}`);
    }
    markdown.appendMarkdown(
      `Assignee: [${assignee.displayName}](${getJiraProfileUrl(assignee.name)})`
    );
  }
  const fixVersions = jiraIssueContent.fixVersions;
  if (fixVersions && fixVersions.length > 0) {
    if (issueType || issueStatus || assignee) {
      markdown.appendMarkdown(`${indent}|${indent}`);
    }
    const fixVersionsMarkdown = fixVersions
      .map(
        (version: JiraVersionInfo) =>
          `[${version.name}](${getJiraQueryUrl('fixVersion', version.name)})`
      )
      .join(', ');
    markdown.appendMarkdown(`Fix Versions: ${fixVersionsMarkdown}`);
  }
  return markdown;
}
