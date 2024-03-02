import * as vscode from 'vscode';
import JiraApi from 'jira-client';
import { DOMSerializer } from 'prosemirror-model';
import { defaultSchema } from '@atlaskit/adf-schema/schema-default';
import { WikiMarkupTransformer } from '@atlaskit/editor-wikimarkup-transformer';
import { JSDOM } from 'jsdom';
import { getJiraBearerToken, getJiraHost, getJiraProjectKeys } from './configs';
import {
  getLoadingWebviewContent,
  getNoJiraIssueWebviewContent,
  getWebviewContent
} from './utils';

export function getJiraIssueKey(commitMessage: string): string {
  const projectKeys = getJiraProjectKeys();
  // Expect every commit message to contain only one Jira issue key
  for (const key of projectKeys) {
    // Examples: JRL-123, JRL12345
    const regex = new RegExp(`${key}-?\\d+`, 'g');
    const matches = commitMessage.match(regex);
    if (matches && matches.length > 0) {
      return matches[0];
    }
  }
  return '';
}

export function getJiraIssueLink(issueKey: string): string {
  return `https://${getJiraHost()}/browse/${issueKey}`;
}

export function isValidJiraBearerToken(token: string): boolean {
  try {
    // The validation approach here is not tested yet
    new JiraApi({
      protocol: 'https',
      host: getJiraHost(),
      apiVersion: '2',
      strictSSL: true,
      bearer: token
    });
    return true;
  } catch (error) {
    return false;
  }
}

export async function getJiraIssueContent(
  issueKey: string
): Promise<JiraApi.JsonResponse | undefined> {
  const jira = new JiraApi({
    protocol: 'https',
    host: getJiraHost(),
    apiVersion: '2',
    strictSSL: true,
    bearer: getJiraBearerToken()
  });
  const issueContent = await jira.findIssue(issueKey);
  return issueContent;
}

export function convertJiraMarkdownToHtml(markdown: string): string {
  const transformer = new WikiMarkupTransformer();
  const pmNode = transformer.parse(markdown);
  const dom = new JSDOM();
  const document = dom.window.document;
  const target = document.createElement('div');
  const html = DOMSerializer.fromSchema(defaultSchema).serializeFragment(
    pmNode.content,
    { document },
    target
  ) as HTMLElement;
  return html.outerHTML;
}

export function getHoverModalMarkdown(
  issueKey: string,
  issueContent: JiraApi.JsonResponse
): vscode.MarkdownString {
  const issueLink = getJiraIssueLink(issueKey);
  const indent = '&nbsp;&nbsp;&nbsp;&nbsp;';

  const markdown = new vscode.MarkdownString(`
  <table width="700px">
    <tr>
      <th>
        <h2 align="left"><a href=${issueLink}>${issueKey}</a>: ${
          issueContent.summary
        }</h2>
      </th>
    </tr>
    <tr>
      <td>
        ${
          issueContent.description
            ? convertJiraMarkdownToHtml(issueContent.description)
            : 'No description available'
        }
      </td>
    </tr>
  </table>
  \n`);

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

  markdown.supportHtml = true;
  markdown.isTrusted = true;
  return markdown;
}

export class JiraViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'jiralens';

  private _extensionUri: vscode.Uri;
  private _view?: vscode.WebviewView;
  private _issueKey: string;
  private _issueLink: string;
  private _issueContent: JiraApi.JsonResponse | undefined;

  constructor(private readonly extensionUri: vscode.Uri) {
    this._extensionUri = extensionUri;
    this._issueKey = '';
    this._issueLink = '';
  }

  public getCurrentIssueKey() {
    return this._issueKey;
  }

  public setNoJiraIssueView(): void {
    if (this._view) {
      this._view.webview.html = getNoJiraIssueWebviewContent();
    }
  }

  public setLoadingView(): void {
    if (this._view) {
      this._view.webview.html = getLoadingWebviewContent();
    }
  }

  public setJiraIssueView(
    issueKey: string,
    issueLink: string,
    issueContent: JiraApi.JsonResponse | undefined = undefined
  ): void {
    this._issueKey = issueKey;
    this._issueLink = issueLink;
    this._issueContent = issueContent;
    if (this._view) {
      let webviewContent: string;
      if (!issueContent) {
        webviewContent = getLoadingWebviewContent();
      } else {
        webviewContent = getWebviewContent(
          issueLink,
          issueContent,
          this._extensionUri,
          this._view,
          true
        );
      }
      this._view.webview.html = webviewContent;
    }
  }

  public async resolveWebviewView(
    webviewView: vscode.WebviewView
  ): Promise<void> {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this._extensionUri, 'media')]
    };
    let webviewContent: string;
    if (this._issueContent) {
      webviewContent = getWebviewContent(
        this._issueLink,
        this._issueContent,
        this._extensionUri,
        this._view,
        true
      );
    } else {
      webviewContent = getNoJiraIssueWebviewContent();
    }
    webviewView.webview.html = webviewContent;
  }
}
