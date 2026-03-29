import { beforeEach, describe, expect, it, vi } from 'vitest';
import { commands, window } from 'vscode';

vi.mock('../../src/configs', () => ({
  getJiraHost: vi.fn().mockReturnValue('jira.example.com'),
  getJiraBearerToken: vi.fn().mockReturnValue('token'),
  getJiraProjectKeys: vi.fn().mockReturnValue([]),
  setJiraHost: vi.fn().mockResolvedValue(true),
  setJiraBearerToken: vi.fn().mockResolvedValue(true),
  addJiraProjectKey: vi.fn().mockResolvedValue(true),
  deleteJiraProjectKey: vi.fn().mockResolvedValue(true),
  setShowInlineCommitter: vi.fn().mockResolvedValue(true),
  setShowInlineRelativeCommitTime: vi.fn().mockResolvedValue(true),
  setShowInlineJiraIssueKey: vi.fn().mockResolvedValue(true),
  setShowInlineCommitMessage: vi.fn().mockResolvedValue(true)
}));

vi.mock('../../src/services/jira', () => ({
  isValidJiraBearerToken: vi.fn().mockReturnValue(true),
  isValidJiraProjectKey: vi.fn().mockReturnValue(true)
}));

vi.mock('../../src/utils', () => ({
  isValidUrl: vi.fn().mockReturnValue(true)
}));

// Import after mocks are set up
const { default: registerCommands } = await import('../../src/commands');
const { setShowInlineJiraIssueKey, setShowInlineCommitMessage } = await import(
  '../../src/configs'
);

const mockContext = { subscriptions: { push: vi.fn() } } as any;

// Capture command callbacks by ID when registerCommands is called
const capturedCallbacks: Record<string, () => Promise<void>> = {};
vi.mocked(commands.registerCommand).mockImplementation(
  (id: string, cb: any) => {
    capturedCallbacks[id] = cb;
    return { dispose: vi.fn() };
  }
);

registerCommands(mockContext);

describe('registerSetShowJiraIssueKeyCommand', () => {
  beforeEach(() => {
    vi.mocked(setShowInlineJiraIssueKey).mockClear();
    vi.mocked(setShowInlineCommitMessage).mockClear();
  });

  it('calls setShowInlineJiraIssueKey(true) when user picks Yes', async () => {
    vi.mocked(window.showQuickPick).mockResolvedValue('Yes' as any);
    await capturedCallbacks['jiralens.setShowJiraIssueKey']();
    expect(setShowInlineJiraIssueKey).toHaveBeenCalledWith(true);
    expect(setShowInlineCommitMessage).not.toHaveBeenCalled();
  });

  it('calls setShowInlineJiraIssueKey(false) when user picks No', async () => {
    vi.mocked(window.showQuickPick).mockResolvedValue('No' as any);
    await capturedCallbacks['jiralens.setShowJiraIssueKey']();
    expect(setShowInlineJiraIssueKey).toHaveBeenCalledWith(false);
    expect(setShowInlineCommitMessage).not.toHaveBeenCalled();
  });

  it('does nothing when the user dismisses the picker', async () => {
    vi.mocked(window.showQuickPick).mockResolvedValue(undefined as any);
    await capturedCallbacks['jiralens.setShowJiraIssueKey']();
    expect(setShowInlineJiraIssueKey).not.toHaveBeenCalled();
  });
});
