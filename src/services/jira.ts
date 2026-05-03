import {
  getJiraBearerToken,
  getJiraEmail,
  getJiraHost,
  getJiraProjectKeys
} from '../configs';
import { JiraIssue } from './jira.types';

export {
  convertJiraMarkdownToHtml,
  convertJiraMarkdownToNormalMarkdown
} from './jiraMarkdown';

export function isValidJiraProjectKey(key: string): boolean {
  const regex = /^[A-Z0-9]+$/;
  return regex.test(key);
}

// Compiled once per project key and reused across calls — getJiraIssueKey() is
// invoked on every cursor move, so avoiding repeated `new RegExp(...)` per key
// per keystroke is worthwhile. The map stays small: entries come only from the
// user-configured jiralens.jiraProjectKeys setting, never from unbounded input.
const _issueKeyRegexCache = new Map<string, RegExp>();

export function getJiraIssueKey(commitMessage: string): string {
  const projectKeys = getJiraProjectKeys();
  // Expect every commit message to contain only one Jira issue key
  for (const key of projectKeys) {
    // Examples: JRL-123, JRL12345
    let regex = _issueKeyRegexCache.get(key);
    if (!regex) {
      regex = new RegExp(`${key}-?\\d+`, 'g');
      _issueKeyRegexCache.set(key, regex);
    }
    const matches = commitMessage.match(regex);
    if (matches && matches.length > 0) {
      return matches[0];
    }
  }
  return '';
}

export function getJiraIssueUrl(jiraIssueKey: string): string {
  return `https://${getJiraHost()}/browse/${jiraIssueKey}`;
}

export function getJiraProfileUrl(name: string): string {
  return `https://${getJiraHost()}/secure/ViewProfile.jspa?name=${name}`;
}

export function getJiraQueryUrl(key: string, value: string): string {
  return `https://${getJiraHost()}/issues/?jql=${encodeURIComponent(`${key}="${value}"`)}`;
}

export async function fetchJiraIssue(
  jiraIssueKey: string
): Promise<JiraIssue | undefined> {
  const host = getJiraHost();
  const token = getJiraBearerToken();
  const email = getJiraEmail();
  const url = `https://${host}/rest/api/2/issue/${encodeURIComponent(jiraIssueKey)}?expand=&fields=*all&properties=*all&fieldsByKeys=false`;
  const authHeader = email
    ? `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`
    : `Bearer ${token}`;
  try {
    const response = await fetch(url, {
      headers: { Authorization: authHeader, Accept: 'application/json' }
    });
    if (!response.ok) {
      throw new Error(
        `Jira API error: ${response.status} ${response.statusText}`
      );
    }
    return (await response.json()) as JiraIssue;
  } catch (error) {
    console.error(`Failed to fetch Jira issue ${jiraIssueKey}:`, error);
    return undefined;
  }
}
