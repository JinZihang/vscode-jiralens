import JiraApi from 'jira-client';
import { DOMSerializer } from 'prosemirror-model';
import { defaultSchema } from '@atlaskit/adf-schema/schema-default';
import { WikiMarkupTransformer } from '@atlaskit/editor-wikimarkup-transformer';
import { JSDOM } from 'jsdom';
import TurndownService from 'turndown';
import {
  getJiraBearerToken,
  getJiraHost,
  getJiraProjectKeys
} from '../configs';

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

export function getJiraIssueLink(issueKey: string): string {
  return `https://${getJiraHost()}/browse/${issueKey}`;
}

export function isValidJiraBearerToken(token: string): boolean {
  try {
    // The validation approach here is not tested yet
    new JiraApi({
      protocol: 'https',
      host: getJiraHost(),
      apiVersion: '2',
      strictSSL: true,
      bearer: token
    });
    return true;
  } catch (error) {
    return false;
  }
}

export async function getJiraIssueContent(
  issueKey: string
): Promise<JiraApi.JsonResponse | undefined> {
  const jira = new JiraApi({
    protocol: 'https',
    host: getJiraHost(),
    apiVersion: '2',
    strictSSL: true,
    bearer: getJiraBearerToken()
  });
  const issueContent = await jira.findIssue(issueKey);
  return issueContent;
}

export function convertJiraMarkdownToHtml(markdown: string): string {
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
}

export function convertJiraMarkdownToNormalMarkdown(markdown: string): string {
  const html = convertJiraMarkdownToHtml(markdown);
  const turndownService = new TurndownService();
  turndownService.addRule('strikethrough', {
    filter: ['del', 's'],
    replacement: (content) => '~' + content + '~'
  });
  return turndownService.turndown(html);
}
