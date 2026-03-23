// src/commands/issues.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Command } from "commander";
import { ConfigManager } from "../config/manager.js";
import { registerIssuesCommand } from "./issues.js";
import { ApiError } from "../utils/errors.js";

// Shared mutable mock methods — each test can override per-method
const mockMethods = {
  listIssues: vi.fn(),
  createIssue: vi.fn(),
  getIssue: vi.fn(),
  updateIssue: vi.fn(),
  deleteIssue: vi.fn(),
  assignIssue: vi.fn(),
  unassignIssue: vi.fn(),
  moveIssue: vi.fn(),
};

// Mock KanbanClient — must use class syntax for Vitest 4 constructor support
vi.mock("../client/api-client.js", () => ({
  KanbanClient: class {
    listIssues(...args: unknown[]) { return mockMethods.listIssues(...args); }
    createIssue(...args: unknown[]) { return mockMethods.createIssue(...args); }
    getIssue(...args: unknown[]) { return mockMethods.getIssue(...args); }
    updateIssue(...args: unknown[]) { return mockMethods.updateIssue(...args); }
    deleteIssue(...args: unknown[]) { return mockMethods.deleteIssue(...args); }
    assignIssue(...args: unknown[]) { return mockMethods.assignIssue(...args); }
    unassignIssue(...args: unknown[]) { return mockMethods.unassignIssue(...args); }
    moveIssue(...args: unknown[]) { return mockMethods.moveIssue(...args); }
  },
}));

// Mock the confirm utility so tests never block on stdin
vi.mock("../utils/prompt.js", () => ({
  confirm: vi.fn(),
}));

import { confirm } from "../utils/prompt.js";

const mockConfirm = vi.mocked(confirm);

/** A minimal issue returned by mocked API calls. */
const MOCK_ISSUE = { id: "issue-1", title: "Test issue", status: "todo", priority: "medium" };

/** Build a bare-minimum Commander program and register the issues group. */
function makeProgram(configManager: ConfigManager): Command {
  const program = new Command();
  program.exitOverride();
  program.option("--context <name>", "Override active context");
  program.option("--token <jwt>", "Override auth token");
  program.option("--output <format>", "Output format", "table");
  program.option("--verbose", "Verbose output");
  program.configureOutput({ writeOut: () => {}, writeErr: () => {} });
  registerIssuesCommand(program, configManager);
  return program;
}

describe("issues command", () => {
  let configManager: ConfigManager;
  let logs: string[];
  let errors: string[];

  beforeEach(() => {
    configManager = ConfigManager.createInMemory();
    configManager.addContext("test", { url: "https://kanban.test", token: "tok", defaultProject: "proj-default" });

    logs = [];
    errors = [];
    vi.spyOn(console, "log").mockImplementation((...args) => logs.push(args.join(" ")));
    vi.spyOn(console, "error").mockImplementation((...args) => errors.push(args.join(" ")));

    // Reset all shared mocks before each test
    Object.values(mockMethods).forEach((m) => m.mockReset());
    mockConfirm.mockReset();

    // Happy-path defaults
    mockMethods.listIssues.mockResolvedValue([MOCK_ISSUE]);
    mockMethods.createIssue.mockResolvedValue(MOCK_ISSUE);
    mockMethods.getIssue.mockResolvedValue(MOCK_ISSUE);
    mockMethods.updateIssue.mockResolvedValue({ ...MOCK_ISSUE, status: "in_progress" });
    mockMethods.deleteIssue.mockResolvedValue(undefined);
    mockMethods.assignIssue.mockResolvedValue(undefined);
    mockMethods.unassignIssue.mockResolvedValue(undefined);
    mockMethods.moveIssue.mockResolvedValue({ ...MOCK_ISSUE, status: "done" });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── list ──────────────────────────────────────────────────────────────────

  it("list calls listIssues with the given --project flag", async () => {
    const program = makeProgram(configManager);
    await program.parseAsync(["node", "kanban", "issues", "list", "--project", "proj-123"]);

    expect(mockMethods.listIssues).toHaveBeenCalledTimes(1);
    const [projectId] = mockMethods.listIssues.mock.calls[0] as unknown[];
    expect(projectId).toBe("proj-123");
  });

  it("list uses defaultProject from context when --project is not provided", async () => {
    const program = makeProgram(configManager);
    await program.parseAsync(["node", "kanban", "issues", "list"]);

    expect(mockMethods.listIssues).toHaveBeenCalledTimes(1);
    const [projectId] = mockMethods.listIssues.mock.calls[0] as unknown[];
    expect(projectId).toBe("proj-default");
  });

  it("list exits with code 5 when no project is available", async () => {
    // Context without a defaultProject
    configManager.addContext("noproj", { url: "https://kanban.test", token: "tok" });
    configManager.useContext("noproj");

    const program = makeProgram(configManager);
    const mockExit = vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("process.exit:5"); });

    await expect(program.parseAsync(["node", "kanban", "issues", "list"])).rejects.toThrow("process.exit:5");
    expect(mockExit).toHaveBeenCalledWith(5);
    mockExit.mockRestore();
  });

  it("list outputs issue data to console", async () => {
    const program = makeProgram(configManager);
    await program.parseAsync(["node", "kanban", "issues", "list", "--project", "p1"]);

    expect(logs.join("\n")).toContain("issue-1");
  });

  // ─── create ────────────────────────────────────────────────────────────────

  it("create sends correct title to createIssue", async () => {
    const program = makeProgram(configManager);
    await program.parseAsync([
      "node", "kanban", "issues", "create",
      "--title", "My New Issue",
      "--project", "proj-abc",
    ]);

    expect(mockMethods.createIssue).toHaveBeenCalledTimes(1);
    const [, input] = mockMethods.createIssue.mock.calls[0] as [unknown, { title: string }];
    expect(input.title).toBe("My New Issue");
  });

  it("create prints success message with issue id", async () => {
    const program = makeProgram(configManager);
    await program.parseAsync([
      "node", "kanban", "issues", "create",
      "--title", "Another Issue",
    ]);

    expect(logs.some((l) => l.includes("issue-1"))).toBe(true);
  });

  it("create passes optional description and priority", async () => {
    const program = makeProgram(configManager);
    await program.parseAsync([
      "node", "kanban", "issues", "create",
      "--title", "With extras",
      "--description", "Some details",
      "--priority", "high",
    ]);

    const [, input] = mockMethods.createIssue.mock.calls[0] as [unknown, { description?: string; priority?: string }];
    expect(input.description).toBe("Some details");
    expect(input.priority).toBe("high");
  });

  // ─── get ───────────────────────────────────────────────────────────────────

  it("get calls getIssue with the correct id", async () => {
    const program = makeProgram(configManager);
    await program.parseAsync(["node", "kanban", "issues", "get", "issue-99"]);

    expect(mockMethods.getIssue).toHaveBeenCalledTimes(1);
    const [issueId] = mockMethods.getIssue.mock.calls[0] as [string];
    expect(issueId).toBe("issue-99");
  });

  // ─── delete ────────────────────────────────────────────────────────────────

  it("delete --force skips confirmation and calls deleteIssue", async () => {
    const program = makeProgram(configManager);
    await program.parseAsync(["node", "kanban", "issues", "delete", "issue-1", "--force"]);

    expect(mockConfirm).not.toHaveBeenCalled();
    expect(mockMethods.deleteIssue).toHaveBeenCalledTimes(1);
    const [issueId] = mockMethods.deleteIssue.mock.calls[0] as [string];
    expect(issueId).toBe("issue-1");
  });

  it("delete without --force prompts for confirmation", async () => {
    mockConfirm.mockResolvedValue(true);
    const program = makeProgram(configManager);
    await program.parseAsync(["node", "kanban", "issues", "delete", "issue-1"]);

    expect(mockConfirm).toHaveBeenCalledTimes(1);
    expect(mockMethods.deleteIssue).toHaveBeenCalledTimes(1);
  });

  it("delete aborts when user declines confirmation", async () => {
    mockConfirm.mockResolvedValue(false);
    const program = makeProgram(configManager);
    await program.parseAsync(["node", "kanban", "issues", "delete", "issue-1"]);

    expect(mockMethods.deleteIssue).not.toHaveBeenCalled();
    expect(logs.some((l) => l.toLowerCase().includes("abort"))).toBe(true);
  });

  it("delete --force prints success message", async () => {
    const program = makeProgram(configManager);
    await program.parseAsync(["node", "kanban", "issues", "delete", "issue-1", "--force"]);

    expect(logs.some((l) => l.includes("issue-1") && l.toLowerCase().includes("delet"))).toBe(true);
  });

  // ─── move ──────────────────────────────────────────────────────────────────

  it("move calls moveIssue with correct id and status", async () => {
    const program = makeProgram(configManager);
    await program.parseAsync(["node", "kanban", "issues", "move", "issue-1", "done"]);

    expect(mockMethods.moveIssue).toHaveBeenCalledTimes(1);
    const [issueId, status] = mockMethods.moveIssue.mock.calls[0] as [string, string];
    expect(issueId).toBe("issue-1");
    expect(status).toBe("done");
  });

  it("move prints success with new status", async () => {
    const program = makeProgram(configManager);
    await program.parseAsync(["node", "kanban", "issues", "move", "issue-1", "in_progress"]);

    expect(logs.some((l) => l.includes("in_progress") || l.includes("moved"))).toBe(true);
  });

  // ─── assign / unassign ─────────────────────────────────────────────────────

  it("assign calls assignIssue with correct ids", async () => {
    const program = makeProgram(configManager);
    await program.parseAsync(["node", "kanban", "issues", "assign", "issue-1", "member-5"]);

    expect(mockMethods.assignIssue).toHaveBeenCalledTimes(1);
    const [issueId, memberId] = mockMethods.assignIssue.mock.calls[0] as [string, string];
    expect(issueId).toBe("issue-1");
    expect(memberId).toBe("member-5");
  });

  it("unassign calls unassignIssue with correct ids", async () => {
    const program = makeProgram(configManager);
    await program.parseAsync(["node", "kanban", "issues", "unassign", "issue-1", "member-5"]);

    expect(mockMethods.unassignIssue).toHaveBeenCalledTimes(1);
    const [issueId, memberId] = mockMethods.unassignIssue.mock.calls[0] as [string, string];
    expect(issueId).toBe("issue-1");
    expect(memberId).toBe("member-5");
  });

  // ─── error propagation ─────────────────────────────────────────────────────

  it("list exits with ApiError exit code (3) on ApiError", async () => {
    mockMethods.listIssues.mockRejectedValue(new ApiError("Project not found", 404));
    const program = makeProgram(configManager);
    const mockExit = vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("process.exit:3"); });

    await expect(
      program.parseAsync(["node", "kanban", "issues", "list", "--project", "bad-proj"]),
    ).rejects.toThrow("process.exit:3");
    expect(mockExit).toHaveBeenCalledWith(3);
    mockExit.mockRestore();
  });
});
