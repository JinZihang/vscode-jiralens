import { beforeEach, describe, expect, it, vi } from 'vitest';
import { workspace } from 'vscode';

import {
  getJiraProjectKeys,
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
