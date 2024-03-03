import * as vscode from 'vscode';
import Extension from './Extension';
import {
  JiraViewProvider,
  getJiraIssueContent,
  getJiraIssueLink
} from '../jira';

export default class Webview {
  private static _instance: Webview;
  private _webviewProvider: JiraViewProvider;

  constructor() {
    this._webviewProvider = this.initWebview();
    Webview._instance = this;
  }

  public static getInstance(): Webview {
    if (!Webview._instance) {
      return new Webview();
    }
    return Webview._instance;
  }

  initWebview(): JiraViewProvider {
    const extensionContext = Extension.getInstance().getContext();
    const webviewProvider = new JiraViewProvider(extensionContext.extensionUri);
    extensionContext.subscriptions.push(
      vscode.window.registerWebviewViewProvider(
        JiraViewProvider.viewType,
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
    if (this._webviewProvider.getCurrentIssueKey() === jiraIssueKey) {
      return;
    }
    this._webviewProvider.setLoadingView();
    const jiraIssueLink = getJiraIssueLink(jiraIssueKey);
    const jiraIssueContent = await getJiraIssueContent(jiraIssueKey);
    this._webviewProvider.setJiraIssueView(
      jiraIssueKey,
      jiraIssueLink,
      jiraIssueContent
    );
  }
}
