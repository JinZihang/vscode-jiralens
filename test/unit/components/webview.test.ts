import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/configs', () => ({
  getMissingCoreConfigMessages: vi.fn().mockReturnValue([])
}));

vi.mock('../../../src/services/jira', () => ({
  fetchJiraIssue: vi.fn().mockResolvedValue(undefined),
  getJiraIssueUrl: vi
    .fn()
    .mockImplementation(
      (key: string) => `https://jira.example.com/browse/${key}`
    ),
  getJiraProfileUrl: vi.fn().mockReturnValue(''),
  getJiraQueryUrl: vi.fn().mockReturnValue('')
}));

vi.mock('../../../src/services/jiraMarkdown', () => ({
  convertJiraMarkdownToHtml: vi.fn().mockReturnValue('')
}));

vi.mock('../../../src/utils', () => ({
  getNonce: vi.fn().mockReturnValue('nonce')
}));

vi.mock('../../../src/components/Extension', () => ({
  default: {
    getInstance: vi.fn().mockReturnValue({
      getContext: vi.fn().mockReturnValue({
        extensionUri: { fsPath: '/test', scheme: 'file' } as any,
        subscriptions: { push: vi.fn() }
      })
    })
  }
}));

import WebviewController from '../../../src/components/webview/WebviewController';
import WebviewViewProvider from '../../../src/components/webview/WebviewViewProvider';
import { fetchJiraIssue } from '../../../src/services/jira';

const mockExtensionUri = { fsPath: '/test', scheme: 'file' } as any;

describe('WebviewViewProvider', () => {
  describe('setNoJiraIssueView', () => {
    it('resets the cached issue key to empty string', () => {
      const provider = new WebviewViewProvider(mockExtensionUri);
      provider.setJiraIssueView(
        'JRL-1',
        'https://jira.example.com/browse/JRL-1'
      );
      expect(provider.getJiraIssueKey()).toBe('JRL-1');

      provider.setNoJiraIssueView();

      expect(provider.getJiraIssueKey()).toBe('');
    });
  });
});

describe('WebviewController', () => {
  beforeEach(() => {
    vi.mocked(fetchJiraIssue).mockClear();
  });

  describe('renderWebview', () => {
    it('re-fetches the same issue after an intervening no-issue line', async () => {
      const controller = new WebviewController();

      await controller.renderWebview('JRL-1');
      expect(fetchJiraIssue).toHaveBeenCalledTimes(1);

      await controller.renderWebview('');
      expect(fetchJiraIssue).toHaveBeenCalledTimes(1);

      // Without the fix, this third call would skip the fetch because the
      // cached key still matched 'JRL-1' even though the webview was showing
      // the "no issue" screen.
      await controller.renderWebview('JRL-1');
      expect(fetchJiraIssue).toHaveBeenCalledTimes(2);
    });

    it('skips the fetch when the same issue is already displayed', async () => {
      const controller = new WebviewController();

      await controller.renderWebview('JRL-1');
      expect(fetchJiraIssue).toHaveBeenCalledTimes(1);

      await controller.renderWebview('JRL-1');
      expect(fetchJiraIssue).toHaveBeenCalledTimes(1);
    });
  });
});
