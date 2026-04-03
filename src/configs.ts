import * as vscode from 'vscode';

let wsConfig = vscode.workspace.getConfiguration('jiralens');

export function syncWorkspaceConfiguration(): void {
  wsConfig = vscode.workspace.getConfiguration('jiralens');
}

// jiralens.jiraHost
export function getJiraHost(): string {
  return wsConfig.get<string>('jiraHost') || '';
}
export async function setJiraHost(host: string): Promise<boolean> {
  try {
    await wsConfig.update('jiraHost', host, vscode.ConfigurationTarget.Global);
    syncWorkspaceConfiguration();
    return true;
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to update the Jira host: ${error}`);
    return false;
  }
}

// jiralens.jiraEmail
export function getJiraEmail(): string {
  return wsConfig.get<string>('jiraEmail') ?? '';
}
export async function setJiraEmail(email: string): Promise<boolean> {
  try {
    await wsConfig.update(
      'jiraEmail',
      email,
      vscode.ConfigurationTarget.Global
    );
    syncWorkspaceConfiguration();
    return true;
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to update the Jira email: ${error}`);
    return false;
  }
}

// jiralens.jiraBearerToken
export function getJiraBearerToken(): string {
  return wsConfig.get<string>('jiraBearerToken') ?? '';
}
export async function setJiraBearerToken(token: string): Promise<boolean> {
  try {
    await wsConfig.update(
      'jiraBearerToken',
      token,
      vscode.ConfigurationTarget.Global
    );
    syncWorkspaceConfiguration();
    return true;
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to update the Jira bearer token: ${error}`
    );
    return false;
  }
}

// jiralens.jiraProjectKeys
export function getJiraProjectKeys(): string[] {
  const keys = wsConfig.get<string[]>('jiraProjectKeys') ?? [];
  return keys;
}
async function setJiraProjectKeys(keys: string[]): Promise<boolean> {
  try {
    await wsConfig.update(
      'jiraProjectKeys',
      keys,
      vscode.ConfigurationTarget.Global
    );
    syncWorkspaceConfiguration();
    return true;
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to update project keys: ${error}`);
    return false;
  }
}
export async function addJiraProjectKey(key: string): Promise<boolean> {
  const keys = getJiraProjectKeys();
  if (keys.includes(key)) {
    vscode.window.showWarningMessage('The project key to add already exists.');
    return false;
  }
  keys.push(key);
  return await setJiraProjectKeys(keys);
}
export async function deleteJiraProjectKey(key: string): Promise<boolean> {
  const keys = getJiraProjectKeys();
  if (!keys.includes(key)) {
    vscode.window.showWarningMessage(
      'The project key to delete does not exist.'
    );
    return false;
  }
  const index = keys.indexOf(key);
  keys.splice(index, 1);
  return await setJiraProjectKeys(keys);
}

// jiralens.inlineCommitter
export function getShowInlineCommitter(): boolean {
  return wsConfig.get<boolean>('inlineCommitter') ?? true;
}
export async function setShowInlineCommitter(show: boolean): Promise<boolean> {
  try {
    await wsConfig.update(
      'inlineCommitter',
      show,
      vscode.ConfigurationTarget.Global
    );
    syncWorkspaceConfiguration();
    return true;
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to update the display setting for inline committer: ${error}`
    );
    return false;
  }
}

// jiralens.inlineRelativeCommitTime
export function getShowInlineRelativeCommitTime(): boolean {
  return wsConfig.get<boolean>('inlineRelativeCommitTime') ?? true;
}
export async function setShowInlineRelativeCommitTime(
  show: boolean
): Promise<boolean> {
  try {
    await wsConfig.update(
      'inlineRelativeCommitTime',
      show,
      vscode.ConfigurationTarget.Global
    );
    syncWorkspaceConfiguration();
    return true;
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to update the display setting for inline relative commit time: ${error}`
    );
    return false;
  }
}

// jiralens.inlineJiraIssueKey
export function getShowInlineJiraIssueKey(): boolean {
  return wsConfig.get<boolean>('inlineJiraIssueKey') ?? true;
}
export async function setShowInlineJiraIssueKey(
  show: boolean
): Promise<boolean> {
  try {
    await wsConfig.update(
      'inlineJiraIssueKey',
      show,
      vscode.ConfigurationTarget.Global
    );
    syncWorkspaceConfiguration();
    return true;
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to update the display setting for inline Jira issue key: ${error}`
    );
    return false;
  }
}

// jiralens.inlineCommitMessage
export function getShowInlineCommitMessage(): boolean {
  return wsConfig.get<boolean>('inlineCommitMessage') ?? false;
}
export async function setShowInlineCommitMessage(
  show: boolean
): Promise<boolean> {
  try {
    await wsConfig.update(
      'inlineCommitMessage',
      show,
      vscode.ConfigurationTarget.Global
    );
    syncWorkspaceConfiguration();
    return true;
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to update the display setting for inline commit message: ${error}`
    );
    return false;
  }
}
