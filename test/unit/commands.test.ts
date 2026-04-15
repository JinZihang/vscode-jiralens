import { beforeEach, describe, expect, it, vi } from 'vitest';
import { commands, window } from 'vscode';

vi.mock('../../src/configs', () => ({
  getJiraHost: vi.fn().mockReturnValue('jira.example.com'),
  getJiraEmail: vi.fn().mockReturnValue(''),
  getJiraBearerToken: vi.fn().mockReturnValue('token'),
  getJiraProjectKeys: vi.fn().mockReturnValue([]),
  setJiraHost: vi.fn().mockResolvedValue(true),
  setJiraEmail: vi.fn().mockResolvedValue(true),
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
const {
  getJiraEmail,
  setJiraEmail,
  setJiraBearerToken,
  setShowInlineJiraIssueKey,
  setShowInlineCommitMessage
} = await import('../../src/configs');

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

describe('registerSetJiraEmailCommand', () => {
  beforeEach(() => {
    vi.mocked(setJiraEmail).mockClear();
  });

  it('calls setJiraEmail with the entered email', async () => {
    vi.mocked(window.showInputBox).mockResolvedValue('user@example.com' as any);
    await capturedCallbacks['jiralens.setJiraEmail']();
    expect(setJiraEmail).toHaveBeenCalledWith('user@example.com');
  });

  it('calls setJiraEmail with empty string to clear the email', async () => {
    vi.mocked(window.showInputBox).mockResolvedValue('' as any);
    await capturedCallbacks['jiralens.setJiraEmail']();
    expect(setJiraEmail).toHaveBeenCalledWith('');
  });

  it('does nothing when the user dismisses the input box', async () => {
    vi.mocked(window.showInputBox).mockResolvedValue(undefined as any);
    await capturedCallbacks['jiralens.setJiraEmail']();
    expect(setJiraEmail).not.toHaveBeenCalled();
  });
});

describe('registerSetJiraBearerTokenCommand', () => {
  beforeEach(() => {
    vi.mocked(setJiraBearerToken).mockClear();
    vi.mocked(getJiraEmail).mockReturnValue('');
  });

  it('uses the Server/DC prompt when email is not configured', async () => {
    vi.mocked(getJiraEmail).mockReturnValue('');
    vi.mocked(window.showInputBox).mockResolvedValue('my-pat' as any);
    await capturedCallbacks['jiralens.setJiraBearerToken']();
    expect(window.showInputBox).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('personal access token')
      })
    );
    expect(setJiraBearerToken).toHaveBeenCalledWith('my-pat');
  });

  it('uses the Cloud prompt when email is configured', async () => {
    vi.mocked(getJiraEmail).mockReturnValue('user@example.com');
    vi.mocked(window.showInputBox).mockResolvedValue('my-api-token' as any);
    await capturedCallbacks['jiralens.setJiraBearerToken']();
    expect(window.showInputBox).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('API token')
      })
    );
    expect(setJiraBearerToken).toHaveBeenCalledWith('my-api-token');
  });

  it('does nothing when the user dismisses the input box', async () => {
    vi.mocked(window.showInputBox).mockResolvedValue(undefined as any);
    await capturedCallbacks['jiralens.setJiraBearerToken']();
    expect(setJiraBearerToken).not.toHaveBeenCalled();
  });
});

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
