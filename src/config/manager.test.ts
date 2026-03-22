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
