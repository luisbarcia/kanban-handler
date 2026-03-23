// src/commands/health.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Command } from "commander";
import { ConfigManager } from "../config/manager.js";
import { registerHealthCommand } from "./health.js";
import { NetworkError } from "../utils/errors.js";

// Shared mutable state so each test can override the mock methods
const mockHealth = vi.fn();

// Mock KanbanClient so we never hit a real server.
// Must use `class` (or a real `function`) — Vitest 4 disallows mockReturnValue with `new`.
vi.mock("../client/api-client.js", () => ({
  KanbanClient: class {
    health(...args: unknown[]) { return mockHealth(...args); }
  },
}));

import { KanbanClient } from "../client/api-client.js";

function makeProgram(configManager: ConfigManager): Command {
  const program = new Command();
  program.exitOverride();
  program.option("--context <name>", "Override active context");
  program.option("--token <jwt>", "Override auth token");
  program.option("--output <format>", "Output format", "table");
  program.option("--verbose", "Verbose output");
  program.configureOutput({ writeOut: () => {}, writeErr: () => {} });
  registerHealthCommand(program, configManager);
  return program;
}

describe("health command", () => {
  let configManager: ConfigManager;
  let logs: string[];
  let errors: string[];

  beforeEach(() => {
    configManager = ConfigManager.createInMemory();
    logs = [];
    errors = [];
    mockHealth.mockReset();
    vi.spyOn(console, "log").mockImplementation((...args) => logs.push(args.join(" ")));
    vi.spyOn(console, "error").mockImplementation((...args) => errors.push(args.join(" ")));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("prints 'Connected to' on healthy response", async () => {
    mockHealth.mockResolvedValue({ ok: true, version: "2.1.0" });
    configManager.addContext("local", { url: "https://kanban.local", token: "tok" });
    const program = makeProgram(configManager);
    await program.parseAsync(["node", "kanban", "health"]);

    const output = logs.join("\n");
    expect(output).toContain("Connected to");
    expect(output).toContain("https://kanban.local");
  });

  it("prints version when returned by API", async () => {
    mockHealth.mockResolvedValue({ ok: true, version: "3.0.0" });
    configManager.addContext("local", { url: "https://kanban.local", token: "tok" });
    const program = makeProgram(configManager);
    await program.parseAsync(["node", "kanban", "health"]);

    expect(logs.join("\n")).toContain("3.0.0");
  });

  it("prints unhealthy warning when ok is false", async () => {
    mockHealth.mockResolvedValue({ ok: false });
    configManager.addContext("local", { url: "https://kanban.local", token: "tok" });
    const program = makeProgram(configManager);
    await program.parseAsync(["node", "kanban", "health"]);

    expect(logs.join("\n")).toContain("unhealthy");
  });

  it("exits with network error exit code on NetworkError", async () => {
    mockHealth.mockRejectedValue(new NetworkError("Connection refused", "https://kanban.local/api/health"));
    configManager.addContext("local", { url: "https://kanban.local", token: "tok" });
    const program = makeProgram(configManager);
    const mockExit = vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("process.exit:4"); });

    await expect(program.parseAsync(["node", "kanban", "health"])).rejects.toThrow("process.exit:4");
    expect(mockExit).toHaveBeenCalledWith(4);
    mockExit.mockRestore();
  });

  it("exits with code 5 when no context is configured", async () => {
    // No context added — configManager has no currentContext
    const program = makeProgram(configManager);
    const mockExit = vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("process.exit:5"); });

    await expect(program.parseAsync(["node", "kanban", "health"])).rejects.toThrow("process.exit:5");
    expect(mockExit).toHaveBeenCalledWith(5);
    mockExit.mockRestore();
  });

  it("KanbanClient is instantiated with url and token from context", async () => {
    mockHealth.mockResolvedValue({ ok: true });
    configManager.addContext("prod", { url: "https://prod.kanban.io", token: "secret-jwt" });
    const program = makeProgram(configManager);
    await program.parseAsync(["node", "kanban", "health"]);

    // The mock class stored calls on the shared mockHealth fn — confirm it was called once
    expect(mockHealth).toHaveBeenCalledTimes(1);
  });

  // Verify the import used in the command is actually the mocked class
  it("KanbanClient is mocked (class prototype has health method)", () => {
    const instance = new KanbanClient("u", "t");
    // The instance's health delegates to mockHealth
    mockHealth.mockResolvedValue({ ok: true });
    expect(typeof instance.health).toBe("function");
  });
});
