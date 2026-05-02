import { defaultSchema } from '@atlaskit/adf-schema/schema-default';
import { WikiMarkupTransformer } from '@atlaskit/editor-wikimarkup-transformer';
import { JSDOM } from 'jsdom';
import { DOMSerializer } from 'prosemirror-model';
import TurndownService from 'turndown';

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
