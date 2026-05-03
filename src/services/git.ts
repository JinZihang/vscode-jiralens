import * as cp from 'child_process';
import * as vscode from 'vscode';

import { GitBlameCommandInfo, GitBlameInfo } from './git.types';

const _gitBlameCache = new Map<string, GitBlameInfo>();

export function invalidateGitBlameCache(filePath: string): void {
  for (const key of _gitBlameCache.keys()) {
    if (key.startsWith(`${filePath}:`)) {
      _gitBlameCache.delete(key);
    }
  }
}

export function clearGitBlameCache(): void {
  _gitBlameCache.clear();
}

function parseGitBlameResponse(blame: string): GitBlameInfo {
  const lines = blame.trim().split('\n');
  lines[0] = `commit ${lines[0]}`;
  lines[lines.length - 1] = `line ${lines[lines.length - 1]}`;
  const result = Object.fromEntries(
    lines.map((line: string) => {
      const words = line.split(' ');
      const key = words[0];
      const value = words.slice(1).join(' ');
      return [key, value];
    })
  ) as GitBlameInfo;
  return result;
}

export async function runGitBlameCommand(): Promise<
  GitBlameCommandInfo | undefined
> {
  const activeEditor = vscode.window.activeTextEditor;
  if (!activeEditor) {
    return;
  }
  const activeFile = activeEditor.document.uri;
  const activeLineNumber = activeEditor.selection.active.line;

  const cacheKey = `${activeFile.fsPath}:${activeLineNumber}`;
  const cached = _gitBlameCache.get(cacheKey);
  if (cached !== undefined) {
    return {
      gitBlameInfo: cached,
      editor: activeEditor,
      lineNumber: activeLineNumber
    };
  }

  const commandArguments = [
    'blame',
    '--porcelain',
    `-L${activeLineNumber + 1},+1`,
    activeFile.fsPath
  ];
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(activeFile);
  if (!workspaceFolder) {
    return;
  }
  const workspaceFolderPath = workspaceFolder?.uri.fsPath;
  const commandOptions = { cwd: workspaceFolderPath };
  return new Promise((resolve, reject) => {
    const gitBlameCommand = cp.spawn('git', commandArguments, commandOptions);
    gitBlameCommand.stdout.on('data', (response) => {
      const gitBlameInfo = parseGitBlameResponse(response.toString());
      _gitBlameCache.set(cacheKey, gitBlameInfo);
      resolve({
        gitBlameInfo,
        editor: activeEditor,
        lineNumber: activeLineNumber
      });
    });
    gitBlameCommand.stderr.on('error', (error) => {
      reject(error);
    });
  });
}
