import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      vscode: path.resolve(__dirname, 'test/__mocks__/vscode.ts')
    }
  },
  test: {
    include: ['test/unit/**/*.test.ts']
  }
});
