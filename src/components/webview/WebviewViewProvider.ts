import * as vscode from 'vscode';

import { getMissingCoreConfigMessages } from '../../configs';
import { JiraIssue } from '../../services/jira.types';
import {
  getConfigurationRequiredViewContent,
  getJiraIssueViewContent,
  getLoadingJiraIssueViewContent,
  getNoJiraIssueViewContent
} from './jiraIssueHtml';

export default class WebviewViewProvider implements vscode.WebviewViewProvider {
  static readonly viewType = 'jiralens';
  private _extensionUri: vscode.Uri;
  private _view?: vscode.WebviewView;
  private _jiraIssueKey: string;
  private _jiraIssueUrl: string;
  private _jiraIssueContent: JiraIssue | undefined;

  constructor(extensionUri: vscode.Uri) {
    this._extensionUri = extensionUri;
    this._jiraIssueKey = '';
    this._jiraIssueUrl = '';
  }

  getJiraIssueKey() {
    return this._jiraIssueKey;
  }

  setNoJiraIssueView(): void {
    this._jiraIssueKey = '';
    if (this._view) {
      this._view.webview.html = getNoJiraIssueViewContent();
    }
  }

  setLoadingJiraIssueView(): void {
    if (this._view) {
      this._view.webview.html = getLoadingJiraIssueViewContent();
    }
  }

  setConfigurationRequiredView(missingConfigs: string[]): void {
    if (this._view) {
      this._view.webview.html =
        getConfigurationRequiredViewContent(missingConfigs);
    }
  }

  setJiraIssueView(
    jiraIssueKey: string,
    jiraIssueUrl: string,
    jiraIssueContent: JiraIssue | undefined = undefined
  ): void {
    this._jiraIssueKey = jiraIssueKey;
    this._jiraIssueUrl = jiraIssueUrl;
    this._jiraIssueContent = jiraIssueContent;
    if (this._view) {
      let jiraIssueHtml: string;
      if (!jiraIssueContent) {
        jiraIssueHtml = getLoadingJiraIssueViewContent();
      } else {
        jiraIssueHtml = getJiraIssueViewContent(
          jiraIssueUrl,
          jiraIssueContent,
          this._extensionUri,
          this._view,
          true
        );
      }
      this._view.webview.html = jiraIssueHtml;
    }
  }

  async resolveWebviewView(webviewView: vscode.WebviewView): Promise<void> {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this._extensionUri, 'media')]
    };
    const missingConfigMessages = getMissingCoreConfigMessages();
    if (missingConfigMessages.length > 0) {
      webviewView.webview.html = getConfigurationRequiredViewContent(
        missingConfigMessages
      );
      return;
    }
    let jiraIssueHtml: string;
    if (this._jiraIssueContent) {
      jiraIssueHtml = getJiraIssueViewContent(
        this._jiraIssueUrl,
        this._jiraIssueContent,
        this._extensionUri,
        this._view,
        true
      );
    } else {
      jiraIssueHtml = getNoJiraIssueViewContent();
    }
    webviewView.webview.html = jiraIssueHtml;
  }
}
