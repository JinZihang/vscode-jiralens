import * as vscode from 'vscode';

export type GitBlameInfo = {
  author: string;
  'author-mail': string;
  'author-time': string;
  'author-tz': string;
  commit: string;
  committer: string;
  'committer-mail': string;
  'committer-time': string;
  'committer-tz': string;
  filename: string;
  line: string;
  summary: string;
};

export type GitBlameCommandInfo = {
  editor: vscode.TextEditor;
  line: vscode.TextLine;
  gitBlameInfo: GitBlameInfo;
};
