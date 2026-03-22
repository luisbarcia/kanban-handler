/**
 * Attack Taxonomy tests for endpoints.
 *
 * Covers: Input Attacks (empty, undefined, special chars), boundary values,
 * missing pagination params, partial filter objects.
 * DO NOT modify source files — test only.
 */
import { describe, it, expect } from "vitest";
import { endpoints } from "./endpoints.js";

describe("endpoints — Attack Taxonomy", () => {
  const base = "https://kanban.test";

  // ─── Input Attacks — missing/undefined filters ────────────────────

  describe("Input Attacks — listIssues missing params", () => {
    it("listIssues with no filters/pagination → URL has no query string extras beyond project_id", () => {
      const url = endpoints.listIssues(base, "p1");
      expect(url).toBe(`${base}/api/issues?project_id=p1`);
    });

    it("listIssues with undefined filters → URL omits status and assignee", () => {
      const url = endpoints.listIssues(base, "p1", undefined, { limit: 10 });
      expect(url).not.toContain("status=");
      expect(url).not.toContain("assignee=");
      expect(url).toContain("limit=10");
    });

    it("listIssues with undefined pagination → URL omits limit and page", () => {
      const url = endpoints.listIssues(base, "p1", { status: "open" }, undefined);
      expect(url).not.toContain("limit=");
      expect(url).not.toContain("page=");
      expect(url).toContain("status=open");
    });

    it("listIssues with empty filters object → no extra params beyond project_id", () => {
      // An empty filters/pagination object has no defined properties
      const url = endpoints.listIssues(base, "p1", {}, {});
      expect(url).toBe(`${base}/api/issues?project_id=p1`);
    });

    it("listIssues with only status filter → URL contains status, no assignee/limit/page", () => {
      const url = endpoints.listIssues(base, "p1", { status: "done" });
      expect(url).toContain("status=done");
      expect(url).not.toContain("assignee=");
      expect(url).not.toContain("limit=");
      expect(url).not.toContain("page=");
    });

    it("listIssues with only assignee filter → URL contains assignee, no status/limit/page", () => {
      const url = endpoints.listIssues(base, "p1", { assignee: "m1" as any });
      expect(url).toContain("assignee=m1");
      expect(url).not.toContain("status=");
    });

    it("listIssues with only limit → URL contains limit, no page", () => {
      const url = endpoints.listIssues(base, "p1", undefined, { limit: 25 });
      expect(url).toContain("limit=25");
      expect(url).not.toContain("page=");
    });

    it("listIssues with only page → URL contains page, no limit", () => {
      const url = endpoints.listIssues(base, "p1", undefined, { page: 3 });
      expect(url).toContain("page=3");
      expect(url).not.toContain("limit=");
    });
  });

  // ─── Input Attacks — special characters in IDs ───────────────────

  describe("Input Attacks — special characters in IDs", () => {
    it("getIssue with slash in ID is included in URL path", () => {
      const url = endpoints.getIssue(base, "issue/sub");
      expect(url).toContain("/api/issues/issue/sub");
    });

    it("getIssue with space in ID is included in URL path", () => {
      const url = endpoints.getIssue(base, "issue with spaces");
      expect(url).toBe(`${base}/api/issues/issue with spaces`);
    });

    it("unassignIssue with special chars in memberId is in URL", () => {
      const url = endpoints.unassignIssue(base, "i1", "member@org");
      expect(url).toContain("/api/issues/i1/assignees/member@org");
    });

    it("removeTag with special chars in tagId is in URL", () => {
      const url = endpoints.removeTag(base, "issue-1", "tag:special");
      expect(url).toContain("/api/issues/issue-1/tags/tag:special");
    });

    it("deleteWorkspace with UUID-like ID is in URL", () => {
      const url = endpoints.deleteWorkspace(base, "123e4567-e89b-12d3-a456-426614174000");
      expect(url).toContain("/api/workspaces/123e4567-e89b-12d3-a456-426614174000");
    });

    it("listIssues query params are URL-encoded", () => {
      const url = endpoints.listIssues(base, "proj id/1", { status: "in progress" });
      expect(url).toContain(encodeURIComponent("proj id/1"));
      expect(url).toContain(encodeURIComponent("in progress"));
    });
  });

  // ─── Input Attacks — empty strings ──────────────────────────────

  describe("Input Attacks — empty strings in IDs", () => {
    it("getIssue with empty string ID produces valid URL", () => {
      const url = endpoints.getIssue(base, "");
      expect(url).toBe(`${base}/api/issues/`);
    });

    it("listSessions with empty workspaceId produces valid URL", () => {
      const url = endpoints.listSessions(base, "");
      expect(url).toBe(`${base}/api/workspaces//sessions`);
    });

    it("runSessionPrompt with empty sessionId produces valid URL", () => {
      const url = endpoints.runSessionPrompt(base, "");
      expect(url).toBe(`${base}/api/sessions//follow-up`);
    });
  });

  // ─── Boundary Values — pagination numbers ────────────────────────

  describe("Boundary Values — pagination numbers", () => {
    it("listIssues with limit=0 includes limit=0 in URL", () => {
      const url = endpoints.listIssues(base, "p1", undefined, { limit: 0 });
      // 0 is falsy but not undefined — the qs function uses !== undefined
      expect(url).toContain("limit=0");
    });

    it("listIssues with page=1 includes page=1", () => {
      const url = endpoints.listIssues(base, "p1", undefined, { page: 1 });
      expect(url).toContain("page=1");
    });

    it("listIssues with very large limit is preserved", () => {
      const url = endpoints.listIssues(base, "p1", undefined, { limit: 99999 });
      expect(url).toContain("limit=99999");
    });
  });

  // ─── Integration Attacks — all other endpoints ───────────────────

  describe("Integration Attacks — endpoint URL correctness", () => {
    it("listProjects returns correct URL", () => {
      expect(endpoints.listProjects(base)).toBe(`${base}/api/projects`);
    });

    it("createIssue returns correct URL (no ID in path)", () => {
      expect(endpoints.createIssue(base)).toBe(`${base}/api/issues`);
    });

    it("updateIssue and deleteIssue share the same URL pattern", () => {
      expect(endpoints.updateIssue(base, "i1")).toBe(endpoints.deleteIssue(base, "i1"));
    });

    it("assignIssue URL contains /assignees suffix", () => {
      expect(endpoints.assignIssue(base, "i42")).toBe(`${base}/api/issues/i42/assignees`);
    });

    it("addTag URL contains /tags suffix", () => {
      expect(endpoints.addTag(base, "i42")).toBe(`${base}/api/issues/i42/tags`);
    });

    it("listWorkspaces returns correct URL", () => {
      expect(endpoints.listWorkspaces(base)).toBe(`${base}/api/workspaces`);
    });

    it("startWorkspace and listWorkspaces share the same URL", () => {
      expect(endpoints.startWorkspace(base)).toBe(endpoints.listWorkspaces(base));
    });

    it("createSession URL contains workspaceId and /sessions suffix", () => {
      expect(endpoints.createSession(base, "ws-7")).toBe(`${base}/api/workspaces/ws-7/sessions`);
    });

    it("listSessions and createSession share the same URL pattern", () => {
      expect(endpoints.listSessions(base, "w1")).toBe(endpoints.createSession(base, "w1"));
    });
  });
});
