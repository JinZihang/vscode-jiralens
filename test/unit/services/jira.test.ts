import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the configs module so jira.ts pure functions can be tested in isolation
vi.mock('../../../src/configs', () => ({
  getJiraHost: vi.fn().mockReturnValue('jira.example.com'),
  getJiraProjectKeys: vi.fn().mockReturnValue(['JRL', 'ABC']),
  getJiraBearerToken: vi.fn().mockReturnValue('test-token')
}));

const { MockJiraApi, mockFindIssue } = vi.hoisted(() => {
  const mockFindIssue = vi.fn();
  const MockJiraApi = vi.fn(function () {
    return { findIssue: mockFindIssue };
  });
  return { MockJiraApi, mockFindIssue };
});
vi.mock('jira-client', () => ({ default: MockJiraApi }));

import { getJiraHost, getJiraProjectKeys } from '../../../src/configs';
import {
  convertJiraMarkdownToHtml,
  convertJiraMarkdownToNormalMarkdown,
  getJiraIssueContent,
  getJiraIssueKey,
  getJiraIssueUrl,
  getJiraProfileUrl,
  getJiraQueryUrl,
  isValidJiraBearerToken,
  isValidJiraProjectKey
} from '../../../src/services/jira';
import mockIssue1 from '../../data/mock_jira_issue_content_1.json';
import mockIssue2 from '../../data/mock_jira_issue_content_2.json';

describe('isValidJiraProjectKey', () => {
  it('returns true for an all-uppercase alphabetic key', () => {
    expect(isValidJiraProjectKey('JRL')).toBe(true);
  });

  it('returns true for an uppercase alphanumeric key', () => {
    expect(isValidJiraProjectKey('ABC123')).toBe(true);
  });

  it('returns false for a lowercase key', () => {
    expect(isValidJiraProjectKey('jrl')).toBe(false);
  });

  it('returns false for a mixed-case key', () => {
    expect(isValidJiraProjectKey('Jrl')).toBe(false);
  });

  it('returns false for a key with a hyphen', () => {
    expect(isValidJiraProjectKey('JRL-123')).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isValidJiraProjectKey('')).toBe(false);
  });

  it('returns false for a key with special characters', () => {
    expect(isValidJiraProjectKey('JRL_1')).toBe(false);
  });
});

describe('getJiraIssueKey', () => {
  beforeEach(() => {
    vi.mocked(getJiraProjectKeys).mockReturnValue(['JRL', 'ABC']);
  });

  it('extracts a key in the JRL-123 format', () => {
    expect(getJiraIssueKey('fix: resolve crash JRL-456 in login flow')).toBe(
      'JRL-456'
    );
  });

  it('extracts a key in the JRL123 format (no hyphen)', () => {
    expect(getJiraIssueKey('feat: JRL789 add dark mode')).toBe('JRL789');
  });

  it('extracts the first key when multiple project keys are configured', () => {
    // 'JRL' is first in the list, so its match is returned
    expect(getJiraIssueKey('feat: JRL-1 and ABC-2')).toBe('JRL-1');
  });

  it('returns an empty string when no configured project key is present', () => {
    expect(getJiraIssueKey('chore: bump dependencies')).toBe('');
  });

  it('returns an empty string for an empty commit message', () => {
    expect(getJiraIssueKey('')).toBe('');
  });

  it('does not match a project key that is not in the configured list', () => {
    expect(getJiraIssueKey('fix: XYZ-999 unrelated project')).toBe('');
  });
});

describe('getJiraIssueUrl', () => {
  beforeEach(() => {
    vi.mocked(getJiraHost).mockReturnValue('jira.example.com');
  });

  it('builds the correct browse URL for a given issue key', () => {
    expect(getJiraIssueUrl('JRL-123')).toBe(
      'https://jira.example.com/browse/JRL-123'
    );
  });
});

describe('getJiraProfileUrl', () => {
  beforeEach(() => {
    vi.mocked(getJiraHost).mockReturnValue('jira.example.com');
  });

  it('builds the correct profile URL for a given username', () => {
    expect(getJiraProfileUrl('jinz')).toBe(
      'https://jira.example.com/secure/ViewProfile.jspa?name=jinz'
    );
  });
});

describe('getJiraQueryUrl', () => {
  beforeEach(() => {
    vi.mocked(getJiraHost).mockReturnValue('jira.example.com');
  });

  it('builds a JQL query URL with the key-value pair encoded', () => {
    const url = getJiraQueryUrl('assignee', 'jinz');
    expect(url).toBe(
      `https://jira.example.com/issues/?jql=${encodeURIComponent('assignee="jinz"')}`
    );
  });

  it('encodes special characters in the JQL value', () => {
    const url = getJiraQueryUrl('summary', 'hello world');
    expect(url).toContain(encodeURIComponent('summary="hello world"'));
  });
});

describe('convertJiraMarkdownToHtml', () => {
  it('returns a non-empty string for plain text', () => {
    const result = convertJiraMarkdownToHtml('Hello world');
    expect(result).toBeTruthy();
    expect(result).toContain('Hello world');
  });

  it('converts bold wiki markup (*text*) to <strong>', () => {
    const result = convertJiraMarkdownToHtml('*bold text*');
    expect(result).toContain('<strong>');
    expect(result).toContain('bold text');
  });

  it('converts italic wiki markup (_text_) to <em>', () => {
    const result = convertJiraMarkdownToHtml('_italic text_');
    expect(result).toContain('<em>');
    expect(result).toContain('italic text');
  });

  it('converts h1 heading to an <h1> element', () => {
    const result = convertJiraMarkdownToHtml('h1. My Heading');
    expect(result).toContain('<h1');
    expect(result).toContain('My Heading');
  });

  it('converts h2 heading to an <h2> element', () => {
    const result = convertJiraMarkdownToHtml('h2. Sub Heading');
    expect(result).toContain('<h2');
    expect(result).toContain('Sub Heading');
  });

  it('converts an unordered list item to a <li> element', () => {
    const result = convertJiraMarkdownToHtml('* list item');
    expect(result).toContain('<li>');
    expect(result).toContain('list item');
  });

  it('returns the failure anchor link on conversion error', () => {
    // Spy on the transformer to force a throw, then verify the fallback message
    const transformer = require('@atlaskit/editor-wikimarkup-transformer');
    const original = transformer.WikiMarkupTransformer;
    transformer.WikiMarkupTransformer = class {
      parse() {
        throw new Error('forced failure');
      }
    };
    const result = convertJiraMarkdownToHtml('any input');
    expect(result).toContain('issues/23');
    transformer.WikiMarkupTransformer = original;
  });
});

describe('isValidJiraBearerToken', () => {
  it('returns true when JiraApi constructs without throwing', () => {
    MockJiraApi.mockImplementation(function () {
      return { findIssue: mockFindIssue };
    });
    expect(isValidJiraBearerToken('valid-token')).toBe(true);
  });

  it('returns true for an empty string token (no validation beyond construction)', () => {
    MockJiraApi.mockImplementation(function () {
      return { findIssue: mockFindIssue };
    });
    expect(isValidJiraBearerToken('')).toBe(true);
  });

  it('returns false when JiraApi constructor throws', () => {
    MockJiraApi.mockImplementation(function () {
      throw new Error('invalid config');
    });
    expect(isValidJiraBearerToken('bad-token')).toBe(false);
  });
});

describe('getJiraIssueContent', () => {
  beforeEach(() => {
    MockJiraApi.mockImplementation(function () {
      return { findIssue: mockFindIssue };
    });
  });

  it('returns the issue data resolved by findIssue', async () => {
    mockFindIssue.mockResolvedValue(mockIssue1);
    const result = await getJiraIssueContent('JRL-001');
    expect(result).toEqual(mockIssue1);
    expect(mockFindIssue).toHaveBeenCalledWith('JRL-001');
  });

  it('uses a different issue fixture and passes the key through', async () => {
    mockFindIssue.mockResolvedValue(mockIssue2);
    const result = await getJiraIssueContent('JRL-321');
    expect(result).toEqual(mockIssue2);
    expect(mockFindIssue).toHaveBeenCalledWith('JRL-321');
  });

  it('constructs JiraApi with the host and token from config', async () => {
    mockFindIssue.mockResolvedValue(mockIssue1);
    await getJiraIssueContent('JRL-001');
    expect(MockJiraApi).toHaveBeenCalledWith(
      expect.objectContaining({
        protocol: 'https',
        host: 'jira.example.com',
        apiVersion: '2',
        bearer: 'test-token'
      })
    );
  });

  it('propagates errors thrown by findIssue', async () => {
    mockFindIssue.mockRejectedValue(new Error('network failure'));
    await expect(getJiraIssueContent('JRL-001')).rejects.toThrow(
      'network failure'
    );
  });
});

describe('convertJiraMarkdownToNormalMarkdown', () => {
  it('converts bold wiki markup to **bold**', () => {
    const result = convertJiraMarkdownToNormalMarkdown('*bold text*');
    expect(result).toContain('**bold text**');
  });

  it('converts italic wiki markup to _italic_', () => {
    const result = convertJiraMarkdownToNormalMarkdown('_italic text_');
    expect(result).toContain('_italic text_');
  });

  it('converts an h1 heading to a markdown heading', () => {
    const result = convertJiraMarkdownToNormalMarkdown('h1. My Heading');
    // Turndown uses setext style for h1: "My Heading\n=========="
    expect(result).toContain('My Heading');
    expect(result).toMatch(/My Heading\n=+/);
  });

  it('converts a Jira link [text|url] to a markdown link', () => {
    const result = convertJiraMarkdownToNormalMarkdown(
      '[JiraLens|https://github.com/JinZihang/vscode-jiralens]'
    );
    expect(result).toContain(
      '[JiraLens](https://github.com/JinZihang/vscode-jiralens)'
    );
  });

  it('passes plain text through unchanged', () => {
    const result = convertJiraMarkdownToNormalMarkdown('Just plain text');
    expect(result).toContain('Just plain text');
  });

  it('returns the markdown error link on conversion failure', () => {
    const transformer = require('@atlaskit/editor-wikimarkup-transformer');
    const original = transformer.WikiMarkupTransformer;
    transformer.WikiMarkupTransformer = class {
      parse() {
        throw new Error('forced failure');
      }
    };
    const result = convertJiraMarkdownToNormalMarkdown('any input');
    expect(result).toContain(
      '[here](https://github.com/JinZihang/vscode-jiralens/issues/23)'
    );
    transformer.WikiMarkupTransformer = original;
  });
});
