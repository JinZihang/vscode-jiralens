import { vi } from 'vitest';

export const workspace = {
  getConfiguration: vi.fn().mockReturnValue({
    get: vi.fn(),
    update: vi.fn().mockResolvedValue(undefined)
  }),
  getWorkspaceFolder: vi.fn()
};

export const window = {
  activeTextEditor: undefined,
  showErrorMessage: vi.fn(),
  showWarningMessage: vi.fn(),
  showInformationMessage: vi.fn(),
  showInputBox: vi.fn(),
  showQuickPick: vi.fn()
};

export const commands = {
  registerCommand: vi.fn()
};

export const ConfigurationTarget = {
  Global: 1,
  Workspace: 2,
  WorkspaceFolder: 3
};

export const Uri = {
  file: vi.fn((path: string) => ({ fsPath: path, scheme: 'file' })),
  parse: vi.fn()
};
