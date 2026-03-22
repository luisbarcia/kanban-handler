# kanban-handler CLI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a TypeScript CLI that manages Vibe Kanban boards on self-hosted/remote instances via REST API.

**Architecture:** Layered CLI (commands → client → config → output). Commander for arg parsing, native fetch for HTTP, conf+env-paths for config. Client layer is decoupled from CLI for future SDK extraction.

**Tech Stack:** Node.js 18+, TypeScript (strict), commander, tsup, vitest, conf, env-paths, chalk, ora, cli-table3

**Spec:** `docs/superpowers/specs/2026-03-21-kanban-handler-cli-design.md`

---

## File Map

| File | Responsibility |
|------|----------------|
| `package.json` | Dependencies, scripts, bin entry |
| `tsconfig.json` | TypeScript strict config |
| `tsup.config.ts` | Build config (ESM bundle) |
| `vitest.config.ts` | Test config |
| `.eslintrc.json` | Linting rules |
| `.prettierrc` | Formatting rules |
| `src/index.ts` | Entry point (`#!/usr/bin/env node`), imports cli.ts |
| `src/cli.ts` | Commander program setup, global flags, command registration |
| `src/client/types.ts` | Branded types, domain interfaces, API response types |
| `src/client/endpoints.ts` | URL builder functions for each REST endpoint |
| `src/client/api-client.ts` | `KanbanClient` class — typed HTTP methods with retry/timeout |
| `src/config/paths.ts` | XDG config paths via env-paths |
| `src/config/manager.ts` | Context CRUD, active context resolution, token resolution |
| `src/output/ui.ts` | TTY detection, spinner, chalk wrappers |
| `src/output/formatter.ts` | table/json/minimal formatters |
| `src/utils/errors.ts` | Error classes (AuthError, NotFoundError, ApiError, NetworkError, ConfigError) |
| `src/commands/health.ts` | `kanban health` command |
| `src/commands/config.ts` | `kanban config` subcommands |
| `src/commands/projects.ts` | `kanban projects list` |
| `src/commands/issues.ts` | `kanban issues` subcommands |
| `src/commands/tags.ts` | `kanban tags` subcommands |
| `src/commands/workspaces.ts` | `kanban workspaces` subcommands |
| `src/commands/sessions.ts` | `kanban sessions` subcommands |

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsup.config.ts`
- Create: `vitest.config.ts`
- Create: `.eslintrc.json`
- Create: `.prettierrc`
- Create: `.gitignore`
- Create: `src/index.ts`

- [ ] **Step 1: Initialize npm and install dependencies**

```bash
cd /Users/luismattos/Documents/Workspaces/luismattos/kanban-handler
npm init -y
npm install commander chalk ora cli-table3 conf env-paths
npm install -D typescript tsup vitest eslint prettier @types/node @types/cli-table3 @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "incremental": true,
    "outDir": "dist",
    "rootDir": "src",
    "skipLibCheck": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create tsup.config.ts**

```typescript
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node18",
  clean: true,
  sourcemap: true,
  dts: true,
  banner: { js: "#!/usr/bin/env node" },
});
```

- [ ] **Step 4: Create vitest.config.ts**

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 },
    },
  },
});
```

- [ ] **Step 5: Create .eslintrc.json, .prettierrc, .gitignore**

`.eslintrc.json`:
```json
{
  "root": true,
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "extends": ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  "rules": {
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "no-console": "off"
  }
}
```

`.prettierrc`:
```json
{
  "semi": true,
  "singleQuote": false,
  "trailingComma": "all",
  "printWidth": 100
}
```

`.gitignore`:
```
node_modules/
dist/
*.tsbuildinfo
coverage/
```

- [ ] **Step 6: Create src/index.ts (minimal entry point)**

```typescript
#!/usr/bin/env node
console.log("kanban-handler v0.1.0");
```

- [ ] **Step 7: Add scripts to package.json**

Add to `package.json`:
```json
{
  "name": "kanban-handler",
  "type": "module",
  "bin": { "kanban": "./dist/index.js" },
  "engines": { "node": ">=18.0.0" },
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src/",
    "format": "prettier --write src/",
    "typecheck": "tsc --noEmit"
  }
}
```

- [ ] **Step 8: Verify build works**

Run: `npm run build`
Expected: `dist/index.js` created with shebang

Run: `node dist/index.js`
Expected: `kanban-handler v0.1.0`

- [ ] **Step 9: Verify typecheck works**

Run: `npm run typecheck`
Expected: No errors

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: scaffold project with TypeScript, tsup, vitest, commander"
```

---

## Task 2: Types & Error Classes

**Files:**
- Create: `src/client/types.ts`
- Create: `src/utils/errors.ts`
- Test: `src/utils/errors.test.ts`

- [ ] **Step 1: Write error class tests**

```typescript
// src/utils/errors.test.ts
import { describe, it, expect } from "vitest";
import { AuthError, NotFoundError, ApiError, NetworkError, ConfigError } from "./errors.js";

describe("Error classes", () => {
  it.each([
    { Class: AuthError, code: 1, name: "AuthError" },
    { Class: NotFoundError, code: 2, name: "NotFoundError" },
    { Class: ApiError, code: 3, name: "ApiError" },
    { Class: NetworkError, code: 4, name: "NetworkError" },
    { Class: ConfigError, code: 5, name: "ConfigError" },
  ])("$name has exitCode $code", ({ Class, code, name }) => {
    const err = new Class("test message");
    expect(err.message).toBe("test message");
    expect(err.exitCode).toBe(code);
    expect(err.name).toBe(name);
    expect(err).toBeInstanceOf(Error);
  });

  it("ApiError stores statusCode", () => {
    const err = new ApiError("bad request", 400);
    expect(err.statusCode).toBe(400);
  });

  it("NetworkError stores url", () => {
    const err = new NetworkError("timeout", "https://example.com/api");
    expect(err.url).toBe("https://example.com/api");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/errors.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Create src/client/types.ts**

```typescript
// Branded type utility
export type Brand<T, B extends string> = T & { readonly __brand: B };

// Domain IDs
export type ProjectId = Brand<string, "ProjectId">;
export type IssueId = Brand<string, "IssueId">;
export type MemberId = Brand<string, "MemberId">;
export type TagId = Brand<string, "TagId">;
export type WorkspaceId = Brand<string, "WorkspaceId">;
export type SessionId = Brand<string, "SessionId">;

// ID constructors
export const toProjectId = (id: string): ProjectId => id as ProjectId;
export const toIssueId = (id: string): IssueId => id as IssueId;
export const toMemberId = (id: string): MemberId => id as MemberId;
export const toTagId = (id: string): TagId => id as TagId;
export const toWorkspaceId = (id: string): WorkspaceId => id as WorkspaceId;
export const toSessionId = (id: string): SessionId => id as SessionId;

// API response envelope
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error_data?: { message: string; code: string };
}

// Pagination
export interface PaginationParams {
  limit?: number;
  page?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

// Domain models
export interface Issue {
  id: IssueId;
  title: string;
  description?: string;
  status: string;
  priority?: string;
  projectId: ProjectId;
  assignees: MemberId[];
  tags: TagId[];
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: ProjectId;
  name: string;
}

export interface Tag {
  id: TagId;
  name: string;
  color?: string;
}

export interface Workspace {
  id: WorkspaceId;
  issueId: IssueId;
  status: string;
}

export interface Session {
  id: SessionId;
  workspaceId: WorkspaceId;
  status: string;
}

export interface Execution {
  id: string;
  sessionId: SessionId;
  status: string;
  output?: string;
}

export interface CreateIssueInput {
  title: string;
  description?: string;
  priority?: string;
  status?: string;
}

export interface UpdateIssueInput {
  title?: string;
  description?: string;
  priority?: string;
  status?: string;
}

export interface IssueFilters {
  status?: string;
  assignee?: MemberId;
}

export interface HealthStatus {
  ok: boolean;
  version?: string;
}
```

- [ ] **Step 4: Create src/utils/errors.ts**

```typescript
abstract class CliError extends Error {
  abstract readonly exitCode: number;
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class AuthError extends CliError {
  readonly exitCode = 1;
}

export class NotFoundError extends CliError {
  readonly exitCode = 2;
}

export class ApiError extends CliError {
  readonly exitCode = 3;
  constructor(
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message);
  }
}

export class NetworkError extends CliError {
  readonly exitCode = 4;
  constructor(
    message: string,
    public readonly url?: string,
  ) {
    super(message);
  }
}

export class ConfigError extends CliError {
  readonly exitCode = 5;
}

export type { CliError };
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/utils/errors.test.ts`
Expected: All 7 tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/client/types.ts src/utils/errors.ts src/utils/errors.test.ts
git commit -m "feat: add domain types with branded IDs and error classes"
```

---

## Task 3: Config Manager

**Files:**
- Create: `src/config/paths.ts`
- Create: `src/config/manager.ts`
- Test: `src/config/manager.test.ts`

- [ ] **Step 1: Write config manager tests**

```typescript
// src/config/manager.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { ConfigManager } from "./manager.js";
import type { ContextConfig } from "./manager.js";

describe("ConfigManager", () => {
  let manager: ConfigManager;

  beforeEach(() => {
    manager = ConfigManager.createInMemory();
  });

  it("adds and retrieves a context", () => {
    const ctx: ContextConfig = { url: "https://kanban.servs.dev", token: "tok123" };
    manager.addContext("prod", ctx);
    expect(manager.getContext("prod")).toEqual(ctx);
  });

  it("sets current context on first add", () => {
    manager.addContext("prod", { url: "https://a.com", token: "t" });
    expect(manager.getCurrentContextName()).toBe("prod");
  });

  it("switches context", () => {
    manager.addContext("prod", { url: "https://a.com", token: "t" });
    manager.addContext("local", { url: "http://localhost:9119", token: "t2" });
    manager.useContext("local");
    expect(manager.getCurrentContextName()).toBe("local");
  });

  it("throws on switch to unknown context", () => {
    expect(() => manager.useContext("nope")).toThrow("Context 'nope' not found");
  });

  it("removes a context", () => {
    manager.addContext("prod", { url: "https://a.com", token: "t" });
    manager.removeContext("prod");
    expect(manager.getContext("prod")).toBeUndefined();
  });

  it("lists all contexts", () => {
    manager.addContext("a", { url: "https://a.com", token: "t" });
    manager.addContext("b", { url: "https://b.com", token: "t" });
    expect(manager.listContexts()).toEqual(["a", "b"]);
  });

  it("resolves token with priority: flag > env > config", () => {
    manager.addContext("prod", { url: "https://a.com", token: "config-token" });
    manager.useContext("prod");

    expect(manager.resolveToken(undefined, undefined)).toBe("config-token");
    expect(manager.resolveToken(undefined, "env-token")).toBe("env-token");
    expect(manager.resolveToken("flag-token", "env-token")).toBe("flag-token");
  });

  it("resolves context with priority: flag > env > config", () => {
    manager.addContext("prod", { url: "https://a.com", token: "t" });
    manager.addContext("local", { url: "http://b.com", token: "t2" });
    manager.useContext("prod");

    expect(manager.resolveContextName(undefined, undefined)).toBe("prod");
    expect(manager.resolveContextName(undefined, "local")).toBe("local");
    expect(manager.resolveContextName("local", "prod")).toBe("local");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/config/manager.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Create src/config/paths.ts**

```typescript
import envPaths from "env-paths";

const paths = envPaths("kanban-handler", { suffix: "" });

export const configDir = paths.config;
export const dataDir = paths.data;
export const cacheDir = paths.cache;
```

- [ ] **Step 4: Create src/config/manager.ts**

```typescript
import Conf from "conf";
import { ConfigError } from "../utils/errors.js";

export interface ContextConfig {
  url: string;
  token: string;
  defaultProject?: string;
}

interface StoreSchema {
  currentContext: string;
  contexts: Record<string, ContextConfig>;
}

export class ConfigManager {
  private store: Conf<StoreSchema> | Map<string, unknown>;
  private inMemory: boolean;

  private constructor(store: Conf<StoreSchema> | Map<string, unknown>, inMemory: boolean) {
    this.store = store;
    this.inMemory = inMemory;
  }

  static create(): ConfigManager {
    const store = new Conf<StoreSchema>({
      projectName: "kanban-handler",
      defaults: { currentContext: "", contexts: {} },
    });
    if (process.platform !== "win32") {
      const configPath = store.path;
      import("node:fs").then(fs => fs.chmodSync(configPath, 0o600)).catch(() => {});
    }
    return new ConfigManager(store, false);
  }

  static createInMemory(): ConfigManager {
    const store = new Map<string, unknown>();
    store.set("currentContext", "");
    store.set("contexts", {});
    return new ConfigManager(store, true);
  }

  private get<K extends keyof StoreSchema>(key: K): StoreSchema[K] {
    if (this.inMemory) {
      return (this.store as Map<string, unknown>).get(key) as StoreSchema[K];
    }
    return (this.store as Conf<StoreSchema>).get(key);
  }

  private set<K extends keyof StoreSchema>(key: K, value: StoreSchema[K]): void {
    if (this.inMemory) {
      (this.store as Map<string, unknown>).set(key, value);
    } else {
      (this.store as Conf<StoreSchema>).set(key, value);
    }
  }

  addContext(name: string, config: ContextConfig): void {
    const contexts = { ...this.get("contexts"), [name]: config };
    this.set("contexts", contexts);
    if (!this.get("currentContext")) {
      this.set("currentContext", name);
    }
  }

  removeContext(name: string): void {
    const contexts = { ...this.get("contexts") };
    delete contexts[name];
    this.set("contexts", contexts);
    if (this.get("currentContext") === name) {
      const remaining = Object.keys(contexts);
      this.set("currentContext", remaining[0] ?? "");
    }
  }

  useContext(name: string): void {
    const contexts = this.get("contexts");
    if (!contexts[name]) {
      throw new ConfigError(`Context '${name}' not found. Use 'kanban config list-contexts' to see available contexts.`);
    }
    this.set("currentContext", name);
  }

  getContext(name: string): ContextConfig | undefined {
    return this.get("contexts")[name];
  }

  getCurrentContextName(): string {
    return this.get("currentContext");
  }

  getCurrentContext(): ContextConfig {
    const name = this.get("currentContext");
    if (!name) {
      throw new ConfigError("No active context. Use 'kanban config add-context' to add one.");
    }
    const ctx = this.getContext(name);
    if (!ctx) {
      throw new ConfigError(`Active context '${name}' not found in config.`);
    }
    return ctx;
  }

  listContexts(): string[] {
    return Object.keys(this.get("contexts"));
  }

  resolveContextName(flag?: string, envVar?: string): string {
    return flag ?? envVar ?? this.getCurrentContextName();
  }

  resolveToken(flag?: string, envVar?: string): string {
    if (flag) return flag;
    if (envVar) return envVar;
    return this.getCurrentContext().token;
  }

  showCurrentContext(): { name: string; url: string; defaultProject?: string; tokenMasked: string } {
    const name = this.getCurrentContextName();
    const ctx = this.getCurrentContext();
    const tokenMasked = ctx.token.length > 8
      ? ctx.token.slice(0, 4) + "****" + ctx.token.slice(-4)
      : "****";
    return { name, url: ctx.url, defaultProject: ctx.defaultProject, tokenMasked };
  }
}
```

- [ ] **Step 5b: Set config file permissions to 600 on Unix**

In the `ConfigManager.create()` method, after creating the Conf store, add:

```typescript
if (process.platform !== "win32") {
  const configPath = store.path;
  import("node:fs").then(fs => fs.chmodSync(configPath, 0o600)).catch(() => {});
}
```

This ensures the config file (which stores tokens) is only readable by the owner.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/config/manager.test.ts`
Expected: All 8 tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/config/paths.ts src/config/manager.ts src/config/manager.test.ts
git commit -m "feat: add config manager with multi-context support"
```

---

## Task 4: Endpoint Builder & API Client

**Files:**
- Create: `src/client/endpoints.ts`
- Create: `src/client/api-client.ts`
- Test: `src/client/endpoints.test.ts`
- Test: `src/client/api-client.test.ts`

- [ ] **Step 1: Write endpoint builder tests**

```typescript
// src/client/endpoints.test.ts
import { describe, it, expect } from "vitest";
import { endpoints } from "./endpoints.js";

describe("endpoints", () => {
  const base = "https://kanban.servs.dev";

  it("health", () => {
    expect(endpoints.health(base)).toBe("https://kanban.servs.dev/api/health");
  });

  it("listIssues with all params", () => {
    const url = endpoints.listIssues(base, "p1", { status: "backlog" }, { limit: 10, page: 2 });
    expect(url).toContain("/api/issues?");
    expect(url).toContain("project_id=p1");
    expect(url).toContain("status=backlog");
    expect(url).toContain("limit=10");
    expect(url).toContain("page=2");
  });

  it("getIssue", () => {
    expect(endpoints.getIssue(base, "i1")).toBe("https://kanban.servs.dev/api/issues/i1");
  });

  it("assignIssue", () => {
    expect(endpoints.assignIssue(base, "i1")).toBe("https://kanban.servs.dev/api/issues/i1/assignees");
  });

  it("unassignIssue", () => {
    expect(endpoints.unassignIssue(base, "i1", "m1")).toBe("https://kanban.servs.dev/api/issues/i1/assignees/m1");
  });

  it("issueTag", () => {
    expect(endpoints.addTag(base, "i1")).toBe("https://kanban.servs.dev/api/issues/i1/tags");
    expect(endpoints.removeTag(base, "i1", "t1")).toBe("https://kanban.servs.dev/api/issues/i1/tags/t1");
  });

  it("sessions", () => {
    expect(endpoints.listSessions(base, "w1")).toBe("https://kanban.servs.dev/api/workspaces/w1/sessions");
    expect(endpoints.runSessionPrompt(base, "s1")).toBe("https://kanban.servs.dev/api/sessions/s1/follow-up");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/client/endpoints.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement src/client/endpoints.ts**

```typescript
import type { IssueFilters, PaginationParams } from "./types.js";

function qs(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return "";
  return "?" + entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&");
}

export const endpoints = {
  health: (base: string) => `${base}/api/health`,

  // Projects
  listProjects: (base: string) => `${base}/api/projects`,

  // Issues
  listIssues: (base: string, projectId: string, filters?: IssueFilters, pagination?: PaginationParams) =>
    `${base}/api/issues${qs({
      project_id: projectId,
      status: filters?.status,
      assignee: filters?.assignee,
      limit: pagination?.limit,
      page: pagination?.page,
    })}`,
  createIssue: (base: string) => `${base}/api/issues`,
  getIssue: (base: string, id: string) => `${base}/api/issues/${id}`,
  updateIssue: (base: string, id: string) => `${base}/api/issues/${id}`,
  deleteIssue: (base: string, id: string) => `${base}/api/issues/${id}`,
  assignIssue: (base: string, issueId: string) => `${base}/api/issues/${issueId}/assignees`,
  unassignIssue: (base: string, issueId: string, memberId: string) =>
    `${base}/api/issues/${issueId}/assignees/${memberId}`,

  // Tags
  listTags: (base: string) => `${base}/api/tags`,
  addTag: (base: string, issueId: string) => `${base}/api/issues/${issueId}/tags`,
  removeTag: (base: string, issueId: string, tagId: string) =>
    `${base}/api/issues/${issueId}/tags/${tagId}`,

  // Workspaces
  listWorkspaces: (base: string) => `${base}/api/workspaces`,
  startWorkspace: (base: string) => `${base}/api/workspaces`,
  deleteWorkspace: (base: string, id: string) => `${base}/api/workspaces/${id}`,

  // Sessions
  listSessions: (base: string, workspaceId: string) =>
    `${base}/api/workspaces/${workspaceId}/sessions`,
  createSession: (base: string, workspaceId: string) =>
    `${base}/api/workspaces/${workspaceId}/sessions`,
  runSessionPrompt: (base: string, sessionId: string) =>
    `${base}/api/sessions/${sessionId}/follow-up`,
} as const;
```

- [ ] **Step 4: Run endpoint tests**

Run: `npx vitest run src/client/endpoints.test.ts`
Expected: All PASS

- [ ] **Step 5: Write API client tests**

```typescript
// src/client/api-client.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { KanbanClient } from "./api-client.js";
import { toProjectId, toIssueId, toMemberId } from "./types.js";
import { AuthError, ApiError, NetworkError, NotFoundError } from "../utils/errors.js";

describe("KanbanClient", () => {
  let client: KanbanClient;
  const mockFetch = vi.fn();

  beforeEach(() => {
    client = new KanbanClient("https://kanban.test", "test-token", mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("health() returns status", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { ok: true, version: "1.0" } }),
    });
    const result = await client.health();
    expect(result).toEqual({ ok: true, version: "1.0" });
    expect(mockFetch).toHaveBeenCalledWith(
      "https://kanban.test/api/health",
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer test-token" }) }),
    );
  });

  it("throws AuthError on 401", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ success: false, error_data: { message: "unauthorized", code: "AUTH" } }),
    });
    await expect(client.health()).rejects.toThrow(AuthError);
  });

  it("throws NotFoundError on 404", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ success: false, error_data: { message: "not found", code: "NOT_FOUND" } }),
    });
    await expect(client.getIssue(toIssueId("bad"))).rejects.toThrow(NotFoundError);
  });

  it("retries once on 500", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { ok: true } }),
      });
    const result = await client.health();
    expect(result).toEqual({ ok: true });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("throws ApiError after retry exhausted on 500", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ success: false, error_data: { message: "server error", code: "INTERNAL" } }) })
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ success: false, error_data: { message: "server error", code: "INTERNAL" } }) });
    await expect(client.health()).rejects.toThrow(ApiError);
  });

  it("throws NetworkError on fetch failure", async () => {
    mockFetch.mockRejectedValueOnce(new TypeError("fetch failed"));
    mockFetch.mockRejectedValueOnce(new TypeError("fetch failed"));
    await expect(client.health()).rejects.toThrow(NetworkError);
  });

  it("listProjects returns array", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: [{ id: "p1", name: "Project 1" }] }),
    });
    const result = await client.listProjects();
    expect(result).toEqual([{ id: "p1", name: "Project 1" }]);
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run src/client/api-client.test.ts`
Expected: FAIL

- [ ] **Step 7: Implement src/client/api-client.ts**

```typescript
import { endpoints } from "./endpoints.js";
import type {
  ProjectId, IssueId, MemberId, TagId, WorkspaceId, SessionId,
  Issue, Project, Tag, Workspace, Session, Execution, HealthStatus,
  CreateIssueInput, UpdateIssueInput, IssueFilters, PaginationParams,
  PaginatedResponse, ApiResponse,
} from "./types.js";
import { AuthError, NotFoundError, ApiError, NetworkError } from "../utils/errors.js";

type FetchFn = typeof globalThis.fetch;

export class KanbanClient {
  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
    private readonly fetchFn: FetchFn = globalThis.fetch,
  ) {}

  private async request<T>(url: string, init?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
      ...((init?.headers as Record<string, string>) ?? {}),
    };

    const doFetch = async (): Promise<T> => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);

      try {
        const res = await this.fetchFn(url, { ...init, headers, signal: controller.signal });
        clearTimeout(timeout);

        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as ApiResponse<unknown>;
          const msg = body.error_data?.message ?? `HTTP ${res.status}`;

          if (res.status === 401) throw new AuthError(msg);
          if (res.status === 404) throw new NotFoundError(msg);
          if (res.status >= 500) throw new ApiError(msg, res.status);
          throw new ApiError(msg, res.status);
        }

        const body = (await res.json()) as ApiResponse<T>;
        return body.data as T;
      } catch (err) {
        clearTimeout(timeout);
        if (err instanceof AuthError || err instanceof NotFoundError) throw err;
        if (err instanceof ApiError && err.statusCode !== undefined && err.statusCode >= 500) throw err;
        if (err instanceof ApiError) throw err;
        throw new NetworkError(
          err instanceof Error ? err.message : "Network error",
          url,
        );
      }
    };

    // Retry once on 5xx or network error
    try {
      return await doFetch();
    } catch (err) {
      if (err instanceof ApiError && err.statusCode !== undefined && err.statusCode >= 500) {
        await new Promise((r) => setTimeout(r, 1_000));
        return doFetch();
      }
      if (err instanceof NetworkError) {
        await new Promise((r) => setTimeout(r, 1_000));
        return doFetch();
      }
      throw err;
    }
  }

  // Health
  async health(): Promise<HealthStatus> {
    return this.request(endpoints.health(this.baseUrl));
  }

  // Projects
  async listProjects(): Promise<Project[]> {
    return this.request(endpoints.listProjects(this.baseUrl));
  }

  // Issues
  async listIssues(projectId: ProjectId, filters?: IssueFilters, pagination?: PaginationParams): Promise<PaginatedResponse<Issue>> {
    return this.request(endpoints.listIssues(this.baseUrl, projectId, filters, pagination));
  }

  async createIssue(projectId: ProjectId, input: CreateIssueInput): Promise<Issue> {
    return this.request(endpoints.createIssue(this.baseUrl), {
      method: "POST",
      body: JSON.stringify({ ...input, projectId }),
    });
  }

  async getIssue(issueId: IssueId): Promise<Issue> {
    return this.request(endpoints.getIssue(this.baseUrl, issueId));
  }

  async updateIssue(issueId: IssueId, input: UpdateIssueInput): Promise<Issue> {
    return this.request(endpoints.updateIssue(this.baseUrl, issueId), {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  async moveIssue(issueId: IssueId, status: string): Promise<Issue> {
    return this.updateIssue(issueId, { status });
  }

  async deleteIssue(issueId: IssueId): Promise<void> {
    return this.request(endpoints.deleteIssue(this.baseUrl, issueId), { method: "DELETE" });
  }

  async assignIssue(issueId: IssueId, memberId: MemberId): Promise<void> {
    return this.request(endpoints.assignIssue(this.baseUrl, issueId), {
      method: "POST",
      body: JSON.stringify({ memberId }),
    });
  }

  async unassignIssue(issueId: IssueId, memberId: MemberId): Promise<void> {
    return this.request(endpoints.unassignIssue(this.baseUrl, issueId, memberId), {
      method: "DELETE",
    });
  }

  // Tags
  async listTags(): Promise<Tag[]> {
    return this.request(endpoints.listTags(this.baseUrl));
  }

  async addTag(issueId: IssueId, tagId: TagId): Promise<void> {
    return this.request(endpoints.addTag(this.baseUrl, issueId), {
      method: "POST",
      body: JSON.stringify({ tagId }),
    });
  }

  async removeTag(issueId: IssueId, tagId: TagId): Promise<void> {
    return this.request(endpoints.removeTag(this.baseUrl, issueId, tagId), {
      method: "DELETE",
    });
  }

  // Workspaces
  async listWorkspaces(): Promise<Workspace[]> {
    return this.request(endpoints.listWorkspaces(this.baseUrl));
  }

  async startWorkspace(issueId: IssueId): Promise<Workspace> {
    return this.request(endpoints.startWorkspace(this.baseUrl), {
      method: "POST",
      body: JSON.stringify({ issueId }),
    });
  }

  async deleteWorkspace(workspaceId: WorkspaceId): Promise<void> {
    return this.request(endpoints.deleteWorkspace(this.baseUrl, workspaceId), {
      method: "DELETE",
    });
  }

  // Sessions
  async listSessions(workspaceId: WorkspaceId): Promise<Session[]> {
    return this.request(endpoints.listSessions(this.baseUrl, workspaceId));
  }

  async createSession(workspaceId: WorkspaceId): Promise<Session> {
    return this.request(endpoints.createSession(this.baseUrl, workspaceId), {
      method: "POST",
    });
  }

  async runSessionPrompt(sessionId: SessionId, prompt: string): Promise<Execution> {
    return this.request(endpoints.runSessionPrompt(this.baseUrl, sessionId), {
      method: "POST",
      body: JSON.stringify({ prompt }),
    });
  }
}
```

- [ ] **Step 8: Run all client tests**

Run: `npx vitest run src/client/`
Expected: All PASS

- [ ] **Step 9: Commit**

```bash
git add src/client/endpoints.ts src/client/endpoints.test.ts src/client/api-client.ts src/client/api-client.test.ts
git commit -m "feat: add typed API client with endpoints, retry, and error mapping"
```

---

## Task 5: Output Layer (Formatter + UI)

**Files:**
- Create: `src/output/ui.ts`
- Create: `src/output/formatter.ts`
- Test: `src/output/formatter.test.ts`

- [ ] **Step 1: Write formatter tests**

```typescript
// src/output/formatter.test.ts
import { describe, it, expect } from "vitest";
import { formatOutput, formatSingle } from "./formatter.js";

describe("formatOutput", () => {
  const items = [
    { id: "i1", title: "Bug fix", status: "open" },
    { id: "i2", title: "Feature", status: "done" },
  ];
  const columns = ["id", "title", "status"] as const;

  it("json format outputs valid JSON", () => {
    const out = formatOutput(items, [...columns], "json");
    expect(JSON.parse(out)).toEqual(items);
  });

  it("minimal format outputs one id per line", () => {
    const out = formatOutput(items, [...columns], "minimal");
    expect(out).toBe("i1\ni2");
  });

  it("table format contains column headers", () => {
    const out = formatOutput(items, [...columns], "table");
    expect(out).toContain("id");
    expect(out).toContain("title");
    expect(out).toContain("status");
    expect(out).toContain("Bug fix");
  });

  it("defaults to table format", () => {
    const out = formatOutput(items, [...columns]);
    expect(out).toContain("Bug fix");
  });
});

describe("formatSingle", () => {
  const item = { id: "i1", title: "Bug fix", status: "open" };

  it("json format", () => {
    const out = formatSingle(item, "json");
    expect(JSON.parse(out)).toEqual(item);
  });

  it("minimal format returns first value", () => {
    const out = formatSingle(item, "minimal");
    expect(out).toBe("i1");
  });

  it("table format shows key-value pairs", () => {
    const out = formatSingle(item, "table");
    expect(out).toContain("id");
    expect(out).toContain("i1");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/output/formatter.test.ts`
Expected: FAIL

- [ ] **Step 3: Create src/output/ui.ts**

```typescript
import chalk from "chalk";
import ora, { type Ora } from "ora";

let forceNoColor = false;
export function setNoColor(value: boolean): void { forceNoColor = value; }
const isTTY = (): boolean => !forceNoColor && (process.stdout.isTTY ?? false);

export const color = {
  success: (text: string) => (isTTY() ? chalk.green(text) : text),
  error: (text: string) => (isTTY() ? chalk.red(text) : text),
  warn: (text: string) => (isTTY() ? chalk.yellow(text) : text),
  dim: (text: string) => (isTTY() ? chalk.dim(text) : text),
  bold: (text: string) => (isTTY() ? chalk.bold(text) : text),
};

export function spinner(text: string): Ora {
  return ora({ text, isSilent: !isTTY() });
}

export function printError(message: string, suggestion?: string): void {
  console.error(color.error(`Error: ${message}`));
  if (suggestion) {
    console.error(color.dim(`Hint: ${suggestion}`));
  }
}
```

- [ ] **Step 4: Create src/output/formatter.ts**

```typescript
import Table from "cli-table3";
import { color } from "./ui.js";

export type OutputFormat = "table" | "json" | "minimal";

export function formatOutput(
  items: Record<string, unknown>[],
  columns: string[],
  format: OutputFormat = "table",
): string {
  switch (format) {
    case "json":
      return JSON.stringify(items, null, 2);

    case "minimal":
      return items.map((item) => String(item[columns[0]!] ?? "")).join("\n");

    case "table": {
      const table = new Table({
        head: columns.map((c) => color.bold(c)),
        style: { head: [], border: [] },
      });
      for (const item of items) {
        table.push(columns.map((c) => String(item[c] ?? "")));
      }
      return table.toString();
    }
  }
}

export function formatSingle(
  item: Record<string, unknown>,
  format: OutputFormat = "table",
): string {
  if (format === "json") return JSON.stringify(item, null, 2);
  if (format === "minimal") return String(Object.values(item)[0] ?? "");

  return Object.entries(item)
    .map(([key, value]) => `${color.bold(key)}: ${String(value ?? "")}`)
    .join("\n");
}
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/output/formatter.test.ts`
Expected: All PASS

- [ ] **Step 6: Commit**

```bash
git add src/output/ui.ts src/output/formatter.ts src/output/formatter.test.ts
git commit -m "feat: add output layer with table/json/minimal formatters"
```

---

## Task 6: CLI Setup & Health Command

**Files:**
- Create: `src/cli.ts`
- Create: `src/commands/health.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Create src/commands/health.ts**

```typescript
import type { Command } from "commander";
import { KanbanClient } from "../client/api-client.js";
import { ConfigManager } from "../config/manager.js";
import { spinner, color, printError } from "../output/ui.js";
import type { OutputFormat } from "../output/formatter.js";

export function registerHealthCommand(program: Command, configManager: ConfigManager): void {
  program
    .command("health")
    .description("Check connectivity with the active Vibe Kanban instance")
    .action(async () => {
      const opts = program.opts<{ context?: string; token?: string; output?: OutputFormat; verbose?: boolean }>();
      const contextName = configManager.resolveContextName(opts.context, process.env["KANBAN_CONTEXT"]);
      const ctx = configManager.getContext(contextName);

      if (!ctx) {
        printError(`Context '${contextName}' not found.`, "Use 'kanban config add-context' to add one.");
        process.exit(5);
      }

      const token = configManager.resolveToken(opts.token, process.env["KANBAN_TOKEN"]);
      const client = new KanbanClient(ctx.url, token);
      const s = spinner("Checking health...");
      s.start();

      try {
        const status = await client.health();
        s.stop();
        if (status.ok) {
          console.log(color.success(`Connected to ${ctx.url}`));
          if (status.version) console.log(color.dim(`Version: ${status.version}`));
        } else {
          console.log(color.warn(`Instance responded but reported unhealthy`));
        }
      } catch (err) {
        s.stop();
        if (err instanceof Error) {
          printError(err.message);
          if (opts.verbose) console.error(err.stack);
        }
        process.exit((err as { exitCode?: number }).exitCode ?? 1);
      }
    });
}
```

- [ ] **Step 2: Create src/cli.ts**

```typescript
import { Command } from "commander";
import { ConfigManager } from "./config/manager.js";
import { registerHealthCommand } from "./commands/health.js";
import { registerConfigCommand } from "./commands/config.js";
import { registerProjectsCommand } from "./commands/projects.js";
import { registerIssuesCommand } from "./commands/issues.js";
import { registerTagsCommand } from "./commands/tags.js";
import { registerWorkspacesCommand } from "./commands/workspaces.js";
import { registerSessionsCommand } from "./commands/sessions.js";
import { printError, setNoColor } from "./output/ui.js";

export function createProgram(): Command {
  const program = new Command();
  const configManager = ConfigManager.create();

  program
    .name("kanban")
    .description("CLI for managing Vibe Kanban boards on self-hosted instances")
    .version("0.1.0")
    .option("--context <name>", "Override active context")
    .option("--token <jwt>", "Override authentication token")
    .option("--output <format>", "Output format: table, json, minimal", "table")
    .option("--no-color", "Disable colored output")
    .option("--verbose", "Enable verbose output");

  registerHealthCommand(program, configManager);
  registerConfigCommand(program, configManager);
  registerProjectsCommand(program, configManager);
  registerIssuesCommand(program, configManager);
  registerTagsCommand(program, configManager);
  registerWorkspacesCommand(program, configManager);
  registerSessionsCommand(program, configManager);

  // Apply --no-color before any command runs
  program.hook("preAction", () => {
    const opts = program.opts<{ color?: boolean }>();
    if (opts.color === false) setNoColor(true);
  });

  program.exitOverride();
  program.configureOutput({
    writeErr: (str) => printError(str.trim()),
  });

  return program;
}
```

- [ ] **Step 3: Update src/index.ts**

```typescript
#!/usr/bin/env node
import { createProgram } from "./cli.js";

const program = createProgram();
program.parseAsync(process.argv).catch(() => process.exit(1));
```

- [ ] **Step 4: Create placeholder command files** (stubs — will be implemented in following tasks)

Create each of these as minimal stubs:

`src/commands/config.ts`:
```typescript
import type { Command } from "commander";
import type { ConfigManager } from "../config/manager.js";
export function registerConfigCommand(program: Command, _configManager: ConfigManager): void {
  // Implemented in Task 7
}
```

`src/commands/projects.ts`:
```typescript
import type { Command } from "commander";
import type { ConfigManager } from "../config/manager.js";
export function registerProjectsCommand(program: Command, _configManager: ConfigManager): void {
  // Implemented in Task 8
}
```

`src/commands/issues.ts`:
```typescript
import type { Command } from "commander";
import type { ConfigManager } from "../config/manager.js";
export function registerIssuesCommand(program: Command, _configManager: ConfigManager): void {
  // Implemented in Task 9
}
```

`src/commands/tags.ts`:
```typescript
import type { Command } from "commander";
import type { ConfigManager } from "../config/manager.js";
export function registerTagsCommand(program: Command, _configManager: ConfigManager): void {
  // Implemented in Task 10
}
```

`src/commands/workspaces.ts`:
```typescript
import type { Command } from "commander";
import type { ConfigManager } from "../config/manager.js";
export function registerWorkspacesCommand(program: Command, _configManager: ConfigManager): void {
  // Implemented in Task 11
}
```

`src/commands/sessions.ts`:
```typescript
import type { Command } from "commander";
import type { ConfigManager } from "../config/manager.js";
export function registerSessionsCommand(program: Command, _configManager: ConfigManager): void {
  // Implemented in Task 12
}
```

- [ ] **Step 5: Build and test CLI boots**

Run: `npm run build && node dist/index.js --help`
Expected: Shows help text with `kanban` name, version, commands, and global flags

Run: `npm run build && node dist/index.js --version`
Expected: `0.1.0`

- [ ] **Step 6: Commit**

```bash
git add src/index.ts src/cli.ts src/commands/
git commit -m "feat: add CLI skeleton with health command and command stubs"
```

---

> **Note for agentic workers:** Tasks 7-12 follow the same pattern established in Task 6 (`health.ts`): resolve context → create client → call API → format output → handle errors. The code below provides the complete implementation. If the API response format differs from the typed interfaces, adapt the field mapping in the command handler, not in the client.

## Task 7: Config Commands

**Files:**
- Modify: `src/commands/config.ts`

- [ ] **Step 1: Implement full config command**

```typescript
// src/commands/config.ts
import type { Command } from "commander";
import { ConfigManager } from "../config/manager.js";
import { formatOutput, formatSingle, type OutputFormat } from "../output/formatter.js";
import { color, printError } from "../output/ui.js";

export function registerConfigCommand(program: Command, configManager: ConfigManager): void {
  const config = program.command("config").description("Manage Vibe Kanban contexts");

  config
    .command("add-context <name>")
    .description("Add a new context")
    .requiredOption("--url <url>", "Instance URL")
    .requiredOption("--token <token>", "JWT token")
    .option("--default-project <id>", "Default project ID")
    .action((name, opts) => {
      configManager.addContext(name, {
        url: opts.url,
        token: opts.token,
        defaultProject: opts.defaultProject,
      });
      console.log(color.success(`Context '${name}' added.`));
    });

  config
    .command("use-context <name>")
    .description("Set active context")
    .action((name) => {
      try {
        configManager.useContext(name);
        console.log(color.success(`Switched to context '${name}'.`));
      } catch (err) {
        if (err instanceof Error) printError(err.message);
        process.exit(5);
      }
    });

  config
    .command("list-contexts")
    .description("List all contexts")
    .action(() => {
      const format = program.opts<{ output?: OutputFormat }>().output ?? "table";
      const current = configManager.getCurrentContextName();
      const contexts = configManager.listContexts().map((name) => {
        const ctx = configManager.getContext(name)!;
        return { name, url: ctx.url, active: name === current ? "*" : "" };
      });
      console.log(formatOutput(contexts, ["active", "name", "url"], format));
    });

  config
    .command("remove-context <name>")
    .description("Remove a context")
    .action((name) => {
      configManager.removeContext(name);
      console.log(color.success(`Context '${name}' removed.`));
    });

  config
    .command("show")
    .description("Show active context details")
    .action(() => {
      try {
        const format = program.opts<{ output?: OutputFormat }>().output ?? "table";
        const info = configManager.showCurrentContext();
        console.log(formatSingle(info as unknown as Record<string, unknown>, format));
      } catch (err) {
        if (err instanceof Error) printError(err.message, "Use 'kanban config add-context' to add one.");
        process.exit(5);
      }
    });
}
```

- [ ] **Step 2: Build and run `kanban config --help`**

Expected output:
```
Usage: kanban config [command]

Manage Vibe Kanban contexts

Commands:
  add-context <name>     Add a new context
  use-context <name>     Set active context
  list-contexts          List all contexts
  remove-context <name>  Remove a context
  show                   Show active context details
```

- [ ] **Step 3: Commit**

```bash
git add src/commands/config.ts
git commit -m "feat: implement config commands (add/use/list/remove/show context)"
```

---

## Task 8: Projects Command

**Files:**
- Modify: `src/commands/projects.ts`

- [ ] **Step 1: Implement projects list**

```typescript
// src/commands/projects.ts
import type { Command } from "commander";
import { ConfigManager } from "../config/manager.js";
import { KanbanClient } from "../client/api-client.js";
import { formatOutput, type OutputFormat } from "../output/formatter.js";
import { spinner, printError } from "../output/ui.js";

export function registerProjectsCommand(program: Command, configManager: ConfigManager): void {
  const projects = program.command("projects").description("Manage projects");

  projects
    .command("list")
    .description("List all projects")
    .action(async () => {
      const opts = program.opts<{ context?: string; token?: string; output?: OutputFormat; verbose?: boolean }>();
      try {
        const contextName = configManager.resolveContextName(opts.context, process.env["KANBAN_CONTEXT"]);
        const ctx = configManager.getContext(contextName);
        if (!ctx) { printError(`Context '${contextName}' not found.`); process.exit(5); }
        const token = configManager.resolveToken(opts.token, process.env["KANBAN_TOKEN"]);
        const client = new KanbanClient(ctx.url, token);
        const s = spinner("Fetching projects...");
        s.start();
        const data = await client.listProjects();
        s.stop();
        console.log(formatOutput(data as unknown as Record<string, unknown>[], ["id", "name"], opts.output));
      } catch (err) {
        if (err instanceof Error) { printError(err.message); if (opts.verbose) console.error(err.stack); }
        process.exit((err as { exitCode?: number }).exitCode ?? 1);
      }
    });
}
```

- [ ] **Step 2: Build and run `kanban projects --help`**

Expected output:
```
Usage: kanban projects [command]

Manage projects

Commands:
  list  List all projects
```

- [ ] **Step 3: Commit**

```bash
git add src/commands/projects.ts
git commit -m "feat: implement projects list command"
```

---

## Task 9: Issues Commands

**Files:**
- Modify: `src/commands/issues.ts`

- [ ] **Step 1: Implement all 8 subcommands**

```typescript
// src/commands/issues.ts
import type { Command } from "commander";
import { createInterface } from "node:readline/promises";
import { ConfigManager } from "../config/manager.js";
import { KanbanClient } from "../client/api-client.js";
import { formatOutput, formatSingle, type OutputFormat } from "../output/formatter.js";
import { spinner, color, printError } from "../output/ui.js";
import { toProjectId, toIssueId, toMemberId } from "../client/types.js";
import type { IssueFilters } from "../client/types.js";

async function confirm(message: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  const answer = await rl.question(`${message} (y/N) `);
  rl.close();
  return answer.toLowerCase() === "y";
}

function resolveProjectId(opts: { project?: string }, configManager: ConfigManager): string {
  if (opts.project) return opts.project;
  const ctx = configManager.getCurrentContext();
  if (ctx.defaultProject) return ctx.defaultProject;
  printError("No project specified. Use --project or set a defaultProject in your context.");
  process.exit(5);
}

export function registerIssuesCommand(program: Command, configManager: ConfigManager): void {
  const issues = program.command("issues").description("Manage issues");

  const getClientAndOpts = () => {
    const opts = program.opts<{ context?: string; token?: string; output?: OutputFormat; verbose?: boolean }>();
    const contextName = configManager.resolveContextName(opts.context, process.env["KANBAN_CONTEXT"]);
    const ctx = configManager.getContext(contextName);
    if (!ctx) { printError(`Context '${contextName}' not found.`); process.exit(5); }
    const token = configManager.resolveToken(opts.token, process.env["KANBAN_TOKEN"]);
    const client = new KanbanClient(ctx.url, token);
    return { client, opts };
  };

  issues
    .command("list")
    .description("List issues in a project")
    .option("--project <id>", "Project ID")
    .option("--status <status>", "Filter by status")
    .option("--assignee <id>", "Filter by assignee")
    .option("--limit <n>", "Items per page", parseInt)
    .option("--page <n>", "Page number", parseInt)
    .action(async (cmdOpts) => {
      const { client, opts } = getClientAndOpts();
      try {
        const projectId = resolveProjectId(cmdOpts, configManager);
        const filters: IssueFilters = {};
        if (cmdOpts.status) filters.status = cmdOpts.status;
        if (cmdOpts.assignee) filters.assignee = toMemberId(cmdOpts.assignee);
        const s = spinner("Fetching issues...");
        s.start();
        const data = await client.listIssues(toProjectId(projectId), filters, {
          limit: cmdOpts.limit,
          page: cmdOpts.page,
        });
        s.stop();
        console.log(formatOutput(
          data.items as unknown as Record<string, unknown>[],
          ["id", "title", "status", "priority"],
          opts.output,
        ));
      } catch (err) {
        if (err instanceof Error) { printError(err.message); if (opts.verbose) console.error(err.stack); }
        process.exit((err as { exitCode?: number }).exitCode ?? 1);
      }
    });

  issues
    .command("create")
    .description("Create a new issue")
    .requiredOption("--title <title>", "Issue title")
    .option("--project <id>", "Project ID")
    .option("--description <text>", "Issue description")
    .option("--priority <level>", "Priority level")
    .option("--status <status>", "Initial status")
    .action(async (cmdOpts) => {
      const { client, opts } = getClientAndOpts();
      try {
        const projectId = resolveProjectId(cmdOpts, configManager);
        const s = spinner("Creating issue...");
        s.start();
        const issue = await client.createIssue(toProjectId(projectId), {
          title: cmdOpts.title,
          description: cmdOpts.description,
          priority: cmdOpts.priority,
          status: cmdOpts.status,
        });
        s.stop();
        console.log(color.success(`Issue created: ${issue.id}`));
        console.log(formatSingle(issue as unknown as Record<string, unknown>, opts.output));
      } catch (err) {
        if (err instanceof Error) { printError(err.message); if (opts.verbose) console.error(err.stack); }
        process.exit((err as { exitCode?: number }).exitCode ?? 1);
      }
    });

  issues
    .command("get <id>")
    .description("Get issue details")
    .action(async (id) => {
      const { client, opts } = getClientAndOpts();
      try {
        const s = spinner("Fetching issue...");
        s.start();
        const issue = await client.getIssue(toIssueId(id));
        s.stop();
        console.log(formatSingle(issue as unknown as Record<string, unknown>, opts.output));
      } catch (err) {
        if (err instanceof Error) { printError(err.message); if (opts.verbose) console.error(err.stack); }
        process.exit((err as { exitCode?: number }).exitCode ?? 1);
      }
    });

  issues
    .command("update <id>")
    .description("Update an issue")
    .option("--title <title>", "New title")
    .option("--description <text>", "New description")
    .option("--priority <level>", "New priority")
    .option("--status <status>", "New status")
    .action(async (id, cmdOpts) => {
      const { client, opts } = getClientAndOpts();
      try {
        const s = spinner("Updating issue...");
        s.start();
        const issue = await client.updateIssue(toIssueId(id), {
          title: cmdOpts.title,
          description: cmdOpts.description,
          priority: cmdOpts.priority,
          status: cmdOpts.status,
        });
        s.stop();
        console.log(color.success(`Issue ${id} updated.`));
        console.log(formatSingle(issue as unknown as Record<string, unknown>, opts.output));
      } catch (err) {
        if (err instanceof Error) { printError(err.message); if (opts.verbose) console.error(err.stack); }
        process.exit((err as { exitCode?: number }).exitCode ?? 1);
      }
    });

  issues
    .command("delete <id>")
    .description("Delete an issue")
    .option("--force", "Skip confirmation")
    .action(async (id, cmdOpts) => {
      const { client, opts } = getClientAndOpts();
      try {
        if (!cmdOpts.force) {
          const ok = await confirm(`Delete issue ${id}?`);
          if (!ok) { console.log("Aborted."); return; }
        }
        const s = spinner("Deleting issue...");
        s.start();
        await client.deleteIssue(toIssueId(id));
        s.stop();
        console.log(color.success(`Issue ${id} deleted.`));
      } catch (err) {
        if (err instanceof Error) { printError(err.message); if (opts.verbose) console.error(err.stack); }
        process.exit((err as { exitCode?: number }).exitCode ?? 1);
      }
    });

  issues
    .command("assign <issueId> <memberId>")
    .description("Assign a member to an issue")
    .action(async (issueId, memberId) => {
      const { client, opts } = getClientAndOpts();
      try {
        const s = spinner("Assigning...");
        s.start();
        await client.assignIssue(toIssueId(issueId), toMemberId(memberId));
        s.stop();
        console.log(color.success(`Member ${memberId} assigned to issue ${issueId}.`));
      } catch (err) {
        if (err instanceof Error) { printError(err.message); if (opts.verbose) console.error(err.stack); }
        process.exit((err as { exitCode?: number }).exitCode ?? 1);
      }
    });

  issues
    .command("unassign <issueId> <memberId>")
    .description("Unassign a member from an issue")
    .action(async (issueId, memberId) => {
      const { client, opts } = getClientAndOpts();
      try {
        const s = spinner("Unassigning...");
        s.start();
        await client.unassignIssue(toIssueId(issueId), toMemberId(memberId));
        s.stop();
        console.log(color.success(`Member ${memberId} unassigned from issue ${issueId}.`));
      } catch (err) {
        if (err instanceof Error) { printError(err.message); if (opts.verbose) console.error(err.stack); }
        process.exit((err as { exitCode?: number }).exitCode ?? 1);
      }
    });

  issues
    .command("move <id> <status>")
    .description("Move issue to a new status")
    .action(async (id, status) => {
      const { client, opts } = getClientAndOpts();
      try {
        const s = spinner("Moving issue...");
        s.start();
        const issue = await client.moveIssue(toIssueId(id), status);
        s.stop();
        console.log(color.success(`Issue ${id} moved to '${status}'.`));
        console.log(formatSingle(issue as unknown as Record<string, unknown>, opts.output));
      } catch (err) {
        if (err instanceof Error) { printError(err.message); if (opts.verbose) console.error(err.stack); }
        process.exit((err as { exitCode?: number }).exitCode ?? 1);
      }
    });
}
```

- [ ] **Step 2: Build and run `kanban issues --help`**

Expected output:
```
Usage: kanban issues [command]

Manage issues

Commands:
  list                          List issues in a project
  create                        Create a new issue
  get <id>                      Get issue details
  update <id>                   Update an issue
  delete <id>                   Delete an issue
  assign <issueId> <memberId>   Assign a member to an issue
  unassign <issueId> <memberId> Unassign a member from an issue
  move <id> <status>            Move issue to a new status
```

- [ ] **Step 3: Commit**

```bash
git add src/commands/issues.ts
git commit -m "feat: implement issues commands (list/create/get/update/delete/assign/move)"
```

---

## Task 10: Tags Commands

**Files:**
- Modify: `src/commands/tags.ts`

- [ ] **Step 1: Implement tags commands**

```typescript
// src/commands/tags.ts
import type { Command } from "commander";
import { ConfigManager } from "../config/manager.js";
import { KanbanClient } from "../client/api-client.js";
import { formatOutput, type OutputFormat } from "../output/formatter.js";
import { spinner, color, printError } from "../output/ui.js";
import { toIssueId, toTagId } from "../client/types.js";

export function registerTagsCommand(program: Command, configManager: ConfigManager): void {
  const tags = program.command("tags").description("Manage tags");

  const getClientAndOpts = () => {
    const opts = program.opts<{ context?: string; token?: string; output?: OutputFormat; verbose?: boolean }>();
    const contextName = configManager.resolveContextName(opts.context, process.env["KANBAN_CONTEXT"]);
    const ctx = configManager.getContext(contextName);
    if (!ctx) { printError(`Context '${contextName}' not found.`); process.exit(5); }
    const token = configManager.resolveToken(opts.token, process.env["KANBAN_TOKEN"]);
    const client = new KanbanClient(ctx.url, token);
    return { client, opts };
  };

  tags
    .command("list")
    .description("List all tags")
    .action(async () => {
      const { client, opts } = getClientAndOpts();
      try {
        const s = spinner("Fetching tags...");
        s.start();
        const data = await client.listTags();
        s.stop();
        console.log(formatOutput(data as unknown as Record<string, unknown>[], ["id", "name", "color"], opts.output));
      } catch (err) {
        if (err instanceof Error) { printError(err.message); if (opts.verbose) console.error(err.stack); }
        process.exit((err as { exitCode?: number }).exitCode ?? 1);
      }
    });

  tags
    .command("add <issueId> <tagId>")
    .description("Add a tag to an issue")
    .action(async (issueId, tagId) => {
      const { client, opts } = getClientAndOpts();
      try {
        const s = spinner("Adding tag...");
        s.start();
        await client.addTag(toIssueId(issueId), toTagId(tagId));
        s.stop();
        console.log(color.success(`Tag ${tagId} added to issue ${issueId}.`));
      } catch (err) {
        if (err instanceof Error) { printError(err.message); if (opts.verbose) console.error(err.stack); }
        process.exit((err as { exitCode?: number }).exitCode ?? 1);
      }
    });

  tags
    .command("remove <issueId> <tagId>")
    .description("Remove a tag from an issue")
    .action(async (issueId, tagId) => {
      const { client, opts } = getClientAndOpts();
      try {
        const s = spinner("Removing tag...");
        s.start();
        await client.removeTag(toIssueId(issueId), toTagId(tagId));
        s.stop();
        console.log(color.success(`Tag ${tagId} removed from issue ${issueId}.`));
      } catch (err) {
        if (err instanceof Error) { printError(err.message); if (opts.verbose) console.error(err.stack); }
        process.exit((err as { exitCode?: number }).exitCode ?? 1);
      }
    });
}
```

- [ ] **Step 2: Build and run `kanban tags --help`**

Expected output:
```
Usage: kanban tags [command]

Manage tags

Commands:
  list                     List all tags
  add <issueId> <tagId>    Add a tag to an issue
  remove <issueId> <tagId> Remove a tag from an issue
```

- [ ] **Step 3: Commit**

```bash
git add src/commands/tags.ts
git commit -m "feat: implement tags commands (list/add/remove)"
```

---

## Task 11: Workspaces Commands

**Files:**
- Modify: `src/commands/workspaces.ts`

- [ ] **Step 1: Implement workspaces commands**

```typescript
// src/commands/workspaces.ts
import type { Command } from "commander";
import { createInterface } from "node:readline/promises";
import { ConfigManager } from "../config/manager.js";
import { KanbanClient } from "../client/api-client.js";
import { formatOutput, formatSingle, type OutputFormat } from "../output/formatter.js";
import { spinner, color, printError } from "../output/ui.js";
import { toIssueId, toWorkspaceId } from "../client/types.js";

async function confirm(message: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  const answer = await rl.question(`${message} (y/N) `);
  rl.close();
  return answer.toLowerCase() === "y";
}

export function registerWorkspacesCommand(program: Command, configManager: ConfigManager): void {
  const workspaces = program.command("workspaces").description("Manage workspaces");

  const getClientAndOpts = () => {
    const opts = program.opts<{ context?: string; token?: string; output?: OutputFormat; verbose?: boolean }>();
    const contextName = configManager.resolveContextName(opts.context, process.env["KANBAN_CONTEXT"]);
    const ctx = configManager.getContext(contextName);
    if (!ctx) { printError(`Context '${contextName}' not found.`); process.exit(5); }
    const token = configManager.resolveToken(opts.token, process.env["KANBAN_TOKEN"]);
    const client = new KanbanClient(ctx.url, token);
    return { client, opts };
  };

  workspaces
    .command("list")
    .description("List all workspaces")
    .action(async () => {
      const { client, opts } = getClientAndOpts();
      try {
        const s = spinner("Fetching workspaces...");
        s.start();
        const data = await client.listWorkspaces();
        s.stop();
        console.log(formatOutput(data as unknown as Record<string, unknown>[], ["id", "issueId", "status"], opts.output));
      } catch (err) {
        if (err instanceof Error) { printError(err.message); if (opts.verbose) console.error(err.stack); }
        process.exit((err as { exitCode?: number }).exitCode ?? 1);
      }
    });

  workspaces
    .command("start <issueId>")
    .description("Start a new workspace for an issue")
    .action(async (issueId) => {
      const { client, opts } = getClientAndOpts();
      try {
        const s = spinner("Starting workspace...");
        s.start();
        const ws = await client.startWorkspace(toIssueId(issueId));
        s.stop();
        console.log(color.success(`Workspace created: ${ws.id}`));
        console.log(formatSingle(ws as unknown as Record<string, unknown>, opts.output));
      } catch (err) {
        if (err instanceof Error) { printError(err.message); if (opts.verbose) console.error(err.stack); }
        process.exit((err as { exitCode?: number }).exitCode ?? 1);
      }
    });

  workspaces
    .command("delete <id>")
    .description("Delete a workspace")
    .option("--force", "Skip confirmation")
    .action(async (id, cmdOpts) => {
      const { client, opts } = getClientAndOpts();
      try {
        if (!cmdOpts.force) {
          const ok = await confirm(`Delete workspace ${id}?`);
          if (!ok) { console.log("Aborted."); return; }
        }
        const s = spinner("Deleting workspace...");
        s.start();
        await client.deleteWorkspace(toWorkspaceId(id));
        s.stop();
        console.log(color.success(`Workspace ${id} deleted.`));
      } catch (err) {
        if (err instanceof Error) { printError(err.message); if (opts.verbose) console.error(err.stack); }
        process.exit((err as { exitCode?: number }).exitCode ?? 1);
      }
    });
}
```

- [ ] **Step 2: Build and run `kanban workspaces --help`**

Expected output:
```
Usage: kanban workspaces [command]

Manage workspaces

Commands:
  list             List all workspaces
  start <issueId>  Start a new workspace for an issue
  delete <id>      Delete a workspace
```

- [ ] **Step 3: Commit**

```bash
git add src/commands/workspaces.ts
git commit -m "feat: implement workspaces commands (list/start/delete)"
```

---

## Task 12: Sessions Commands

**Files:**
- Modify: `src/commands/sessions.ts`

- [ ] **Step 1: Implement sessions commands**

```typescript
// src/commands/sessions.ts
import type { Command } from "commander";
import { ConfigManager } from "../config/manager.js";
import { KanbanClient } from "../client/api-client.js";
import { formatOutput, formatSingle, type OutputFormat } from "../output/formatter.js";
import { spinner, color, printError } from "../output/ui.js";
import { toWorkspaceId, toSessionId } from "../client/types.js";

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString("utf-8").trim();
}

export function registerSessionsCommand(program: Command, configManager: ConfigManager): void {
  const sessions = program.command("sessions").description("Manage sessions");

  const getClientAndOpts = () => {
    const opts = program.opts<{ context?: string; token?: string; output?: OutputFormat; verbose?: boolean }>();
    const contextName = configManager.resolveContextName(opts.context, process.env["KANBAN_CONTEXT"]);
    const ctx = configManager.getContext(contextName);
    if (!ctx) { printError(`Context '${contextName}' not found.`); process.exit(5); }
    const token = configManager.resolveToken(opts.token, process.env["KANBAN_TOKEN"]);
    const client = new KanbanClient(ctx.url, token);
    return { client, opts };
  };

  sessions
    .command("list <workspaceId>")
    .description("List sessions in a workspace")
    .action(async (workspaceId) => {
      const { client, opts } = getClientAndOpts();
      try {
        const s = spinner("Fetching sessions...");
        s.start();
        const data = await client.listSessions(toWorkspaceId(workspaceId));
        s.stop();
        console.log(formatOutput(data as unknown as Record<string, unknown>[], ["id", "workspaceId", "status"], opts.output));
      } catch (err) {
        if (err instanceof Error) { printError(err.message); if (opts.verbose) console.error(err.stack); }
        process.exit((err as { exitCode?: number }).exitCode ?? 1);
      }
    });

  sessions
    .command("create <workspaceId>")
    .description("Create a new session in a workspace")
    .action(async (workspaceId) => {
      const { client, opts } = getClientAndOpts();
      try {
        const s = spinner("Creating session...");
        s.start();
        const session = await client.createSession(toWorkspaceId(workspaceId));
        s.stop();
        console.log(color.success(`Session created: ${session.id}`));
        console.log(formatSingle(session as unknown as Record<string, unknown>, opts.output));
      } catch (err) {
        if (err instanceof Error) { printError(err.message); if (opts.verbose) console.error(err.stack); }
        process.exit((err as { exitCode?: number }).exitCode ?? 1);
      }
    });

  sessions
    .command("prompt <sessionId>")
    .description("Send a prompt to a session")
    .option("--message <text>", "Prompt message (reads from stdin if not provided)")
    .action(async (sessionId, cmdOpts) => {
      const { client, opts } = getClientAndOpts();
      try {
        let message: string;
        if (cmdOpts.message) {
          message = cmdOpts.message;
        } else {
          if (process.stdin.isTTY) {
            printError("No --message provided and stdin is a TTY. Pipe input or use --message.");
            process.exit(1);
          }
          message = await readStdin();
          if (!message) {
            printError("Empty input from stdin.");
            process.exit(1);
          }
        }
        const s = spinner("Sending prompt...");
        s.start();
        const execution = await client.runSessionPrompt(toSessionId(sessionId), message);
        s.stop();
        console.log(formatSingle(execution as unknown as Record<string, unknown>, opts.output));
      } catch (err) {
        if (err instanceof Error) { printError(err.message); if (opts.verbose) console.error(err.stack); }
        process.exit((err as { exitCode?: number }).exitCode ?? 1);
      }
    });
}
```

- [ ] **Step 2: Build and run `kanban sessions --help`**

Expected output:
```
Usage: kanban sessions [command]

Manage sessions

Commands:
  list <workspaceId>    List sessions in a workspace
  create <workspaceId>  Create a new session in a workspace
  prompt <sessionId>    Send a prompt to a session
```

- [ ] **Step 3: Commit**

```bash
git add src/commands/sessions.ts
git commit -m "feat: implement sessions commands (list/create/prompt)"
```

---

## Task 13: Integration Test & Final Polish

**Files:**
- Test: `src/cli.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Write CLI integration test**

```typescript
// src/cli.test.ts
import { describe, it, expect } from "vitest";
import { createProgram } from "./cli.js";

describe("CLI", () => {
  it("parses --version", async () => {
    const program = createProgram();
    let output = "";
    program.configureOutput({ writeOut: (str) => { output = str; } });
    try {
      await program.parseAsync(["node", "kanban", "--version"]);
    } catch {
      // commander throws on --version
    }
    expect(output.trim()).toBe("0.1.0");
  });

  it("registers all top-level commands", () => {
    const program = createProgram();
    const names = program.commands.map((c) => c.name());
    expect(names).toContain("health");
    expect(names).toContain("config");
    expect(names).toContain("issues");
    expect(names).toContain("projects");
    expect(names).toContain("tags");
    expect(names).toContain("workspaces");
    expect(names).toContain("sessions");
  });
});
```

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: No errors

- [ ] **Step 4: Run build**

Run: `npm run build`
Expected: `dist/index.js` created

- [ ] **Step 5: Verify final binary**

Run: `node dist/index.js --help`
Expected: Shows all 7 commands with descriptions

- [ ] **Step 5b: Verify startup performance**

Run: `time node dist/index.js --help > /dev/null`
Expected: real < 0.1s (100ms as specified in RNF-01)

- [ ] **Step 6: Commit**

```bash
git add src/cli.test.ts
git commit -m "test: add CLI integration tests"
```

---

## Task 14: CLAUDE.md

**Files:**
- Create: `CLAUDE.md`

- [ ] **Step 1: Create CLAUDE.md with build/test/lint commands and architecture overview**

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add CLAUDE.md for Claude Code guidance"
```
