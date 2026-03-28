import { EventEmitter } from 'events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('child_process', () => ({
  spawn: vi.fn()
}));

import * as cp from 'child_process';
import * as vscode from 'vscode';

import { runGitBlameCommand } from '../../../src/services/git';

// A realistic git blame --porcelain output for a single line
const MOCK_BLAME_OUTPUT = `abc123def456abc123def456abc123def456abc1 1 1 1
author John Doe
author-mail <john@example.com>
author-time 1696000000
author-tz +0000
committer Jane Doe
committer-mail <jane@example.com>
committer-time 1696000000
committer-tz +0000
summary feat: JRL-123 add the status bar item
filename src/extension.ts
\tconst x = 1`;

function makeMockProcess() {
  const stdout = new EventEmitter();
  const stderr = new EventEmitter();
  return { stdout, stderr };
}

function makeMockEditor(fsPath: string, line: number) {
  return {
    document: { uri: { fsPath } },
    selection: { active: { line } }
  };
}

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  (vscode.window as unknown as Record<string, unknown>).activeTextEditor =
    undefined;
});

describe('runGitBlameCommand', () => {
  it('returns undefined when there is no active editor', async () => {
    (vscode.window as unknown as Record<string, unknown>).activeTextEditor =
      undefined;
    const result = await runGitBlameCommand();
    expect(result).toBeUndefined();
  });

  it('returns undefined when the file is not inside a workspace folder', async () => {
    (vscode.window as unknown as Record<string, unknown>).activeTextEditor =
      makeMockEditor('/outside/file.ts', 0);
    vi.mocked(vscode.workspace.getWorkspaceFolder).mockReturnValue(undefined);

    const result = await runGitBlameCommand();
    expect(result).toBeUndefined();
  });

  it('spawns git blame with the correct arguments', async () => {
    const mockProcess = makeMockProcess();
    vi.mocked(cp.spawn).mockReturnValue(
      mockProcess as ReturnType<typeof cp.spawn>
    );
    (vscode.window as unknown as Record<string, unknown>).activeTextEditor =
      makeMockEditor('/workspace/src/extension.ts', 4);
    vi.mocked(vscode.workspace.getWorkspaceFolder).mockReturnValue({
      uri: { fsPath: '/workspace' }
    } as ReturnType<typeof vscode.workspace.getWorkspaceFolder>);

    const promise = runGitBlameCommand();
    await Promise.resolve(); // allow listener registration
    mockProcess.stdout.emit('data', Buffer.from(MOCK_BLAME_OUTPUT));
    await promise;

    expect(cp.spawn).toHaveBeenCalledWith(
      'git',
      ['blame', '--porcelain', '-L5,+1', '/workspace/src/extension.ts'],
      { cwd: '/workspace' }
    );
  });

  it('parses the blame output into a GitBlameCommandInfo object', async () => {
    const mockProcess = makeMockProcess();
    vi.mocked(cp.spawn).mockReturnValue(
      mockProcess as ReturnType<typeof cp.spawn>
    );
    (vscode.window as unknown as Record<string, unknown>).activeTextEditor =
      makeMockEditor('/workspace/src/extension.ts', 5);
    vi.mocked(vscode.workspace.getWorkspaceFolder).mockReturnValue({
      uri: { fsPath: '/workspace' }
    } as ReturnType<typeof vscode.workspace.getWorkspaceFolder>);

    const promise = runGitBlameCommand();
    await Promise.resolve();
    mockProcess.stdout.emit('data', Buffer.from(MOCK_BLAME_OUTPUT));
    const result = await promise;

    expect(result).toBeDefined();
    expect(result!.lineNumber).toBe(5);
    expect(result!.gitBlameInfo.author).toBe('John Doe');
    expect(result!.gitBlameInfo['author-mail']).toBe('<john@example.com>');
    expect(result!.gitBlameInfo.committer).toBe('Jane Doe');
    expect(result!.gitBlameInfo.summary).toBe(
      'feat: JRL-123 add the status bar item'
    );
    expect(result!.gitBlameInfo.filename).toBe('src/extension.ts');
  });

  it('rejects when git emits a stderr error', async () => {
    const mockProcess = makeMockProcess();
    vi.mocked(cp.spawn).mockReturnValue(
      mockProcess as ReturnType<typeof cp.spawn>
    );
    (vscode.window as unknown as Record<string, unknown>).activeTextEditor =
      makeMockEditor('/workspace/src/extension.ts', 0);
    vi.mocked(vscode.workspace.getWorkspaceFolder).mockReturnValue({
      uri: { fsPath: '/workspace' }
    } as ReturnType<typeof vscode.workspace.getWorkspaceFolder>);

    const promise = runGitBlameCommand();
    await Promise.resolve();
    mockProcess.stderr.emit('error', new Error('git not found'));

    await expect(promise).rejects.toThrow('git not found');
  });
});
