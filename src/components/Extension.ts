import * as vscode from 'vscode';

export default class Extension {
  private static _instance: Extension;
  private _context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this._context = context;
    Extension._instance = this;
  }

  static getInstance(): Extension {
    if (!Extension._instance) {
      throw new Error('The Extension instance has not been initialized yet.');
    }
    return Extension._instance;
  }

  getContext(): vscode.ExtensionContext {
    return this._context;
  }
}
