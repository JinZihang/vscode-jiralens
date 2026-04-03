# Add or Update an Extension Configuration

When adding or updating a `jiralens.*` configuration setting, work through the checklist below in order. Each section states whether it is mandatory or conditional.

---

## 1. `package.json` — configuration schema (MANDATORY)

Add an entry under `contributes.configuration.properties`:

```json
"jiralens.<keyName>": {
  "type": "string|boolean|array",
  "default": <defaultValue>,
  "description": "One-sentence user-facing description."
}
```

For array types, also add `"items": { "type": "string" }`.

---

## 2. `src/configs.ts` — getter and setter (MANDATORY)

Prefix the block with a comment line, then add two exported functions. Follow the existing style exactly.

```typescript
// jiralens.<keyName>
export function get<PascalKey>(): Type {
  return wsConfig.get<Type>('<keyName>') ?? <defaultValue>;
}
export async function set<PascalKey>(value: Type): Promise<boolean> {
  try {
    await wsConfig.update(
      '<keyName>',
      value,
      vscode.ConfigurationTarget.Global
    );
    syncWorkspaceConfiguration();
    return true;
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to update the <description>: ${error}`
    );
    return false;
  }
}
```

**Nullish coalescing vs logical OR**: use `??` for all types. The only exception is `getJiraHost()`, which uses `||` because an empty-string host is equally invalid as a missing one — only replicate this pattern if empty string must be treated identically to `undefined`.

**Always call `syncWorkspaceConfiguration()`** directly after `wsConfig.update()` to refresh the module-level cache.

**Array-typed configs**: expose fine-grained helpers (`add…`, `delete…`) as the public API and keep the raw setter (`set<PascalKey>`) unexported. See `jiraProjectKeys` — `setJiraProjectKeys` is not exported; only `addJiraProjectKey` and `deleteJiraProjectKey` are.

---

## 3. `test/unit/configs.test.ts` — getter tests (MANDATORY)

The file has a module-level `mockGet` constant and a module-level `beforeEach` that resets it — do not duplicate these; just add your `describe` block alongside the existing ones:

```typescript
// Already present at module level — do not add again:
const mockGet = vi.mocked(workspace.getConfiguration('jiralens').get);
beforeEach(() => {
  mockGet.mockReset();
});

// Add your new describe block:
describe('get<PascalKey>', () => {
  it('returns the configured value', () => {
    mockGet.mockReturnValue(<someValue>);
    expect(get<PascalKey>()).toBe(<someValue>);
  });

  it('returns <defaultValue> when the setting is undefined', () => {
    mockGet.mockReturnValue(undefined);
    expect(get<PascalKey>()).toBe(<defaultValue>);
  });
});
```

Also import the new getter alongside the existing imports at the top of the test file.

---

## 4. `package.json` commands + `src/commands.ts` (CONDITIONAL — if the config has a VS Code command)

### 4a. `package.json` — add to `contributes.commands`

```json
{
  "command": "jiralens.<commandId>",
  "title": "<User-visible action title>"
}
```

### 4b. `src/commands.ts` — register the command

1. Add a constant at the top of the constants block: `const <COMMAND_CONST> = 'jiralens.<commandId>';`
2. Add a `register<PascalKey>Command()` function. Use `showInputBox` for string/free-text configs, `showQuickPick(['Yes', 'No'])` for booleans.
3. Push the function call inside `registerCommands()` → `context.subscriptions.push(…)`.
4. Import the new getter/setter at the top of the file.

**String config — empty string is invalid (most cases):**

```typescript
function register<PascalKey>Command(): vscode.Disposable {
  return vscode.commands.registerCommand(<COMMAND_CONST>, async () => {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter …',
      placeHolder: '',
      value: get<PascalKey>()
    });
    if (!input) return; // rejects both dismissal (undefined) and empty string
    await set<PascalKey>(input);
    vscode.window.showInformationMessage('Updated …');
  });
}
```

**String config — empty string is a valid value to save (e.g. clearing an optional field):**

```typescript
if (input === undefined) return; // dismissal only; empty string is intentional
await set<PascalKey>(input);
```

**Pre-condition checks**: some commands must verify a prerequisite before showing the input. Place these at the top of the callback, before the `showInputBox` call:

```typescript
if (!getJiraHost()) {
  vscode.window.showErrorMessage('Please set the Jira host first.');
  return;
}
```

**Input validation**: if the value must be validated before saving (e.g. URL format, token format, project key format), call the relevant validator from `src/services/jira.ts` or `src/utils.ts` and show an error on failure:

```typescript
if (!isValidSomething(input)) {
  vscode.window.showErrorMessage('Invalid input.');
  return;
}
```

**Boolean config** — note: the setter is called without `await` (fire-and-forget), matching the existing pattern:

```typescript
function register<PascalKey>Command(): vscode.Disposable {
  return vscode.commands.registerCommand(<COMMAND_CONST>, async () => {
    const pick = await vscode.window.showQuickPick(['Yes', 'No'], {
      placeHolder: '…?'
    });
    if (!pick) return;
    set<PascalKey>(pick === 'Yes'); // no await — intentional
  });
}
```

### 4c. `test/unit/commands.test.ts` — command tests

The test file uses dynamic ESM imports (mocks must be set up before the module loads). Follow this exact structure:

1. Add `get<PascalKey>: vi.fn().mockReturnValue(<default>)` and `set<PascalKey>: vi.fn().mockResolvedValue(true)` to the `vi.mock('../../src/configs', …)` factory at the top.
2. Add the getter and setter to the `await import('../../src/configs')` destructure below the mocks.
3. Add a `describe` block that covers: happy path, dismissal (setter not called), and any validation/pre-condition branches specific to this command.

```typescript
// 1. In the vi.mock factory:
vi.mock('../../src/configs', () => ({
  // ... existing entries ...
  get<PascalKey>: vi.fn().mockReturnValue(<default>),
  set<PascalKey>: vi.fn().mockResolvedValue(true)
}));

// 2. In the await import destructure:
const { set<PascalKey>, /* ...others */ } = await import('../../src/configs');

// 3. describe block:
describe('register<PascalKey>Command', () => {
  beforeEach(() => {
    vi.mocked(set<PascalKey>).mockClear();
  });

  it('calls set<PascalKey> with user input', async () => {
    vi.mocked(window.showInputBox).mockResolvedValue('value' as any);
    await capturedCallbacks['jiralens.<commandId>']();
    expect(set<PascalKey>).toHaveBeenCalledWith('value');
  });

  it('does nothing when the user dismisses', async () => {
    vi.mocked(window.showInputBox).mockResolvedValue(undefined as any);
    await capturedCallbacks['jiralens.<commandId>']();
    expect(set<PascalKey>).not.toHaveBeenCalled();
  });
});
```

Make sure `window.showInputBox` is present in `test/__mocks__/vscode.ts` — add it if missing:

```typescript
showInputBox: vi.fn(),
```

---

## 5. Service integration (CONDITIONAL — if the config is read by `src/services/jira.ts` or another service)

- Import the new getter in the service file.
- Read the config value **at call time** inside the relevant function (not at module initialisation) — this is the existing pattern in `jira.ts` (`getJiraProjectKeys`, `getJiraHost`, `getJiraEmail`, `getJiraBearerToken` are all called inside functions, not cached at the top level).
- Add or update tests in `test/unit/services/jira.test.ts`:
  - Add the getter to the `vi.mock('../../../src/configs', …)` factory with a sensible default.
  - Import the mock via the existing `import { … } from '../../../src/configs'` static import at the top (this test file uses static imports, unlike commands.test.ts).
  - Use `vi.mocked(get<PascalKey>).mockReturnValue(…)` in `beforeEach` or individual tests.
  - Test each branch the config value controls.

---

## 6. Inline message integration (CONDITIONAL — if the config controls what appears in the inline decoration)

- Import the getter in `src/components/InlineMessageController.ts`.
- Add a guard inside `getInlineMessage()`, following the pattern of existing guards. Note that some guards involve additional computation before the push (e.g. looking up a key, formatting a timestamp) — the guard wraps all that work, not just the `messages.push`:

```typescript
if (get<PascalKey>()) {
  // compute value if needed, then:
  messages.push(value);
}
```

`getInlineMessage()` also has an early-return guard at the top (`if (gitBlameInfo.author === 'Not Committed Yet') return …`) — ensure your guard comes after that.

---

## 7. Documentation (MANDATORY for user-facing configs)

### `README.md`
- Add or update a subsection under **Extension Setup**.
- If a new command was added, list it in the **Comprehensive Commands** code block.
- If the TOC needs a new entry, add it.

### `CLAUDE.md`
- Add a row to the **Configuration Keys** table:
  ```
  | `<keyName>` | type | `<default>` | Description |
  ```

---

## Quick decision guide

| Question                                       | If YES → also update    |
| ---------------------------------------------- | ----------------------- |
| Does the config need a UI command?             | §4a, §4b, §4c           |
| Is the config read by `src/services/jira.ts`?  | §5                      |
| Does the config control the inline decoration? | §6                      |
| Is the config part of user-facing setup?       | §7 (README + CLAUDE.md) |

Run `npm run test:unit` after all changes to confirm nothing is broken.
