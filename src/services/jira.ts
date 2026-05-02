import { defaultSchema } from '@atlaskit/adf-schema/schema-default';
import { WikiMarkupTransformer } from '@atlaskit/editor-wikimarkup-transformer';
import { JSDOM } from 'jsdom';
import { DOMSerializer } from 'prosemirror-model';
import TurndownService from 'turndown';

import {
  getJiraBearerToken,
  getJiraEmail,
  getJiraHost,
  getJiraProjectKeys
} from '../configs';
import { JiraIssue } from './jira.types';

export function isValidJiraProjectKey(key: string): boolean {
  const regex = /^[A-Z0-9]+$/;
  return regex.test(key);
}

export function getJiraIssueKey(commitMessage: string): string {
  const projectKeys = getJiraProjectKeys();
  // Expect every commit message to contain only one Jira issue key
  for (const key of projectKeys) {
    // Examples: JRL-123, JRL12345
    const regex = new RegExp(`${key}-?\\d+`, 'g');
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

const conversionFailureMessage =
  'Encountered an error while converting this Jira markdown to HTML for display. Kindly help us resolve this issue by reporting it <a href="https://github.com/JinZihang/vscode-jiralens/issues/23">here</a>.';

export function convertJiraMarkdownToHtml(
  markdown: string | null | undefined
): string {
  if (!markdown) {
    return '';
  }
  try {
    const transformer = new WikiMarkupTransformer();
    const pmNode = transformer.parse(markdown);
    const dom = new JSDOM();
    const document = dom.window.document;
    const target = document.createElement('div');
    const html = DOMSerializer.fromSchema(defaultSchema).serializeFragment(
      pmNode.content,
      { document },
      target
    ) as HTMLElement;
    return html.outerHTML;
  } catch (error) {
    console.debug('Failed to convert Jira markdown to HTML:', markdown, error);
    return conversionFailureMessage;
  }
}

export function convertJiraMarkdownToNormalMarkdown(
  markdown: string | null | undefined
): string {
  try {
    const html = convertJiraMarkdownToHtml(markdown);
    if (html === conversionFailureMessage) {
      return 'Encountered an error while converting this Jira markdown to HTML for display. Kindly help us resolve this issue by reporting it [here](https://github.com/JinZihang/vscode-jiralens/issues/23).';
    }
    const turndownService = new TurndownService();
    turndownService.addRule('strikethrough', {
      filter: ['del', 's'],
      replacement: (content) => '~' + content + '~'
    });
    return turndownService.turndown(html);
  } catch (error) {
    console.debug(
      'Failed to convert Jira markdown to normal markdown:',
      markdown,
      error
    );
    return 'Encountered an error while converting this Jira markdown to normal markdown for display. Kindly help us resolve this issue by reporting it [here](https://github.com/JinZihang/vscode-jiralens/issues/23).';
  }
}
