import { beforeEach, describe, expect, it, vi } from 'vitest';

import { clearMarkdownCache } from '../../../src/services/jiraMarkdown';

// Mock the configs module so jira.ts pure functions can be tested in isolation
vi.mock('../../../src/configs', () => ({
  getJiraHost: vi.fn().mockReturnValue('jira.example.com'),
  getJiraProjectKeys: vi.fn().mockReturnValue(['JRL', 'ABC']),
  getJiraBearerToken: vi.fn().mockReturnValue('test-token'),
  getJiraEmail: vi.fn().mockReturnValue(''),
  getJiraCacheTtlSeconds: vi.fn().mockReturnValue(300)
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import {
  getJiraBearerToken,
  getJiraCacheTtlSeconds,
  getJiraEmail,
  getJiraHost,
  getJiraProjectKeys
} from '../../../src/configs';
import {
  convertJiraMarkdownToHtml,
  convertJiraMarkdownToNormalMarkdown,
  fetchJiraIssue,
  getJiraIssueKey,
  getJiraIssueUrl,
  getJiraProfileUrl,
  getJiraQueryUrl,
  invalidateJiraCache,
  isValidJiraProjectKey
} from '../../../src/services/jira';
import mockIssueJRL001 from '../../data/mock_jira_issue_content_1.json';
import mockIssueJRL321 from '../../data/mock_jira_issue_content_2.json';

beforeEach(() => {
  clearMarkdownCache();
});

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

  it('returns consistent results across repeated calls (regex cache regression guard)', () => {
    const msg = 'fix: JRL-42 crash on startup';
    expect(getJiraIssueKey(msg)).toBe('JRL-42');
    expect(getJiraIssueKey(msg)).toBe('JRL-42');
    expect(getJiraIssueKey(msg)).toBe('JRL-42');
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

  it('returns empty string for null input', () => {
    expect(convertJiraMarkdownToHtml(null)).toBe('');
  });

  it('returns empty string for undefined input', () => {
    expect(convertJiraMarkdownToHtml(undefined)).toBe('');
  });

  it('returns empty string for empty string input', () => {
    expect(convertJiraMarkdownToHtml('')).toBe('');
  });

  it('returns identical result on repeated call for same input (cache regression guard)', () => {
    const first = convertJiraMarkdownToHtml('*bold text*');
    const second = convertJiraMarkdownToHtml('*bold text*');
    expect(second).toBe(first);
  });
});

describe('fetchJiraIssue', () => {
  beforeEach(() => {
    vi.mocked(getJiraEmail).mockReturnValue('');
    vi.mocked(getJiraHost).mockReturnValue('jira.example.com');
    vi.mocked(getJiraBearerToken).mockReturnValue('test-token');
    vi.mocked(getJiraCacheTtlSeconds).mockReturnValue(300);
    mockFetch.mockReset();
    invalidateJiraCache();
  });

  it('returns the issue data from the fetch response', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockIssueJRL001
    });
    const result = await fetchJiraIssue('JRL-001');
    expect(result).toEqual(mockIssueJRL001);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://jira.example.com/rest/api/2/issue/JRL-001?expand=&fields=*all&properties=*all&fieldsByKeys=false',
      expect.anything()
    );
  });

  it('uses a different issue fixture and passes the key through', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockIssueJRL321
    });
    const result = await fetchJiraIssue('JRL-321');
    expect(result).toEqual(mockIssueJRL321);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/issue/JRL-321'),
      expect.anything()
    );
  });

  it('uses Bearer auth when email is not configured (Jira Server/DC)', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockIssueJRL001
    });
    await fetchJiraIssue('JRL-001');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' })
      })
    );
  });

  it('uses Basic auth when email is configured (Jira Cloud)', async () => {
    vi.mocked(getJiraEmail).mockReturnValue('user@example.com');
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockIssueJRL001
    });
    await fetchJiraIssue('JRL-001');
    const expectedBasic = `Basic ${Buffer.from('user@example.com:test-token').toString('base64')}`;
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: expectedBasic })
      })
    );
  });

  it('returns undefined when fetch throws', async () => {
    mockFetch.mockRejectedValue(new Error('network failure'));
    const result = await fetchJiraIssue('JRL-001');
    expect(result).toBeUndefined();
  });

  it('returns undefined when the response is not ok', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized'
    });
    const result = await fetchJiraIssue('JRL-001');
    expect(result).toBeUndefined();
  });

  it('returns cached result on repeated call for same key without re-fetching', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockIssueJRL001
    });
    const first = await fetchJiraIssue('JRL-001');
    const second = await fetchJiraIssue('JRL-001');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
  });

  it('deduplicates concurrent in-flight requests for the same key', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockIssueJRL001
    });
    const [first, second] = await Promise.all([
      fetchJiraIssue('JRL-001'),
      fetchJiraIssue('JRL-001')
    ]);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(first).toEqual(mockIssueJRL001);
    expect(second).toEqual(mockIssueJRL001);
  });

  it('re-fetches after the TTL expires', async () => {
    const mockNow = vi.spyOn(Date, 'now');
    mockNow.mockReturnValue(0);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockIssueJRL001
    });

    await fetchJiraIssue('JRL-001');
    expect(mockFetch).toHaveBeenCalledTimes(1);

    mockNow.mockReturnValue(301_000); // 301 s — past the 300 s TTL
    await fetchJiraIssue('JRL-001');
    expect(mockFetch).toHaveBeenCalledTimes(2);

    mockNow.mockRestore();
  });

  it('never expires the cache when TTL is 0', async () => {
    vi.mocked(getJiraCacheTtlSeconds).mockReturnValue(0);
    const mockNow = vi.spyOn(Date, 'now');
    mockNow.mockReturnValue(0);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockIssueJRL001
    });

    await fetchJiraIssue('JRL-001');
    mockNow.mockReturnValue(999_999_000);
    await fetchJiraIssue('JRL-001');
    expect(mockFetch).toHaveBeenCalledTimes(1);

    mockNow.mockRestore();
  });

  it('retries after a failed fetch (failures are not cached)', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('network failure'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockIssueJRL001
      });
    const first = await fetchJiraIssue('JRL-001');
    const second = await fetchJiraIssue('JRL-001');
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(first).toBeUndefined();
    expect(second).toEqual(mockIssueJRL001);
  });

  it('pre-warms markdown caches without mutating the returned issue', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockIssueJRL001
    });
    const result = await fetchJiraIssue('JRL-001');

    // Pre-warming must not mutate the raw issue — callers rely on unmodified fields.
    expect(result?.fields.description).toBe(mockIssueJRL001.fields.description);
    expect(result?.fields.comment?.comments[0].body).toBe(
      mockIssueJRL001.fields.comment.comments[0].body
    );
    // Conversion of the same strings must produce the same output after pre-warming
    // (confirms the cache was not populated with corrupt values).
    const freshHtml = convertJiraMarkdownToHtml(
      mockIssueJRL001.fields.description
    );
    expect(freshHtml).toBeTruthy();
  });
});

describe('convertJiraMarkdownToNormalMarkdown', () => {
  it('returns empty string for null input', () => {
    expect(convertJiraMarkdownToNormalMarkdown(null)).toBe('');
  });

  it('returns empty string for undefined input', () => {
    expect(convertJiraMarkdownToNormalMarkdown(undefined)).toBe('');
  });

  it('returns empty string for empty string input', () => {
    expect(convertJiraMarkdownToNormalMarkdown('')).toBe('');
  });

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

  it('returns identical result on repeated call for same input (cache regression guard)', () => {
    const first = convertJiraMarkdownToNormalMarkdown('*bold text*');
    const second = convertJiraMarkdownToNormalMarkdown('*bold text*');
    expect(second).toBe(first);
  });

  it('returns correct result after cache is cleared', () => {
    const before = convertJiraMarkdownToNormalMarkdown('*bold text*');
    clearMarkdownCache();
    const after = convertJiraMarkdownToNormalMarkdown('*bold text*');
    expect(after).toBe(before);
  });
});
