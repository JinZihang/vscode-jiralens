import * as vscode from 'vscode';

let wsConfig = vscode.workspace.getConfiguration('jiralens');

export function syncWorkspaceConfiguration(): void {
  wsConfig = vscode.workspace.getConfiguration('jiralens');
}

async function setConfig<T>(
  key: string,
  value: T,
  errorLabel: string
): Promise<boolean> {
  try {
    await wsConfig.update(key, value, vscode.ConfigurationTarget.Global);
    syncWorkspaceConfiguration();
    return true;
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to update ${errorLabel}: ${error}`);
    return false;
  }
}

// jiralens.jiraHost
export function getJiraHost(): string {
  return wsConfig.get<string>('jiraHost') || '';
}
export async function setJiraHost(host: string): Promise<boolean> {
  return setConfig('jiraHost', host, 'the Jira host');
}

// jiralens.jiraEmail
export function getJiraEmail(): string {
  return wsConfig.get<string>('jiraEmail') ?? '';
}
export async function setJiraEmail(email: string): Promise<boolean> {
  return setConfig('jiraEmail', email, 'the Jira email');
}

// jiralens.jiraBearerToken
export function getJiraBearerToken(): string {
  return wsConfig.get<string>('jiraBearerToken') ?? '';
}
export async function setJiraBearerToken(token: string): Promise<boolean> {
  return setConfig('jiraBearerToken', token, 'the Jira bearer token');
}

// jiralens.jiraProjectKeys
export function getJiraProjectKeys(): string[] {
  return wsConfig.get<string[]>('jiraProjectKeys') ?? [];
}
async function setJiraProjectKeys(keys: string[]): Promise<boolean> {
  return setConfig('jiraProjectKeys', keys, 'project keys');
}
export async function addJiraProjectKey(key: string): Promise<boolean> {
  const keys = getJiraProjectKeys();
  if (keys.includes(key)) {
    vscode.window.showWarningMessage('The project key to add already exists.');
    return false;
  }
  keys.push(key);
  return setJiraProjectKeys(keys);
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
  return setJiraProjectKeys(keys);
}

// jiralens.inlineCommitter
export function getShowInlineCommitter(): boolean {
  return wsConfig.get<boolean>('inlineCommitter') ?? true;
}
export async function setShowInlineCommitter(show: boolean): Promise<boolean> {
  return setConfig(
    'inlineCommitter',
    show,
    'the display setting for inline committer'
  );
}

// jiralens.inlineRelativeCommitTime
export function getShowInlineRelativeCommitTime(): boolean {
  return wsConfig.get<boolean>('inlineRelativeCommitTime') ?? true;
}
export async function setShowInlineRelativeCommitTime(
  show: boolean
): Promise<boolean> {
  return setConfig(
    'inlineRelativeCommitTime',
    show,
    'the display setting for inline relative commit time'
  );
}

// jiralens.inlineJiraIssueKey
export function getShowInlineJiraIssueKey(): boolean {
  return wsConfig.get<boolean>('inlineJiraIssueKey') ?? true;
}
export async function setShowInlineJiraIssueKey(
  show: boolean
): Promise<boolean> {
  return setConfig(
    'inlineJiraIssueKey',
    show,
    'the display setting for inline Jira issue key'
  );
}

// jiralens.inlineCommitMessage
export function getShowInlineCommitMessage(): boolean {
  return wsConfig.get<boolean>('inlineCommitMessage') ?? false;
}
export async function setShowInlineCommitMessage(
  show: boolean
): Promise<boolean> {
  return setConfig(
    'inlineCommitMessage',
    show,
    'the display setting for inline commit message'
  );
}

export function getMissingCoreConfigMessages(): string[] {
  const messages: string[] = [];
  if (!getJiraHost()) {
    messages.push('Jira Host (jiralens: Set the Jira Host)');
  }
  if (!getJiraBearerToken()) {
    messages.push(
      'API / Personal Access Token (jiralens: Set the API Token / Personal Access Token for Jira Authentication)'
    );
  }
  if (getJiraProjectKeys().length === 0) {
    messages.push('Jira Project Keys (jiralens: Add a Jira Project Key)');
  }
  return messages;
}
