import { beforeEach, describe, expect, it, vi } from 'vitest';
import { workspace } from 'vscode';

import {
  getJiraEmail,
  getJiraProjectKeys,
  getMissingCoreConfigMessages,
  getShowInlineCommitMessage,
  getShowInlineCommitter,
  getShowInlineJiraIssueKey,
  getShowInlineRelativeCommitTime
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
    expect(getJiraEmail()).toBe('user@example.com');
  });

  it('returns an empty string when the setting is undefined', () => {
    mockGet.mockReturnValue(undefined);
    expect(getJiraEmail()).toBe('');
  });
});

describe('getJiraProjectKeys', () => {
  it('returns the configured keys', () => {
    mockGet.mockReturnValue(['PROJ', 'ABC']);
    expect(getJiraProjectKeys()).toEqual(['PROJ', 'ABC']);
  });

  it('returns an empty array when the setting is undefined', () => {
    mockGet.mockReturnValue(undefined);
    expect(getJiraProjectKeys()).toEqual([]);
  });
});

describe('getShowInlineCommitter', () => {
  it('returns the configured value', () => {
    mockGet.mockReturnValue(false);
    expect(getShowInlineCommitter()).toBe(false);
  });

  it('returns true when the setting is undefined', () => {
    mockGet.mockReturnValue(undefined);
    expect(getShowInlineCommitter()).toBe(true);
  });
});

describe('getShowInlineRelativeCommitTime', () => {
  it('returns the configured value', () => {
    mockGet.mockReturnValue(false);
    expect(getShowInlineRelativeCommitTime()).toBe(false);
  });

  it('returns true when the setting is undefined', () => {
    mockGet.mockReturnValue(undefined);
    expect(getShowInlineRelativeCommitTime()).toBe(true);
  });
});

describe('getShowInlineJiraIssueKey', () => {
  it('returns the configured value', () => {
    mockGet.mockReturnValue(false);
    expect(getShowInlineJiraIssueKey()).toBe(false);
  });

  it('returns true when the setting is undefined', () => {
    mockGet.mockReturnValue(undefined);
    expect(getShowInlineJiraIssueKey()).toBe(true);
  });
});

describe('getShowInlineCommitMessage', () => {
  it('returns the configured value', () => {
    mockGet.mockReturnValue(true);
    expect(getShowInlineCommitMessage()).toBe(true);
  });

  it('returns false when the setting is undefined', () => {
    mockGet.mockReturnValue(undefined);
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
    expect(getMissingCoreConfigMessages()).toHaveLength(3);
  });
});
