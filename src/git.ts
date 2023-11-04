import * as vscode from 'vscode';
import * as cp from 'child_process';
import { GitBlameInfo, GitBlameCommandInfo } from './types';

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
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }
  const currentFile = editor.document.uri;
  const currentLine = editor.document.lineAt(editor.selection.active.line);
  const lineNumber = currentLine.lineNumber;
  const commandArguments = [
    'blame',
    '--porcelain',
    `-L${lineNumber + 1},+1`,
    currentFile.fsPath
  ];

  const workspaceFolder = vscode.workspace.getWorkspaceFolder(currentFile);
  if (!workspaceFolder) {
    return;
  }
  const workspaceFolderPath = workspaceFolder?.uri.fsPath;
  const commandOptions = { cwd: workspaceFolderPath };

  return new Promise((resolve, reject) => {
    const gitBlameCommand = cp.spawn('git', commandArguments, commandOptions);
    gitBlameCommand.stdout.on('data', (response) => {
      const gitBlameInfo = parseGitBlameResponse(response.toString());
      resolve({ gitBlameInfo, editor, line: currentLine });
    });
    gitBlameCommand.stderr.on('error', (error) => {
      reject(error);
    });
  });
}
