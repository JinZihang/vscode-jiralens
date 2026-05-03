import { beforeEach, describe, expect, it, vi } from 'vitest';
import { workspace } from 'vscode';

import {
  getJiraEmail,
  getJiraProjectKeys,
  getMissingCoreConfigMessages,
  getShowInlineCommitMessage,
  getShowInlineCommitter,
  getShowInlineJiraIssueKey,
  getShowInlineRelativeCommitTime,
  syncWorkspaceConfiguration
} from '../../src/configs';

// wsConfig in configs.ts is initialised at module load via workspace.getConfiguration().
// The mock always returns the same object, so we can reach its get() spy directly.
const mockGet = vi.mocked(workspace.getConfiguration('jiralens').get);

beforeEach(() => {
  mockGet.mockReset();
});

describe('getJiraEmail', () => {
  it('returns the configured email', () => {
    mockGet.mockReturnValue('user@example.com');
    syncWorkspaceConfiguration();
    expect(getJiraEmail()).toBe('user@example.com');
  });

  it('returns an empty string when the setting is undefined', () => {
    mockGet.mockReturnValue(undefined);
    syncWorkspaceConfiguration();
    expect(getJiraEmail()).toBe('');
  });
});

describe('getJiraProjectKeys', () => {
  it('returns the configured keys', () => {
    mockGet.mockReturnValue(['PROJ', 'ABC']);
    syncWorkspaceConfiguration();
    expect(getJiraProjectKeys()).toEqual(['PROJ', 'ABC']);
  });

  it('returns an empty array when the setting is undefined', () => {
    mockGet.mockReturnValue(undefined);
    syncWorkspaceConfiguration();
    expect(getJiraProjectKeys()).toEqual([]);
  });
});

describe('getShowInlineCommitter', () => {
  it('returns the configured value', () => {
    mockGet.mockReturnValue(false);
    syncWorkspaceConfiguration();
    expect(getShowInlineCommitter()).toBe(false);
  });

  it('returns true when the setting is undefined', () => {
    mockGet.mockReturnValue(undefined);
    syncWorkspaceConfiguration();
    expect(getShowInlineCommitter()).toBe(true);
  });
});

describe('getShowInlineRelativeCommitTime', () => {
  it('returns the configured value', () => {
    mockGet.mockReturnValue(false);
    syncWorkspaceConfiguration();
    expect(getShowInlineRelativeCommitTime()).toBe(false);
  });

  it('returns true when the setting is undefined', () => {
    mockGet.mockReturnValue(undefined);
    syncWorkspaceConfiguration();
    expect(getShowInlineRelativeCommitTime()).toBe(true);
  });
});

describe('getShowInlineJiraIssueKey', () => {
  it('returns the configured value', () => {
    mockGet.mockReturnValue(false);
    syncWorkspaceConfiguration();
    expect(getShowInlineJiraIssueKey()).toBe(false);
  });

  it('returns true when the setting is undefined', () => {
    mockGet.mockReturnValue(undefined);
    syncWorkspaceConfiguration();
    expect(getShowInlineJiraIssueKey()).toBe(true);
  });
});

describe('getShowInlineCommitMessage', () => {
  it('returns the configured value', () => {
    mockGet.mockReturnValue(true);
    syncWorkspaceConfiguration();
    expect(getShowInlineCommitMessage()).toBe(true);
  });

  it('returns false when the setting is undefined', () => {
    mockGet.mockReturnValue(undefined);
    syncWorkspaceConfiguration();
    expect(getShowInlineCommitMessage()).toBe(false);
  });
});

describe('getMissingCoreConfigMessages', () => {
  it('returns empty array when all core configs are set', () => {
    mockGet.mockImplementation((key: string) => {
      if (key === 'jiraHost') {
        return 'jira.example.com';
      }
      if (key === 'jiraBearerToken') {
        return 'mytoken';
      }
      if (key === 'jiraProjectKeys') {
        return ['PROJ'];
      }
    });
    syncWorkspaceConfiguration();
    expect(getMissingCoreConfigMessages()).toEqual([]);
  });

  it('reports missing jiraHost', () => {
    mockGet.mockImplementation((key: string) => {
      if (key === 'jiraHost') {
        return '';
      }
      if (key === 'jiraBearerToken') {
        return 'mytoken';
      }
      if (key === 'jiraProjectKeys') {
        return ['PROJ'];
      }
    });
    syncWorkspaceConfiguration();
    const result = getMissingCoreConfigMessages();
    expect(result).toHaveLength(1);
    expect(result[0]).toContain('Jira Host');
  });

  it('reports missing jiraBearerToken', () => {
    mockGet.mockImplementation((key: string) => {
      if (key === 'jiraHost') {
        return 'jira.example.com';
      }
      if (key === 'jiraBearerToken') {
        return '';
      }
      if (key === 'jiraProjectKeys') {
        return ['PROJ'];
      }
    });
    syncWorkspaceConfiguration();
    const result = getMissingCoreConfigMessages();
    expect(result).toHaveLength(1);
    expect(result[0]).toContain('API / Personal Access Token');
  });

  it('reports missing jiraProjectKeys when the array is empty', () => {
    mockGet.mockImplementation((key: string) => {
      if (key === 'jiraHost') {
        return 'jira.example.com';
      }
      if (key === 'jiraBearerToken') {
        return 'mytoken';
      }
      if (key === 'jiraProjectKeys') {
        return [];
      }
    });
    syncWorkspaceConfiguration();
    const result = getMissingCoreConfigMessages();
    expect(result).toHaveLength(1);
    expect(result[0]).toContain('Jira Project Keys');
  });

  it('reports all three when all core configs are missing', () => {
    mockGet.mockImplementation((key: string) => {
      if (key === 'jiraHost') {
        return '';
      }
      if (key === 'jiraBearerToken') {
        return '';
      }
      if (key === 'jiraProjectKeys') {
        return [];
      }
    });
    syncWorkspaceConfiguration();
    expect(getMissingCoreConfigMessages()).toHaveLength(3);
  });
});

describe('syncWorkspaceConfiguration', () => {
  it('updates the cache so getters reflect the new value without re-reading vsConfig', () => {
    mockGet.mockReturnValue('first@example.com');
    syncWorkspaceConfiguration();
    expect(getJiraEmail()).toBe('first@example.com');

    mockGet.mockReturnValue('second@example.com');
    // Cache is stale until sync is called
    expect(getJiraEmail()).toBe('first@example.com');

    syncWorkspaceConfiguration();
    expect(getJiraEmail()).toBe('second@example.com');
  });
});
