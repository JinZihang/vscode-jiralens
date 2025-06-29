import * as vscode from 'vscode';
import Extension from '../Extension';
import WebviewViewProvider from './WebviewViewProvider';
import { getJiraIssueContent, getJiraIssueUrl } from '../../services/jira';

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
    const jiraIssueContent = await getJiraIssueContent(jiraIssueKey);
    this._webviewProvider.setJiraIssueView(
      jiraIssueKey,
      jiraIssueUrl,
      jiraIssueContent
    );
  }
}
