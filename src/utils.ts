import * as vscode from 'vscode';
import * as JiraApi from 'jira-client';
import {
  getShowInlineCommitMessage,
  getShowInlineCommitter,
  getShowInlineJiraIssueKey,
  getShowInlineRelativeCommitTime
} from './configs';
import { getJiraIssueKey } from './jira';
import { GitBlameInfo } from './types';

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}

export function isValidJiraProjectKey(key: string): boolean {
  const regex = /^[A-Z0-9]+$/;
  return regex.test(key);
}

function getRelativeTimePassed(curr: number, prev: number): string {
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

function truncateMessage(message: string): string {
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

export function getInlineMessage(gitBlameInfo: GitBlameInfo): string {
  if (gitBlameInfo.author === 'Not Committed Yet') {
    return 'Not committed yet';
  }
  const messages: string[] = [];
  if (getShowInlineCommitter()) {
    messages.push(gitBlameInfo.author);
  }
  if (getShowInlineRelativeCommitTime()) {
    const relativeTimePassed = getRelativeTimePassed(
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
  const truncatedCommitMessage = truncateMessage(commitMessage);
  if (getShowInlineCommitMessage()) {
    messages.push(truncatedCommitMessage);
  }
  return messages.length ? messages.join(' • ') : '';
}

function getNonce(): string {
  let text = '';
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

export function getNoJiraIssueWebviewContent(): string {
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

export function getLoadingWebviewContent(): string {
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

export function getWebviewContent(
  jiraIssueLink: string,
  jiraIssueContent: JiraApi.JsonResponse,
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

  let fixVersions = '';
  for (let i = 0; i < jiraIssueContent.fields.fixVersions.length; i++) {
    fixVersions += `${jiraIssueContent.fields.fixVersions[i].name} (Released on ${jiraIssueContent.fields.fixVersions[i].releaseDate})`;
  }

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
      <div class="header">
        <img id="project-avatar" src="${
          jiraIssueContent.fields.project.avatarUrls['48x48']
        }" />
        <div class="header-info">
            <p>
              ${
                jiraIssueContent.fields.project?.name
              } / <a href="${jiraIssueLink}"> ${jiraIssueContent.key}</a>
            </p>
            <h2>${jiraIssueContent.fields.summary}</h2>
        </div>
      </div>
      <h3>Details</h3>
      <hr />
      <div id="issue-details">
        <div id="issue-details-keys">
          <p>Type:</p>
          <p>Priority:</p>
          <p>Status:</p>
          <p>Resolution:</p>
          <p>Fix Version/s:</p>
          <p>Component/s:</p>
          <p>Epic Link:</p>
          <p>Development Team:</p>
        </div>
        <div class="issue-details-values">
          <p>
            ${
              jiraIssueContent.fields.issuetype?.name
                ? jiraIssueContent.fields.issuetype?.name
                : '&nbsp'
            }
          </p>
          <p>
            <img id="priority-icon" src="${
              jiraIssueContent.fields.priority?.iconUrl
                ? jiraIssueContent.fields.priority?.iconUrl
                : ''
            }" alt="Issue Priority" style="width: 10px; height: 10px;"> ${
              jiraIssueContent.fields.priority.name
                ? jiraIssueContent.fields.priority.name
                : '&nbsp'
            }
          </p>
          <p>
            ${
              jiraIssueContent.fields.status?.name
                ? jiraIssueContent.fields.status?.name
                : '&nbsp'
            }
          </p>
          <p>
            ${
              jiraIssueContent.fields.resolution?.name
                ? jiraIssueContent.fields.resolution?.name
                : '&nbsp'
            }
          </p>
          <p>${fixVersions ? fixVersions : '&nbsp'}</p>
          <p>
            ${
              jiraIssueContent.fields?.components?.length > 0 &&
              jiraIssueContent.fields?.components[0]?.name
                ? jiraIssueContent.fields?.components[0]?.name
                : '&nbsp'
            }
          </p>
          <p>
            ${
              jiraIssueContent.fields['customfield_22280']
                ? jiraIssueContent.fields['customfield_22280']
                : '&nbsp'
            }
          </p>
          <p>
            ${
              jiraIssueContent.fields['customfield_18882']?.length > 0 &&
              jiraIssueContent.fields['customfield_18882'][0]
                ? jiraIssueContent.fields['customfield_18882'][0]
                : '&nbsp'
            }
          </p>
        </div>
      </div>
      <h3>People</h3>
      <hr />
      <div id="profiles">
        <div class="profile">
          <img class="user-avatar" src="${
            jiraIssueContent.fields.assignee?.avatarUrls['48x48']
          }" alt="Issue Assignee">
          <div>
            <p>Assignee: ${
              jiraIssueContent.fields.assignee?.displayName
                ? jiraIssueContent.fields.assignee?.displayName
                : 'Not assigned'
            }</p>
            <p>Email: 
              <a href="mailto: ${
                jiraIssueContent.fields.assignee?.emailAddress
              }">
                ${jiraIssueContent.fields.assignee?.emailAddress}
              </a>
            </p>
          </div>
        </div>
        <div class="profile">
          <img class="user-avatar" src="${
            jiraIssueContent.fields.reporter?.avatarUrls['48x48']
          }" alt="Issue Reporter">
          <div>
            <p>Reporter: ${
              jiraIssueContent.fields.reporter?.displayName
                ? jiraIssueContent.fields.reporter?.displayName
                : '&nbsp'
            }</p>
            <p>Email: 
              <a href="mailto: ${
                jiraIssueContent.fields.reporter?.emailAddress
              }">
                ${jiraIssueContent.fields.reporter?.emailAddress}
              </a>
            </p>
          </div>
        </div>
      </div>
      <h3>Description</h3>
      <hr />
      <div id="issue-description">
        <p>${jiraIssueContent.fields.description}</p>
      </div>
      <h3>Attachments</h3>
      <hr />
      <div id="attachments">
        ${jiraIssueContent.fields.attachment
          .map(
            (
              attachment: any
            ) => ` <a href='${attachment.content}'>${attachment.filename}</a>
          <br />`
          )
          .join('')}
      </div>
      <h3>Comments</h3>
      <hr />
      <div id="comments">
        <table>
          <tr>
            <th>Name</th>
            <th>Date</th>
            <th>Comment</th>
          </tr>
          ${jiraIssueContent.fields.comment?.comments
            .map(
              (comment: any) => `
                <tr>
                  <td>${comment.author?.displayName}</td>
                  <td>${new Date(comment?.updated).toLocaleDateString()}</td>
                  <td>${comment?.body}</td>
                </tr>`
            )
            .join('')}
        </table>
      </div>
      <a id="external-link" href="${jiraIssueLink}">Open in Browser</a>
    </body>
  </html>`;
}
