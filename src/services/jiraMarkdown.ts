import { defaultSchema } from '@atlaskit/adf-schema/schema-default';
import { WikiMarkupTransformer } from '@atlaskit/editor-wikimarkup-transformer';
import { JSDOM } from 'jsdom';
import { DOMSerializer } from 'prosemirror-model';
import TurndownService from 'turndown';

// Module-level singletons — all four objects are stateless across calls and
// safe to reuse in a single-threaded extension host process.
const _transformer = new WikiMarkupTransformer();
const _document = new JSDOM().window.document;
const _domSerializer = DOMSerializer.fromSchema(defaultSchema);
const _turndownService = new TurndownService();
_turndownService.addRule('strikethrough', {
  filter: ['del', 's'],
  replacement: (content) => '~' + content + '~'
});

const conversionFailureMessage =
  'Encountered an error while converting this Jira markdown to HTML for display. Kindly help us resolve this issue by reporting it <a href="https://github.com/JinZihang/vscode-jiralens/issues/23">here</a>.';

export function convertJiraMarkdownToHtml(
  markdown: string | null | undefined
): string {
  if (!markdown) {
    return '';
  }
  try {
    const pmNode = _transformer.parse(markdown);
    const target = _document.createElement('div');
    const html = _domSerializer.serializeFragment(
      pmNode.content,
      { document: _document },
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
    return _turndownService.turndown(html);
  } catch (error) {
    console.debug(
      'Failed to convert Jira markdown to normal markdown:',
      markdown,
      error
    );
    return 'Encountered an error while converting this Jira markdown to normal markdown for display. Kindly help us resolve this issue by reporting it [here](https://github.com/JinZihang/vscode-jiralens/issues/23).';
  }
}
