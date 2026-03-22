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
