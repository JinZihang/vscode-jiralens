import * as vscode from 'vscode';

import { fetchJiraIssue, getJiraIssueUrl } from '../../services/jira';
import Extension from '../Extension';
import {
  getJiraIssueViewContent,
  getLoadingJiraIssueViewContent,
  getNoJiraIssueViewContent
} from './jiraIssueHtml';
import WebviewViewProvider from './WebviewViewProvider';

export default class WebviewController {
  private static _instance: WebviewController;
  private _webviewProvider: WebviewViewProvider;

  constructor() {
    this._webviewProvider = this.initWebview();
    WebviewController._instance = this;
  }

  public static getInstance(): WebviewController {
    if (!WebviewController._instance) {
      return new WebviewController();
    }
    return WebviewController._instance;
  }

  initWebview(): WebviewViewProvider {
    const extensionContext = Extension.getInstance().getContext();
    const webviewProvider = new WebviewViewProvider(
      extensionContext.extensionUri
    );
    extensionContext.subscriptions.push(
      vscode.window.registerWebviewViewProvider(
        WebviewViewProvider.viewType,
        webviewProvider
      )
    );
    return webviewProvider;
  }

  async renderWebview(jiraIssueKey: string): Promise<void> {
    if (!jiraIssueKey) {
      this._webviewProvider.setNoJiraIssueView();
      return;
    }
    if (this._webviewProvider.getJiraIssueKey() === jiraIssueKey) {
      return;
    }
    this._webviewProvider.setLoadingJiraIssueView();
    const jiraIssueUrl = getJiraIssueUrl(jiraIssueKey);
    const jiraIssueContent = await fetchJiraIssue(jiraIssueKey);
    this._webviewProvider.setJiraIssueView(
      jiraIssueKey,
      jiraIssueUrl,
      jiraIssueContent
    );
  }

  renderConfigurationRequiredWebview(missingConfigs: string[]): void {
    this._webviewProvider.setConfigurationRequiredView(missingConfigs);
  }

  async openInTab(jiraIssueKey: string): Promise<void> {
    const extensionContext = Extension.getInstance().getContext();
    const jiraIssueUrl = getJiraIssueUrl(jiraIssueKey);
    const panel = vscode.window.createWebviewPanel(
      'jira-issue',
      jiraIssueKey,
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionContext.extensionUri, 'media')
        ]
      }
    );
    panel.webview.html = getLoadingJiraIssueViewContent();
    const jiraIssueContent = await fetchJiraIssue(jiraIssueKey);
    if (jiraIssueContent) {
      panel.webview.html = getJiraIssueViewContent(
        jiraIssueUrl,
        jiraIssueContent,
        extensionContext.extensionUri,
        panel.webview
      );
    } else {
      panel.webview.html = getNoJiraIssueViewContent();
    }
  }
}
