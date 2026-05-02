import * as vscode from 'vscode';

import { getJiraIssueUrl } from '../services/jira';
import Extension from './Extension';
import WebviewController from './webview/WebviewController';

const STATUS_BAR_ITEM_ACTIVE = 'jiralens.statusBarItemActive';
export { STATUS_BAR_ITEM_ACTIVE };

export default class StatusBarItemController {
  private static _instance: StatusBarItemController;
  private _statusBarItem: vscode.StatusBarItem;

  constructor() {
    this._statusBarItem = this.initStatusBarItem();
    Extension.getInstance()
      .getContext()
      .subscriptions.push(this.registerStatusBarItemActiveCommand());
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
        vscode.window.showErrorMessage(
          'No Jira issue found for the active line.'
        );
        return;
      }
      const jiraIssueKey = this._statusBarItem.text;
      const jiraIssueUrl = getJiraIssueUrl(jiraIssueKey);
      const selection = await vscode.window.showInformationMessage(
        `Open ${jiraIssueKey} in:`,
        'Tab',
        'Browser'
      );
      if (selection === 'Tab') {
        await WebviewController.getInstance().openInTab(jiraIssueKey);
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
