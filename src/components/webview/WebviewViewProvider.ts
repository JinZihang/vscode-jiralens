import * as vscode from 'vscode';
import JiraApi from 'jira-client';
import { convertJiraMarkdownToHtml } from '../../services/jira';
import { getNonce } from '../../utils';

export default class WebviewViewProvider implements vscode.WebviewViewProvider {
  static readonly viewType = 'jiralens';
  private _extensionUri: vscode.Uri;
  private _view?: vscode.WebviewView;
  private _issueKey: string;
  private _issueLink: string;
  private _issueContent: JiraApi.JsonResponse | undefined;

  constructor(extensionUri: vscode.Uri) {
    this._extensionUri = extensionUri;
    this._issueKey = '';
    this._issueLink = '';
  }

  getJiraIssueKey() {
    return this._issueKey;
  }

  static getNoJiraIssueViewContent(): string {
    return `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="widåth=device-width, initial-scale=1.0">
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
          ${(() => {
            const assignee = jiraIssueContent.fields.assignee;
            if (assignee) {
              return `<img class="user-avatar" src="${assignee.avatarUrls['48x48']}" alt="Issue Assignee">
              <div>
                <p>Assignee: ${assignee.displayName}</p>
                <p>Email: 
                  <a href="mailto: ${assignee.emailAddress}">
                    ${assignee.emailAddress}
                  </a>
                </p>
              </div>
              `;
            } else {
              return `
              <img class="user-avatar" src="https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/default?size=48&s=48" alt="Issue Assignee">
              <div>
                <p>Assignee: Unassgined</p>
              </div>
              `;
            }
          })()}
          </div>
          <div class="profile">
          ${(() => {
            const reporter = jiraIssueContent.fields.reporter;
            if (reporter) {
              return `<img class="user-avatar" src="${reporter.avatarUrls['48x48']}" alt="Issue Reporter">
              <div>
                <p>Reporter: ${reporter.displayName}</p>
                <p>Email: 
                  <a href="mailto: ${reporter.emailAddress}">
                    ${reporter.emailAddress}
                  </a>
                </p>
              </div>
              `;
            } else {
              return `
              <img class="user-avatar" src="https://avatar-management--avatars.us-west-2.prod.public.atl-paas.net/default?size=48&s=48" alt="Issue Reporter">
              <div>
                <p>Reporter: Unassgined</p>
              </div>
              `;
            }
          })()}
          </div>
        </div>
        <h3>Description</h3>
        <hr />
        <div id="issue-description">
          ${convertJiraMarkdownToHtml(jiraIssueContent.fields.description)}
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
                    <td>${convertJiraMarkdownToHtml(comment?.body)}</td>
                  </tr>`
              )
              .join('')}
          </table>
        </div>
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
    issueKey: string,
    issueLink: string,
    issueContent: JiraApi.JsonResponse | undefined = undefined
  ): void {
    this._issueKey = issueKey;
    this._issueLink = issueLink;
    this._issueContent = issueContent;
    if (this._view) {
      let viewContent: string;
      if (!issueContent) {
        viewContent = WebviewViewProvider.getLoadingJiraIssueViewContent();
      } else {
        viewContent = WebviewViewProvider.getJiraIssueViewContent(
          issueLink,
          issueContent,
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
    if (this._issueContent) {
      viewContent = WebviewViewProvider.getJiraIssueViewContent(
        this._issueLink,
        this._issueContent,
        this._extensionUri,
        this._view,
        true
      );
    } else {
      viewContent = WebviewViewProvider.getNoJiraIssueViewContent();
    }
    webviewView.webview.html = viewContent;
  }
}
