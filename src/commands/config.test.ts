// src/commands/config.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Command } from "commander";
import { ConfigManager } from "../config/manager.js";
import { registerConfigCommand } from "./config.js";

function makeProgram(configManager: ConfigManager): Command {
  const program = new Command();
  program.exitOverride();
  program.option("--output <format>", "Output format", "table");
  program.configureOutput({ writeOut: () => {}, writeErr: () => {} });
  registerConfigCommand(program, configManager);
  return program;
}

describe("config command", () => {
  let configManager: ConfigManager;
  let logs: string[];
  let errors: string[];

  beforeEach(() => {
    configManager = ConfigManager.createInMemory();
    logs = [];
    errors = [];
    vi.spyOn(console, "log").mockImplementation((...args) => logs.push(args.join(" ")));
    vi.spyOn(console, "error").mockImplementation((...args) => errors.push(args.join(" ")));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── add-context ──────────────────────────────────────────────────────────

  it("add-context stores context and prints success", async () => {
    const program = makeProgram(configManager);
    await program.parseAsync([
      "node", "kanban", "config", "add-context", "prod",
      "--url", "https://kanban.example.com",
      "--token", "my-token",
    ]);
    const ctx = configManager.getContext("prod");
    expect(ctx).toBeDefined();
    expect(ctx?.url).toBe("https://kanban.example.com");
    expect(ctx?.token).toBe("my-token");
    expect(logs.some((l) => l.includes("prod") && l.includes("added"))).toBe(true);
  });

  it("add-context with --default-project stores defaultProject", async () => {
    const program = makeProgram(configManager);
    await program.parseAsync([
      "node", "kanban", "config", "add-context", "staging",
      "--url", "https://staging.example.com",
      "--token", "tok123",
      "--default-project", "proj-abc",
    ]);
    const ctx = configManager.getContext("staging");
    expect(ctx?.defaultProject).toBe("proj-abc");
  });

  it("add-context with invalid URL exits with code 5", async () => {
    const program = makeProgram(configManager);
    const mockExit = vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("process.exit:5"); });
    await expect(
      program.parseAsync([
        "node", "kanban", "config", "add-context", "bad",
        "--url", "not-a-url",
        "--token", "tok",
      ]),
    ).rejects.toThrow("process.exit:5");
    expect(mockExit).toHaveBeenCalledWith(5);
    mockExit.mockRestore();
  });

  it("add-context with HTTP URL prints warning", async () => {
    const program = makeProgram(configManager);
    await program.parseAsync([
      "node", "kanban", "config", "add-context", "insecure",
      "--url", "http://kanban.example.com",
      "--token", "tok",
    ]);
    expect(errors.some((e) => e.toLowerCase().includes("https") || e.toLowerCase().includes("encrypted"))).toBe(true);
  });

  // ─── use-context ──────────────────────────────────────────────────────────

  it("use-context switches active context", async () => {
    configManager.addContext("alpha", { url: "https://alpha.example.com", token: "t1" });
    configManager.addContext("beta", { url: "https://beta.example.com", token: "t2" });
    const program = makeProgram(configManager);
    await program.parseAsync(["node", "kanban", "config", "use-context", "beta"]);
    expect(configManager.getCurrentContextName()).toBe("beta");
    expect(logs.some((l) => l.includes("beta"))).toBe(true);
  });

  it("use-context with unknown name exits with code 5", async () => {
    const program = makeProgram(configManager);
    const mockExit = vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("process.exit:5"); });
    await expect(
      program.parseAsync(["node", "kanban", "config", "use-context", "nonexistent"]),
    ).rejects.toThrow("process.exit:5");
    expect(mockExit).toHaveBeenCalledWith(5);
    mockExit.mockRestore();
  });

  // ─── list-contexts ─────────────────────────────────────────────────────────

  it("list-contexts shows all contexts", async () => {
    configManager.addContext("ctx1", { url: "https://one.example.com", token: "t1" });
    configManager.addContext("ctx2", { url: "https://two.example.com", token: "t2" });
    const program = makeProgram(configManager);
    await program.parseAsync(["node", "kanban", "config", "list-contexts"]);
    const output = logs.join("\n");
    expect(output).toContain("ctx1");
    expect(output).toContain("ctx2");
  });

  it("list-contexts marks active context with *", async () => {
    configManager.addContext("ctx1", { url: "https://one.example.com", token: "t1" });
    configManager.addContext("ctx2", { url: "https://two.example.com", token: "t2" });
    configManager.useContext("ctx2");
    const program = makeProgram(configManager);
    await program.parseAsync(["node", "kanban", "config", "list-contexts"]);
    const output = logs.join("\n");
    // The active context has * marker
    expect(output).toContain("*");
  });

  // ─── remove-context ────────────────────────────────────────────────────────

  it("remove-context removes context and prints success", async () => {
    configManager.addContext("toremove", { url: "https://example.com", token: "tok" });
    configManager.addContext("keep", { url: "https://keep.example.com", token: "tok2" });
    const program = makeProgram(configManager);
    await program.parseAsync(["node", "kanban", "config", "remove-context", "toremove"]);
    expect(configManager.getContext("toremove")).toBeUndefined();
    expect(logs.some((l) => l.includes("toremove") && l.includes("removed"))).toBe(true);
  });

  // ─── show ──────────────────────────────────────────────────────────────────

  it("show displays masked token for active context", async () => {
    configManager.addContext("main", { url: "https://main.example.com", token: "abcdefghijklmnop" });
    const program = makeProgram(configManager);
    await program.parseAsync(["node", "kanban", "config", "show"]);
    const output = logs.join("\n");
    // Token should be masked: first4 + **** + last4
    expect(output).toContain("abcd");
    expect(output).toContain("mnop");
    expect(output).toContain("****");
  });

  it("show includes defaultProject when set", async () => {
    configManager.addContext("main", {
      url: "https://main.example.com",
      token: "abcdefghijklmnop",
      defaultProject: "proj-xyz",
    });
    const program = makeProgram(configManager);
    await program.parseAsync(["node", "kanban", "config", "show"]);
    expect(logs.join("\n")).toContain("proj-xyz");
  });

  it("show exits with code 5 when no context configured", async () => {
    const program = makeProgram(configManager);
    const mockExit = vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("process.exit:5"); });
    await expect(
      program.parseAsync(["node", "kanban", "config", "show"]),
    ).rejects.toThrow("process.exit:5");
    expect(mockExit).toHaveBeenCalledWith(5);
    mockExit.mockRestore();
  });
});
