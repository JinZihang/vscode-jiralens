import * as vscode from 'vscode';
import { STAUTS_BAR_ITEM_ACTIVE } from '../commands';
import Extension from './Extension';
import { getJiraIssueContent, getJiraIssueLink } from '../jira';
import { getLoadingWebviewContent, getWebviewContent } from '../utils';

export default class StatusBarItem {
  private static _instance: StatusBarItem;
  private _statusBarItem: vscode.StatusBarItem;

  constructor() {
    this.registerStatusBarItemActiveCommand();
    this._statusBarItem = this.initStatusBarItem();
    StatusBarItem._instance = this;
  }

  static getInstance(): StatusBarItem {
    if (!StatusBarItem._instance) {
      StatusBarItem._instance = new StatusBarItem();
    }
    return StatusBarItem._instance;
  }

  registerStatusBarItemActiveCommand(): vscode.Disposable {
    return vscode.commands.registerCommand(STAUTS_BAR_ITEM_ACTIVE, async () => {
      if (!this._statusBarItem.text) {
        // This situation might happen when users manually trigger this command
        vscode.window.showErrorMessage(
          'No Jira issue found for the active line.'
        );
        return;
      }
      const extensionContext = Extension.getInstance().getContext();
      const jiraIssueKey = this._statusBarItem.text;
      const jiraIssueLink = getJiraIssueLink(jiraIssueKey);
      const selection = await vscode.window.showInformationMessage(
        `Open ${jiraIssueKey} in:`,
        'Tab',
        'Browser'
      );
      if (selection === 'Tab') {
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
        panel.webview.html = getLoadingWebviewContent();
        const jiraIssueContent = await getJiraIssueContent(
          this._statusBarItem.text
        );
        let webviewContent: string;
        if (!jiraIssueContent) {
          webviewContent = getLoadingWebviewContent();
        } else {
          webviewContent = getWebviewContent(
            jiraIssueLink,
            jiraIssueContent,
            extensionContext.extensionUri,
            panel.webview
          );
        }
        panel.webview.html = webviewContent;
      } else if (selection === 'Browser') {
        vscode.env.openExternal(vscode.Uri.parse(jiraIssueLink));
      }
    });
  }

  initStatusBarItem(): vscode.StatusBarItem {
    const statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    statusBarItem.command = STAUTS_BAR_ITEM_ACTIVE;
    const extensionContext = Extension.getInstance().getContext();
    extensionContext.subscriptions.push(statusBarItem);
    return statusBarItem;
  }

  renderStatusBarItem(jiraIssueKey: string): void {
    if (!jiraIssueKey) {
      this.hideStatusBarItem();
    }
    this._statusBarItem.text = jiraIssueKey;
    this._statusBarItem.show();
  }

  hideStatusBarItem(): void {
    this._statusBarItem.text = '';
    this._statusBarItem.hide();
  }
}
