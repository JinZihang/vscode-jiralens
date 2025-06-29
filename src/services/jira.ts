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

export function getJiraIssueUrl(jiraIssueKey: string): string {
  return `https://${getJiraHost()}/browse/${jiraIssueKey}`;
}

export function getJiraProfileUrl(name: string): string {
  return `https://${getJiraHost()}/secure/ViewProfile.jspa?name=${name}`;
}

export function getJiraQueryUrl(key: string, value: string): string {
  return `https://${getJiraHost()}/issues/?jql=${encodeURIComponent(`${key}="${value}"`)}`;
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
  jiraIssueKey: string
): Promise<JiraApi.JsonResponse | undefined> {
  const jira = new JiraApi({
    protocol: 'https',
    host: getJiraHost(),
    apiVersion: '2',
    strictSSL: true,
    bearer: getJiraBearerToken()
  });
  const issueContent = await jira.findIssue(jiraIssueKey);
  return issueContent;
}

const conversionFailureMessage =
  'Encountered an error while converting this Jira markdown to HTML for display. Kindly help us resolve this issue by reporting it <a href="https://github.com/JinZihang/vscode-jiralens/issues/23">here</a>.';

export function convertJiraMarkdownToHtml(markdown: string): string {
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

export function convertJiraMarkdownToNormalMarkdown(markdown: string): string {
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
