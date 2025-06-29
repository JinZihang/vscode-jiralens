import * as vscode from 'vscode';
import { STATUS_BAR_ITEM_ACTIVE } from '../commands';
import Extension from './Extension';
import WebviewViewProvider from './webview/WebviewViewProvider';
import { getJiraIssueContent, getJiraIssueUrl } from '../services/jira';

export default class StatusBarItemController {
  private static _instance: StatusBarItemController;
  private _statusBarItem: vscode.StatusBarItem;

  constructor() {
    this.registerStatusBarItemActiveCommand();
    this._statusBarItem = this.initStatusBarItem();
    StatusBarItemController._instance = this;
  }

  static getInstance(): StatusBarItemController {
    if (!StatusBarItemController._instance) {
      StatusBarItemController._instance = new StatusBarItemController();
    }
    return StatusBarItemController._instance;
  }

  registerStatusBarItemActiveCommand(): vscode.Disposable {
    return vscode.commands.registerCommand(STATUS_BAR_ITEM_ACTIVE, async () => {
      if (!this._statusBarItem.text) {
        // This situation might happen when users manually trigger this command
        vscode.window.showErrorMessage(
          'No Jira issue found for the active line.'
        );
        return;
      }
      const extensionContext = Extension.getInstance().getContext();
      const jiraIssueKey = this._statusBarItem.text;
      const jiraIssueUrl = getJiraIssueUrl(jiraIssueKey);
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
        panel.webview.html =
          WebviewViewProvider.getLoadingJiraIssueViewContent();
        const jiraIssueContent = await getJiraIssueContent(
          this._statusBarItem.text
        );
        if (jiraIssueContent) {
          panel.webview.html = WebviewViewProvider.getJiraIssueViewContent(
            jiraIssueUrl,
            jiraIssueContent,
            extensionContext.extensionUri,
            panel.webview
          );
        } else {
          panel.webview.html = WebviewViewProvider.getNoJiraIssueViewContent();
        }
      } else if (selection === 'Browser') {
        vscode.env.openExternal(vscode.Uri.parse(jiraIssueUrl));
      }
    });
  }

  initStatusBarItem(): vscode.StatusBarItem {
    const statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    statusBarItem.command = STATUS_BAR_ITEM_ACTIVE;
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
