import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/services/jira', () => ({
  getJiraIssueUrl: vi
    .fn()
    .mockReturnValue('https://jira.example.com/browse/KEY-1')
}));

vi.mock('../../../src/components/Extension', () => ({
  default: {
    getInstance: vi.fn().mockReturnValue({
      getContext: vi.fn().mockReturnValue({
        subscriptions: { push: vi.fn() }
      })
    })
  }
}));

import * as vscode from 'vscode';

import StatusBarItemController from '../../../src/components/StatusBarItemController';

describe('StatusBarItemController', () => {
  let mockItem: {
    text: string;
    show: ReturnType<typeof vi.fn>;
    hide: ReturnType<typeof vi.fn>;
  };
  let controller: StatusBarItemController;

  beforeEach(() => {
    vi.clearAllMocks();
    mockItem = { text: '', show: vi.fn(), hide: vi.fn() };
    vi.mocked(vscode.window.createStatusBarItem).mockReturnValue(
      mockItem as any
    );
    controller = new StatusBarItemController();
  });

  describe('renderStatusBarItem', () => {
    it('shows the item with the given key', () => {
      controller.renderStatusBarItem('KEY-1');

      expect(mockItem.text).toBe('KEY-1');
      expect(mockItem.show).toHaveBeenCalledTimes(1);
    });

    it('skips update when called again with the same key', () => {
      controller.renderStatusBarItem('KEY-1');
      controller.renderStatusBarItem('KEY-1');
      controller.renderStatusBarItem('KEY-1');

      expect(mockItem.show).toHaveBeenCalledTimes(1);
    });

    it('updates when the key changes', () => {
      controller.renderStatusBarItem('KEY-1');
      controller.renderStatusBarItem('KEY-2');

      expect(mockItem.text).toBe('KEY-2');
      expect(mockItem.show).toHaveBeenCalledTimes(2);
    });

    it('hides when called with an empty key', () => {
      controller.renderStatusBarItem('KEY-1');
      controller.renderStatusBarItem('');

      expect(mockItem.hide).toHaveBeenCalledTimes(1);
      expect(mockItem.show).toHaveBeenCalledTimes(1);
    });

    it('shows again with the same key after an intervening hide via empty key', async () => {
      controller.renderStatusBarItem('KEY-1');
      controller.renderStatusBarItem('');
      controller.renderStatusBarItem('KEY-1');

      expect(mockItem.show).toHaveBeenCalledTimes(2);
    });
  });

  describe('hideStatusBarItem', () => {
    it('hides the item', () => {
      controller.hideStatusBarItem();

      expect(mockItem.hide).toHaveBeenCalledTimes(1);
    });

    it('allows the same key to be shown again after a direct hide call', () => {
      controller.renderStatusBarItem('KEY-1');
      controller.hideStatusBarItem();
      controller.renderStatusBarItem('KEY-1');

      expect(mockItem.show).toHaveBeenCalledTimes(2);
    });
  });
});
