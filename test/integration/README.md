# Integration Tests

Integration tests run inside a VS Code Extension Development Host and have access to the full VS Code API. They are suited for testing extension activation, command execution, webview behavior, and any logic that requires a live `vscode` environment.

## Planned stack

- [`@vscode/test-cli`](https://github.com/microsoft/vscode-test-cli) — test runner / CLI
- [`@vscode/test-electron`](https://github.com/microsoft/vscode-test-electron) — downloads and launches VS Code for tests
- [Mocha](https://mochajs.org/) — test framework (used internally by `@vscode/test-cli`)

## Planned folder structure

```
test/integration/
  suite/
    extension.test.ts   # activation, command registration
    commands.test.ts    # end-to-end command execution
    ...
  index.ts              # Mocha test runner entry point
```

## Running integration tests (once configured)

```bash
npm run test:integration
```

## References

- [VS Code Extension Testing docs](https://code.visualstudio.com/api/working-with-extensions/testing-extension)
- [vscode-test-cli README](https://github.com/microsoft/vscode-test-cli)
