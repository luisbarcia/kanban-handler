/**
 * Attack Taxonomy tests for KanbanClient.
 *
 * Covers: Error Path Attacks, Input Attacks, Integration Attacks
 * DO NOT modify source files — test only.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { KanbanClient } from "./api-client.js";
import {
  toProjectId,
  toIssueId,
  toMemberId,
  toTagId,
  toWorkspaceId,
  toSessionId,
} from "./types.js";
import { AuthError, ApiError, NetworkError, NotFoundError } from "../utils/errors.js";

describe("KanbanClient — Attack Taxonomy", () => {
  let client: KanbanClient;
  const mockFetch = vi.fn();

  function makeOkResponse(data: unknown) {
    return {
      ok: true,
      json: async () => ({ success: true, data }),
    };
  }

  function makeErrorResponse(status: number, message?: string) {
    return {
      ok: false,
      status,
      json: async () =>
        message
          ? { success: false, error_data: { message, code: "ERR" } }
          : {},
    };
  }

  beforeEach(() => {
    mockFetch.mockClear();
    client = new KanbanClient("https://kanban.test", "test-token", mockFetch);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // ─── Error Path Attacks — HTTP status codes ───────────────────────

  describe("Error Path Attacks — non-retried HTTP errors", () => {
    it("400 throws ApiError immediately (no retry)", async () => {
      mockFetch.mockResolvedValue(makeErrorResponse(400, "bad request"));
      await expect(client.health()).rejects.toThrow(ApiError);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("422 throws ApiError immediately (no retry)", async () => {
      mockFetch.mockResolvedValue(makeErrorResponse(422, "unprocessable entity"));
      await expect(client.health()).rejects.toThrow(ApiError);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("403 throws ApiError immediately (no retry)", async () => {
      mockFetch.mockResolvedValue(makeErrorResponse(403, "forbidden"));
      await expect(client.health()).rejects.toThrow(ApiError);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("400 ApiError carries the status code", async () => {
      mockFetch.mockResolvedValue(makeErrorResponse(400, "invalid input"));
      try {
        await client.health();
        expect.fail("should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).statusCode).toBe(400);
      }
    });

    it("error response with empty body falls back to 'HTTP {status}' message", async () => {
      mockFetch.mockResolvedValue(makeErrorResponse(400));
      try {
        await client.health();
        expect.fail("should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).message).toBe("HTTP 400");
      }
    });

    it("error body that throws on .json() falls back to 'HTTP {status}'", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => { throw new SyntaxError("invalid json"); },
      });
      try {
        await client.health();
        expect.fail("should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).message).toBe("HTTP 400");
      }
    });

    it("401 message is preserved from error_data", async () => {
      mockFetch.mockResolvedValue(makeErrorResponse(401, "token expired"));
      try {
        await client.health();
        expect.fail("should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(AuthError);
        expect((err as AuthError).message).toBe("token expired");
      }
    });

    it("404 message is preserved from error_data", async () => {
      mockFetch.mockResolvedValue(makeErrorResponse(404, "issue not found"));
      try {
        await client.getIssue(toIssueId("missing-id"));
        expect.fail("should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(NotFoundError);
        expect((err as NotFoundError).message).toBe("issue not found");
      }
    });
  });

  // ─── Error Path Attacks — malformed success responses ────────────

  describe("Error Path Attacks — malformed responses", () => {
    it("success response with invalid JSON body propagates error", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => { throw new SyntaxError("unexpected token"); },
      });
      await expect(client.health()).rejects.toThrow(SyntaxError);
    });

    it("success response with missing data field returns undefined", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }), // no data field
      });
      const result = await client.health();
      expect(result).toBeUndefined();
    });
  });

  // ─── Error Path Attacks — retry exhaustion ───────────────────────

  describe("Error Path Attacks — retry behavior", () => {
    it("5xx retries exactly once (2 total calls)", async () => {
      mockFetch
        .mockResolvedValueOnce(makeErrorResponse(503, "service unavailable"))
        .mockResolvedValueOnce(makeOkResponse({ ok: true }));
      // Run with fake timers: start the request and advance time past retry delay
      const resultPromise = client.health();
      await vi.advanceTimersByTimeAsync(1500);
      const result = await resultPromise;
      expect(result).toEqual({ ok: true });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("NetworkError (TypeError) retries once then throws NetworkError", async () => {
      // Use real timers for this test to avoid timing complexities
      vi.useRealTimers();
      mockFetch
        .mockRejectedValueOnce(new TypeError("ECONNREFUSED"))
        .mockRejectedValueOnce(new TypeError("ECONNREFUSED"));
      await expect(client.health()).rejects.toThrow(NetworkError);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("NetworkError carries the request URL", async () => {
      // Use real timers for this test to avoid timing complexities
      vi.useRealTimers();
      mockFetch
        .mockRejectedValueOnce(new TypeError("network fail"))
        .mockRejectedValueOnce(new TypeError("network fail"));
      try {
        await client.health();
        expect.fail("should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(NetworkError);
        expect((err as NetworkError).url).toBe("https://kanban.test/api/health");
      }
    });

    it("401 is NOT retried — only 1 fetch call", async () => {
      mockFetch.mockResolvedValue(makeErrorResponse(401, "unauthorized"));
      await expect(client.health()).rejects.toThrow(AuthError);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("404 is NOT retried — only 1 fetch call", async () => {
      mockFetch.mockResolvedValue(makeErrorResponse(404, "not found"));
      await expect(client.getIssue(toIssueId("x"))).rejects.toThrow(NotFoundError);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  // ─── Integration Attacks — request body / method ─────────────────

  describe("Integration Attacks — createIssue", () => {
    it("createIssue sends correct body with projectId", async () => {
      const issue = { id: "i1", title: "test", status: "todo", projectId: "p1", assignees: [], tags: [], createdAt: "now", updatedAt: "now" };
      mockFetch.mockResolvedValueOnce(makeOkResponse(issue));
      const projectId = toProjectId("p1");
      await client.createIssue(projectId, { title: "test" });
      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(init.body as string);
      expect(body.title).toBe("test");
      expect(body.projectId).toBe("p1");
      expect(init.method).toBe("POST");
    });

    it("createIssue includes optional fields when provided", async () => {
      mockFetch.mockResolvedValueOnce(makeOkResponse({}));
      const projectId = toProjectId("p1");
      await client.createIssue(projectId, { title: "t", description: "desc", priority: "high", status: "todo" });
      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(init.body as string);
      expect(body.description).toBe("desc");
      expect(body.priority).toBe("high");
      expect(body.status).toBe("todo");
    });
  });

  describe("Integration Attacks — updateIssue", () => {
    it("updateIssue sends PATCH with only provided fields", async () => {
      mockFetch.mockResolvedValueOnce(makeOkResponse({}));
      await client.updateIssue(toIssueId("i1"), { status: "done" });
      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(init.method).toBe("PATCH");
      const body = JSON.parse(init.body as string);
      expect(body.status).toBe("done");
    });

    it("updateIssue URL includes the issue ID", async () => {
      mockFetch.mockResolvedValueOnce(makeOkResponse({}));
      await client.updateIssue(toIssueId("issue-xyz"), { title: "new title" });
      const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toContain("/api/issues/issue-xyz");
    });
  });

  describe("Integration Attacks — moveIssue", () => {
    it("moveIssue delegates to updateIssue with status only", async () => {
      mockFetch.mockResolvedValueOnce(makeOkResponse({}));
      await client.moveIssue(toIssueId("i1"), "in_progress");
      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(init.body as string);
      expect(body.status).toBe("in_progress");
      expect(Object.keys(body)).toEqual(["status"]);
    });
  });

  describe("Integration Attacks — deleteIssue", () => {
    it("deleteIssue uses DELETE method", async () => {
      mockFetch.mockResolvedValueOnce(makeOkResponse(undefined));
      await client.deleteIssue(toIssueId("i1"));
      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(init.method).toBe("DELETE");
    });

    it("deleteIssue URL includes the issue ID", async () => {
      mockFetch.mockResolvedValueOnce(makeOkResponse(undefined));
      await client.deleteIssue(toIssueId("issue-abc"));
      const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toContain("/api/issues/issue-abc");
    });
  });

  describe("Integration Attacks — assignIssue", () => {
    it("assignIssue sends memberId in request body via POST", async () => {
      mockFetch.mockResolvedValueOnce(makeOkResponse(undefined));
      await client.assignIssue(toIssueId("i1"), toMemberId("m1"));
      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(init.method).toBe("POST");
      expect(url).toContain("/api/issues/i1/assignees");
      const body = JSON.parse(init.body as string);
      expect(body.memberId).toBe("m1");
    });
  });

  describe("Integration Attacks — unassignIssue", () => {
    it("unassignIssue uses DELETE and includes memberId in URL", async () => {
      mockFetch.mockResolvedValueOnce(makeOkResponse(undefined));
      await client.unassignIssue(toIssueId("i1"), toMemberId("m2"));
      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(init.method).toBe("DELETE");
      expect(url).toContain("/api/issues/i1/assignees/m2");
    });
  });

  describe("Integration Attacks — tags", () => {
    it("listTags returns array", async () => {
      mockFetch.mockResolvedValueOnce(makeOkResponse([{ id: "t1", name: "bug" }]));
      const result = await client.listTags();
      expect(result).toEqual([{ id: "t1", name: "bug" }]);
    });

    it("addTag sends tagId in body via POST", async () => {
      mockFetch.mockResolvedValueOnce(makeOkResponse(undefined));
      await client.addTag(toIssueId("i1"), toTagId("t1"));
      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(init.method).toBe("POST");
      expect(url).toContain("/api/issues/i1/tags");
      const body = JSON.parse(init.body as string);
      expect(body.tagId).toBe("t1");
    });

    it("removeTag uses DELETE with tagId in URL", async () => {
      mockFetch.mockResolvedValueOnce(makeOkResponse(undefined));
      await client.removeTag(toIssueId("i1"), toTagId("t99"));
      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(init.method).toBe("DELETE");
      expect(url).toContain("/api/issues/i1/tags/t99");
    });
  });

  describe("Integration Attacks — workspaces", () => {
    it("listWorkspaces returns array", async () => {
      mockFetch.mockResolvedValueOnce(makeOkResponse([{ id: "w1", issueId: "i1", status: "running" }]));
      const result = await client.listWorkspaces();
      expect(result).toEqual([{ id: "w1", issueId: "i1", status: "running" }]);
    });

    it("startWorkspace sends issueId in body via POST", async () => {
      mockFetch.mockResolvedValueOnce(makeOkResponse({ id: "w2", issueId: "i5", status: "starting" }));
      await client.startWorkspace(toIssueId("i5"));
      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(init.method).toBe("POST");
      expect(url).toContain("/api/workspaces");
      const body = JSON.parse(init.body as string);
      expect(body.issueId).toBe("i5");
    });

    it("deleteWorkspace uses DELETE and includes workspace ID in URL", async () => {
      mockFetch.mockResolvedValueOnce(makeOkResponse(undefined));
      await client.deleteWorkspace(toWorkspaceId("w99"));
      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(init.method).toBe("DELETE");
      expect(url).toContain("/api/workspaces/w99");
    });
  });

  describe("Integration Attacks — sessions", () => {
    it("listSessions returns array", async () => {
      mockFetch.mockResolvedValueOnce(makeOkResponse([{ id: "s1", workspaceId: "w1", status: "active" }]));
      const result = await client.listSessions(toWorkspaceId("w1"));
      expect(result).toEqual([{ id: "s1", workspaceId: "w1", status: "active" }]);
    });

    it("createSession uses POST at the correct URL", async () => {
      mockFetch.mockResolvedValueOnce(makeOkResponse({ id: "s2", workspaceId: "w1", status: "creating" }));
      await client.createSession(toWorkspaceId("w1"));
      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(init.method).toBe("POST");
      expect(url).toContain("/api/workspaces/w1/sessions");
    });

    it("runSessionPrompt sends prompt in body via POST", async () => {
      mockFetch.mockResolvedValueOnce(makeOkResponse({ id: "s3", workspaceId: "w1", status: "done" }));
      await client.runSessionPrompt(toSessionId("s3"), "hello world");
      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(init.method).toBe("POST");
      expect(url).toContain("/api/sessions/s3/follow-up");
      const body = JSON.parse(init.body as string);
      expect(body.prompt).toBe("hello world");
    });
  });

  describe("Integration Attacks — listIssues with filters", () => {
    it("listIssues with filters passes query params", async () => {
      mockFetch.mockResolvedValueOnce(makeOkResponse([]));
      await client.listIssues(toProjectId("p1"), { status: "open" }, { limit: 5, page: 2 });
      const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toContain("project_id=p1");
      expect(url).toContain("status=open");
      expect(url).toContain("limit=5");
      expect(url).toContain("page=2");
    });

    it("listIssues with no filters still passes project_id", async () => {
      mockFetch.mockResolvedValueOnce(makeOkResponse([]));
      await client.listIssues(toProjectId("proj-42"));
      const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toContain("project_id=proj-42");
      expect(url).not.toContain("status=");
      expect(url).not.toContain("limit=");
    });
  });

  describe("Input Attacks — Authorization header", () => {
    it("every request includes Authorization: Bearer header", async () => {
      mockFetch.mockResolvedValue(makeOkResponse([]));
      await client.listProjects();
      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      const headers = init.headers as Record<string, string>;
      expect(headers["Authorization"]).toBe("Bearer test-token");
    });

    it("every request includes Content-Type: application/json", async () => {
      mockFetch.mockResolvedValue(makeOkResponse([]));
      await client.listProjects();
      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      const headers = init.headers as Record<string, string>;
      expect(headers["Content-Type"]).toBe("application/json");
    });
  });
});
