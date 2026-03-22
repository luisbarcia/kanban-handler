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
    // RNF-03: Set config file permissions to 600 on Unix
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
