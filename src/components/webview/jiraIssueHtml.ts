import * as vscode from 'vscode';

import {
  getJiraIssueUrl,
  getJiraProfileUrl,
  getJiraQueryUrl
} from '../../services/jira';
import {
  JiraAttachmentInfo,
  JiraCommentInfo,
  JiraComponentInfo,
  JiraIssue,
  JiraIssueLinkInfo,
  JiraUserInfo,
  JiraVersionInfo
} from '../../services/jira.types';
import { convertJiraMarkdownToHtml } from '../../services/jiraMarkdown';
import { getNonce } from '../../utils';

export function getNoJiraIssueViewContent(): string {
  return `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none';">
        <title>Jira Issue Details</title>
      </head>
      <body>
        <p>No Jira issue found for the active line.</p>
      </body>
    </html>`;
}

export function getLoadingJiraIssueViewContent(): string {
  return `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none';">
        <title>Jira Issue Details</title>
      </head>
      <body>
        <p>Loading Jira issue details...</p>
      </body>
    </html>`;
}

export function getConfigurationRequiredViewContent(
  missingConfigs: string[]
): string {
  const missingListItems = missingConfigs
    .map((label) => `<li>${label}</li>`)
    .join('\n          ');
  return `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none';">
        <title>Jira Issue Details</title>
      </head>
      <body>
        <p><strong>JiraLens is not configured properly.</strong></p>
        <p>The following settings are required:</p>
        <ul>
        ${missingListItems}
        </ul>
        <p>Open the Command Palette and run the commands listed above to configure JiraLens.</p>
      </body>
    </html>`;
}

export function getJiraIssueViewContent(
  jiraIssueUrl: string,
  jiraIssueContent: JiraIssue,
  extensionUri: vscode.Uri,
  webview: any,
  isWebviewView = false
): string {
  let styleUri: vscode.Uri;
  let cspSource: string;
  if (isWebviewView) {
    styleUri = webview.webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, 'media', 'webview.css')
    );
    cspSource = webview.webview.cspSource;
  } else {
    styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, 'media', 'webview.css')
    );
    cspSource = webview.cspSource;
  }
  const nonce = getNonce();
  return `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${cspSource} https:; style-src ${cspSource}; script-src 'nonce-${nonce}';">
        <link rel="stylesheet" type="text/css" href="${styleUri}">
        <title>Jira Issue Details</title>
      </head>
      <body>
        ${getJiraIssueHeaderHTML(jiraIssueContent, jiraIssueUrl)}
        ${getJiraIssuePeopleHTML(jiraIssueContent)}
        ${getJiraIssueDatesHTML(jiraIssueContent)}
        ${getJiraIssueDetailsHTML(jiraIssueContent)}
        ${getJiraIssueDescriptionHTML(jiraIssueContent)}
        ${getJiraIssueAttachmentsHTML(jiraIssueContent)}
        ${getJiraIssueLinksHTML(jiraIssueContent)}
        ${getJiraIssueCommentsHTML(jiraIssueContent)}
      </body>
    </html>`;
}

export function getJiraIssueHeaderHTML(
  jiraIssueContent: JiraIssue,
  jiraIssueUrl: string
): string {
  return `<div class="header">
      <img id="project-avatar" src="${jiraIssueContent.fields.project?.avatarUrls['48x48']}" />
      <div class="header-info">
        <p>
          ${jiraIssueContent.fields.project?.name} / <a href="${jiraIssueUrl}"> ${jiraIssueContent.key}</a>
        </p>
        <h2>${jiraIssueContent.fields.summary}</h2>
      </div>
    </div>`;
}

export function getJiraIssuePeopleHTML(jiraIssueContent: JiraIssue): string {
  const assignee: JiraUserInfo | undefined =
    jiraIssueContent.fields.assignee ?? undefined;
  const reporter: JiraUserInfo | undefined =
    jiraIssueContent.fields.reporter ?? undefined;
  const getPeopleHTML = (
    people: JiraUserInfo | undefined,
    role: 'Assignee' | 'Reporter'
  ): string => {
    if (people) {
      return `<div class="profile">
          <img class="user-avatar" src="${people.avatarUrls['48x48']}" alt="Issue ${role}">
          <div>
            <p>${role}: <a href="${getJiraProfileUrl(people.name)}">${people.displayName}</a></p>
            <p>Email:
              <a href="mailto: ${people.emailAddress}">
                ${people.emailAddress}
              </a>
            </p>
          </div>
        </div>`;
    } else {
      return `<div class="profile">
          <img class="user-avatar" src="https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/default?size=48&s=48" alt="Issue ${role}">
          <div>
            <p>${role}: Unassigned</p>
          </div>
        </div>`;
    }
  };
  return `<h3>People</h3>
    <hr>
    <div id="profiles">
      ${getPeopleHTML(assignee, 'Assignee')}
      ${getPeopleHTML(reporter, 'Reporter')}
    </div>`;
}

export function getJiraIssueDatesHTML(jiraIssueContent: JiraIssue): string {
  return `<h3>Dates</h3>
    <hr>
    <div id="issue-dates">
      <p>Created: ${new Date(jiraIssueContent.fields.created).toLocaleDateString()}</p>
      <p>Updated: ${new Date(jiraIssueContent.fields.updated).toLocaleDateString()}</p>
      ${
        jiraIssueContent.fields.resolutiondate
          ? `<p>Resolved: ${new Date(
              jiraIssueContent.fields.resolutiondate
            ).toLocaleDateString()}</p>`
          : ''
      }
    </div>`;
}

export function getJiraIssueDetailsHTML(jiraIssueContent: JiraIssue): string {
  const typeHTML = `<tr>
      <td>Type:</td>
      <td><img id="type-icon" src="${
        jiraIssueContent.fields.issuetype?.iconUrl
          ? jiraIssueContent.fields.issuetype?.iconUrl
          : ''
      }" alt="Issue Type" style="width: 10px; height: 10px;"> ${
        jiraIssueContent.fields.issuetype?.name
          ? jiraIssueContent.fields.issuetype?.name
          : '&nbsp'
      }</td>
    </tr>`;
  const priorityHTML = `<tr>
      <td>Priority:</td>
      <td><img id="priority-icon" src="${
        jiraIssueContent.fields.priority?.iconUrl
          ? jiraIssueContent.fields.priority?.iconUrl
          : ''
      }" alt="Issue Priority" style="width: 10px; height: 10px;"> ${
        jiraIssueContent.fields.priority?.name
          ? jiraIssueContent.fields.priority?.name
          : '&nbsp'
      }</td>
    </tr>`;
  const issueResolution = jiraIssueContent.fields.resolution?.name
    ? ` (${jiraIssueContent.fields.resolution?.name})`
    : '';
  const statusHTML = `<tr>
      <td>Status:</td>
      <td><img id="status-icon" src="${
        jiraIssueContent.fields.status?.iconUrl
          ? jiraIssueContent.fields.status?.iconUrl
          : ''
      }" alt="Issue Status" style="width: 10px; height: 10px;"> ${
        jiraIssueContent.fields.status?.name
          ? `${jiraIssueContent.fields.status?.name}${issueResolution}`
          : '&nbsp'
      }</td>
    </tr>`;
  const affectsVersions = jiraIssueContent.fields.versions?.length
    ? `<tr>
        <td>Affects Version/s:</td>
        <td>
          ${jiraIssueContent.fields.versions
            .map(
              (version: JiraVersionInfo) =>
                `<a href="${getJiraQueryUrl('fixVersion', version.name)}">${version.name}</a>`
            )
            .join(', ')}
        </td>
      </tr>`
    : '';
  const fixVersionsHTML = jiraIssueContent.fields.fixVersions?.length
    ? `<tr>
        <td>Fix Version/s:</td>
        <td>
          ${jiraIssueContent.fields.fixVersions
            .map(
              (version: JiraVersionInfo) =>
                `<a href="${getJiraQueryUrl('fixVersion', version.name)}">${version.name}</a>`
            )
            .join(', ')}</td>
      </tr>`
    : '';
  const componentsHTML = jiraIssueContent.fields.components?.length
    ? `<tr>
        <td>Component/s:</td>
        <td>
          ${jiraIssueContent.fields.components
            .map(
              (component: JiraComponentInfo) =>
                `<a href="${getJiraQueryUrl('component', component.name)}">${component.name}</a>`
            )
            .join(', ')}
        </td>
      </tr>`
    : '';
  const labelsHTML = jiraIssueContent.fields.labels?.length
    ? `<tr>
        <td>Labels:</td>
        <td>
          ${jiraIssueContent.fields.labels
            .map(
              (label: string) =>
                `<a href="${getJiraQueryUrl('labels', label)}">${label}</a>`
            )
            .join(', ')}
        </td>
      </tr>`
    : '';
  const environmentHTML = jiraIssueContent.fields.environment
    ? `<tr>
        <td>Environment:</td>
        <td>${jiraIssueContent.fields.environment}</td>
      </tr>`
    : '';

  return `<h3>Details</h3>
    <hr>
    <table id="issue-details-table">
      ${typeHTML}
      ${priorityHTML}
      ${statusHTML}
      ${affectsVersions}
      ${fixVersionsHTML}
      ${componentsHTML}
      ${labelsHTML}
      ${environmentHTML}
    </table>`;
}

export function getJiraIssueDescriptionHTML(
  jiraIssueContent: JiraIssue
): string {
  return `<h3>Description</h3>
    <hr>
    <div id="issue-description">
      ${convertJiraMarkdownToHtml(jiraIssueContent.fields.description)}
    </div>`;
}

export function getJiraIssueAttachmentsHTML(
  jiraIssueContent: JiraIssue
): string {
  const attachments: JiraAttachmentInfo[] | undefined =
    jiraIssueContent.fields.attachment;
  if (!attachments || attachments.length === 0) {
    return '';
  }
  return `<h3>Attachments</h3>
    <hr>
    <div id="attachments">
      ${attachments
        .map(
          (attachment) =>
            ` <a href='${attachment.content}'>${attachment.filename}</a><br>`
        )
        .join('')}
    </div>`;
}

export function getJiraIssueLinksHTML(jiraIssueContent: JiraIssue): string {
  const issueLinks: JiraIssueLinkInfo[] | undefined =
    jiraIssueContent.fields.issuelinks;
  if (!issueLinks || issueLinks.length === 0) {
    return '';
  }
  const relationshipToIssueLinks = new Map<string, JiraIssueLinkInfo[]>();
  for (const issueLink of issueLinks) {
    let linkDirection = issueLink.inwardIssue
      ? issueLink.type.inward
      : issueLink.type.outward;
    if (!linkDirection) {
      linkDirection = 'relates to';
    }
    const existingIssueLinks =
      relationshipToIssueLinks.get(linkDirection) ?? [];
    existingIssueLinks.push(issueLink);
    relationshipToIssueLinks.set(linkDirection, existingIssueLinks);
  }
  const getIssueLinkDetailsHTML = (link: JiraIssueLinkInfo): string => {
    const linkedIssue = link.inwardIssue ?? link.outwardIssue;
    if (!linkedIssue) {
      return '';
    }
    const issueTypeIconHTML = `<img id="type-icon" src="${
      linkedIssue.fields.issuetype?.iconUrl
        ? linkedIssue.fields.issuetype?.iconUrl
        : ''
    }" alt="Issue Type" style="width: 10px; height: 10px;">`;
    const issuePriorityIconHTML = `<img id="priority-icon" src="${
      linkedIssue.fields.priority?.iconUrl
        ? linkedIssue.fields.priority?.iconUrl
        : ''
    }" alt="Issue Priority" style="width: 10px; height: 10px;">`;
    const issueStatusIconHTML = `<img id="status-icon" src="${
      linkedIssue.fields.status?.iconUrl
        ? linkedIssue.fields.status?.iconUrl
        : ''
    }" alt="Issue Status" style="width: 10px; height: 10px;">`;
    const issueKeyHTML = `<a href="${getJiraIssueUrl(linkedIssue.key)}">${linkedIssue.key}</a>`;
    const issueSummary = linkedIssue.fields.summary;
    return `<tr>
        <td class="issue-link-details">
          <p>${issueTypeIconHTML} ${issuePriorityIconHTML} ${issueStatusIconHTML} ${issueKeyHTML} ${issueSummary} </p>
        </td>
      </tr>`;
  };
  let relationshipToIssueLinksHTML = '';
  for (const [relationship, links] of relationshipToIssueLinks) {
    relationshipToIssueLinksHTML += `<tr>
          <td>
            <p>${relationship}</p>
          </td>
        <tr>
        `;
    for (const issueLink of links) {
      relationshipToIssueLinksHTML += getIssueLinkDetailsHTML(issueLink);
    }
  }
  return `<h3>Issue Links</h3>
    <hr>
    <table id="issue-links-table">
      ${relationshipToIssueLinksHTML}
    </table>`;
}

export function getJiraIssueCommentsHTML(jiraIssueContent: JiraIssue): string {
  const comments: JiraCommentInfo[] | undefined =
    jiraIssueContent.fields.comment?.comments;
  if (!comments || comments.length === 0) {
    return '';
  }
  const getCommentHTML = (comment: JiraCommentInfo): string => {
    const author = comment.author;
    const authorName = author ? author.displayName : 'Unknown Author';
    const authorUrl = author ? getJiraProfileUrl(author.name) : '';
    const authorHTML = authorUrl
      ? `<a href="${authorUrl}">${authorName}</a>`
      : authorName;
    const date = new Date(comment.created).toLocaleDateString();
    const body = convertJiraMarkdownToHtml(comment.body);
    return `<tr>
        <td>📫</td>
        <td>
          <p>${authorHTML} added a comment - ${date}</p>
          <p>${body}</p>
        </td>
      </tr>`;
  };
  const commentsHTML = comments.map(getCommentHTML).join('');
  return `<h3>Comments</h3>
    <hr>
    <table id="comments-table">
      ${commentsHTML}
    </table>`;
}
