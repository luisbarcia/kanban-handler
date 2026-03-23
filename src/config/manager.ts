import Conf from "conf";
import { ConfigError } from "../utils/errors.js";

/**
 * Connection settings stored for a single named context.
 * A context represents one configured Kanban API target (server URL + auth token).
 */
export interface ContextConfig {
  /** Base URL of the Kanban API server (e.g. `"https://kanban.example.com"`). */
  url: string;
  /** Bearer token used to authenticate API requests. */
  token: string;
  /** Optional project identifier selected by default for this context. */
  defaultProject?: string;
}

interface StoreSchema {
  currentContext: string;
  contexts: Record<string, ContextConfig>;
}

/**
 * Manages named CLI contexts, each holding a URL, auth token, and optional
 * default project. Contexts are persisted to disk via `conf` or kept in-memory
 * for testing. At most one context is "current" at a time.
 */
export class ConfigManager {
  private store: Conf<StoreSchema> | Map<string, unknown>;
  private inMemory: boolean;

  private constructor(store: Conf<StoreSchema> | Map<string, unknown>, inMemory: boolean) {
    this.store = store;
    this.inMemory = inMemory;
  }

  /**
   * Creates a `ConfigManager` backed by a persistent on-disk `conf` store.
   * On Unix systems the config file is chmod'd to 600 after creation.
   *
   * @returns A fully initialised `ConfigManager` instance.
   */
  static create(): ConfigManager {
    const store = new Conf<StoreSchema>({
      projectName: "kanban-handler",
      defaults: { currentContext: "", contexts: {} },
      configFileMode: 0o600,
    });
    return new ConfigManager(store, false);
  }

  /**
   * Creates a `ConfigManager` backed by an in-memory `Map`.
   * Intended for unit tests — no files are read or written.
   *
   * @returns An ephemeral `ConfigManager` instance.
   */
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

  /**
   * Adds or overwrites a named context. If no current context is set,
   * the new context is automatically activated.
   *
   * @param name - Unique name for the context (e.g. `"production"`).
   * @param config - Connection settings to store under this name.
   */
  addContext(name: string, config: ContextConfig): void {
    const contexts = { ...this.get("contexts"), [name]: config };
    this.set("contexts", contexts);
    if (!this.get("currentContext")) {
      this.set("currentContext", name);
    }
  }

  /**
   * Removes a named context. If the removed context was active, the current
   * context switches to the first remaining context (or is cleared).
   *
   * @param name - Name of the context to remove.
   */
  removeContext(name: string): void {
    const contexts = { ...this.get("contexts") };
    delete contexts[name];
    this.set("contexts", contexts);
    if (this.get("currentContext") === name) {
      const remaining = Object.keys(contexts);
      this.set("currentContext", remaining[0] ?? "");
    }
  }

  /**
   * Sets the active context by name.
   *
   * @param name - Name of the context to activate.
   * @throws {ConfigError} If no context with that name exists.
   */
  useContext(name: string): void {
    const contexts = this.get("contexts");
    if (!contexts[name]) {
      throw new ConfigError(`Context '${name}' not found. Use 'kanban config list-contexts' to see available contexts.`);
    }
    this.set("currentContext", name);
  }

  /**
   * Returns the configuration for a named context, or `undefined` if it
   * does not exist.
   *
   * @param name - Name of the context to look up.
   * @returns The stored `ContextConfig`, or `undefined`.
   */
  getContext(name: string): ContextConfig | undefined {
    return this.get("contexts")[name];
  }

  /** Returns the name of the currently active context, or an empty string if none is set. */
  getCurrentContextName(): string {
    return this.get("currentContext");
  }

  /**
   * Returns the configuration for the currently active context.
   *
   * @returns The active `ContextConfig`.
   * @throws {ConfigError} If no context is active or the active context name is stale.
   */
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

  /** Returns the names of all stored contexts in insertion order. */
  listContexts(): string[] {
    return Object.keys(this.get("contexts"));
  }

  /**
   * Resolves the context name to use for a request, applying precedence:
   * CLI flag > environment variable > current context.
   *
   * @param flag - Value of the `--context` CLI flag, if provided.
   * @param envVar - Value of the `KANBAN_CONTEXT` environment variable, if set.
   * @returns The resolved context name.
   */
  resolveContextName(flag?: string, envVar?: string): string {
    return flag ?? envVar ?? this.getCurrentContextName();
  }

  /**
   * Resolves the auth token to use for a request, applying precedence:
   * CLI flag > environment variable > current context token.
   *
   * @param flag - Value of the `--token` CLI flag, if provided.
   * @param envVar - Value of the `KANBAN_TOKEN` environment variable, if set.
   * @returns The resolved bearer token.
   * @throws {ConfigError} If no flag/env var is given and there is no active context.
   */
  resolveToken(flag?: string, envVar?: string): string {
    if (flag) return flag;
    if (envVar) return envVar;
    return this.getCurrentContext().token;
  }

  /**
   * Returns a display-safe summary of the current context, with the auth token
   * partially masked (first 4 and last 4 characters are preserved).
   *
   * @returns An object with `name`, `url`, optional `defaultProject`, and `tokenMasked`.
   * @throws {ConfigError} If there is no active context.
   */
  showCurrentContext(): { name: string; url: string; defaultProject?: string; tokenMasked: string } {
    const name = this.getCurrentContextName();
    const ctx = this.getCurrentContext();
    const tokenMasked = ctx.token.length > 8
      ? ctx.token.slice(0, 4) + "****" + ctx.token.slice(-4)
      : "****";
    const result: { name: string; url: string; defaultProject?: string; tokenMasked: string } = {
      name,
      url: ctx.url,
      tokenMasked,
    };
    if (ctx.defaultProject !== undefined) {
      result.defaultProject = ctx.defaultProject;
    }
    return result;
  }
}
