import * as vscode from 'vscode';
import JiraApi from 'jira-client';
import {
  convertJiraMarkdownToHtml,
  getJiraIssueUrl as getJiraIssueUrl,
  getJiraQueryUrl,
  getJiraProfileUrl
} from '../../services/jira';
import { getNonce } from '../../utils';
import {
  JiraAttachmentInfo,
  JiraCommentInfo,
  JiraVersionInfo,
  JiraIssueLinkInfo,
  JiraUserInfo,
  JiraComponentInfo
} from '../../services/jira.types';

export default class WebviewViewProvider implements vscode.WebviewViewProvider {
  static readonly viewType = 'jiralens';
  private _extensionUri: vscode.Uri;
  private _view?: vscode.WebviewView;
  private _jiraIssueKey: string;
  private _jiraIssueUrl: string;
  private _jiraIssueContent: JiraApi.JsonResponse | undefined;

  constructor(extensionUri: vscode.Uri) {
    this._extensionUri = extensionUri;
    this._jiraIssueKey = '';
    this._jiraIssueUrl = '';
  }

  getJiraIssueKey() {
    return this._jiraIssueKey;
  }

  static getNoJiraIssueViewContent(): string {
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

  static getLoadingJiraIssueViewContent(): string {
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

  static getJiraIssueViewContent(
    jiraIssueUrl: string,
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
          ${this._getJiraIssueHeaderHTML(jiraIssueContent, jiraIssueUrl)}
          ${this._getJiraIssuePeopleHTML(jiraIssueContent)}
          ${this._getJiraIssueDatesHTML(jiraIssueContent)}
          ${this._getJiraIssueDetailsHTML(jiraIssueContent)}
          ${this._getJiraIssueDescriptionHTML(jiraIssueContent)}
          ${this._getJiraIssueAttachmentsHTML(jiraIssueContent)}
          ${this._getJiraIssueLinksHTML(jiraIssueContent)}
          ${this._getJiraIssueCommentsHTML(jiraIssueContent)}
        </body>
      </html>`;
  }

  setNoJiraIssueView(): void {
    if (this._view) {
      this._view.webview.html = WebviewViewProvider.getNoJiraIssueViewContent();
    }
  }

  setLoadingJiraIssueView(): void {
    if (this._view) {
      this._view.webview.html =
        WebviewViewProvider.getLoadingJiraIssueViewContent();
    }
  }

  setJiraIssueView(
    jiraIssueKey: string,
    jiraIssueUrl: string,
    jiraIssueContent: JiraApi.JsonResponse | undefined = undefined
  ): void {
    this._jiraIssueKey = jiraIssueKey;
    this._jiraIssueUrl = jiraIssueUrl;
    this._jiraIssueContent = jiraIssueContent;
    if (this._view) {
      let viewContent: string;
      if (!jiraIssueContent) {
        viewContent = WebviewViewProvider.getLoadingJiraIssueViewContent();
      } else {
        viewContent = WebviewViewProvider.getJiraIssueViewContent(
          jiraIssueUrl,
          jiraIssueContent,
          this._extensionUri,
          this._view,
          true
        );
      }
      this._view.webview.html = viewContent;
    }
  }

  async resolveWebviewView(webviewView: vscode.WebviewView): Promise<void> {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this._extensionUri, 'media')]
    };
    let viewContent: string;
    if (this._jiraIssueContent) {
      viewContent = WebviewViewProvider.getJiraIssueViewContent(
        this._jiraIssueUrl,
        this._jiraIssueContent,
        this._extensionUri,
        this._view,
        true
      );
    } else {
      viewContent = WebviewViewProvider.getNoJiraIssueViewContent();
    }
    webviewView.webview.html = viewContent;
  }

  static _getJiraIssueHeaderHTML(
    jiraIssueContent: JiraApi.JsonResponse,
    jiraIssueLink: string
  ): string {
    return `<div class="header">
        <img id="project-avatar" src="${jiraIssueContent.fields.project.avatarUrls['48x48']}" />
        <div class="header-info">
          <p>
            ${jiraIssueContent.fields.project?.name} / <a href="${jiraIssueLink}"> ${jiraIssueContent.key}</a>
          </p>
          <h2>${jiraIssueContent.fields.summary}</h2>
        </div>
      </div>`;
  }

  static _getJiraIssuePeopleHTML(
    jiraIssueContent: JiraApi.JsonResponse
  ): string {
    const assignee: JiraUserInfo | undefined = jiraIssueContent.fields.assignee;
    const reporter: JiraUserInfo | undefined = jiraIssueContent.fields.reporter;
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

  static _getJiraIssueDatesHTML(
    jiraIssueContent: JiraApi.JsonResponse
  ): string {
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

  static _getJiraIssueDetailsHTML(
    jiraIssueContent: JiraApi.JsonResponse
  ): string {
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
                (v: JiraVersionInfo) =>
                  `<a href="${getJiraQueryUrl('fixVersion', v.name)}">${v.name}</a>`
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
                (v: JiraVersionInfo) =>
                  `<a href="${getJiraQueryUrl('fixVersion', v.name)}">${v.name}</a>`
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
                (c: JiraComponentInfo) =>
                  `<a href="${getJiraQueryUrl('component', c.name)}">${c.name}</a>`
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
                (l: string) =>
                  `<a href="${getJiraQueryUrl('labels', l)}">${l}</a>`
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

  static _getJiraIssueDescriptionHTML(
    jiraIssueContent: JiraApi.JsonResponse
  ): string {
    return `<h3>Description</h3>
      <hr>
      <div id="issue-description">
        ${convertJiraMarkdownToHtml(jiraIssueContent.fields.description)}
      </div>`;
  }

  static _getJiraIssueAttachmentsHTML(
    jiraIssueContent: JiraApi.JsonResponse
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
          .map((a) => ` <a href='${a.content}'>${a.filename}</a><br>`)
          .join('')}
      </div>`;
  }

  static _getJiraIssueLinksHTML(
    jiraIssueContent: JiraApi.JsonResponse
  ): string {
    const issueLinks: JiraIssueLinkInfo[] | undefined =
      jiraIssueContent.fields.issuelinks;
    if (!issueLinks || issueLinks.length === 0) {
      return '';
    }
    const relationshipToIssueLinks = new Map<string, JiraIssueLinkInfo[]>();
    for (const issueLink of issueLinks) {
      let issueType = issueLink.inwardIssue
        ? issueLink.type.inward
        : issueLink.type.outward;
      if (!issueType) {
        issueType = 'relates to';
      }
      const existingIssueLinks = relationshipToIssueLinks.get(issueType) ?? [];
      existingIssueLinks.push(issueLink);
      relationshipToIssueLinks.set(issueType, existingIssueLinks);
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
    for (const [relationship, issueLinks] of relationshipToIssueLinks) {
      relationshipToIssueLinksHTML += `<tr>
            <td>
              <p>${relationship}</p>
            </td>
          <tr>
          `;
      for (const issueLink of issueLinks) {
        relationshipToIssueLinksHTML += getIssueLinkDetailsHTML(issueLink);
      }
    }
    return `<h3>Issue Links</h3>
      <hr>
      <table id="issue-links-table">
        ${relationshipToIssueLinksHTML}
      </table>`;
  }

  static _getJiraIssueCommentsHTML(
    jiraIssueContent: JiraApi.JsonResponse
  ): string {
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
}
