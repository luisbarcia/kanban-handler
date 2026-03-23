import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { KanbanClient } from "./api-client.js";
import { toIssueId } from "./types.js";
import { AuthError, ApiError, NetworkError, NotFoundError } from "../utils/errors.js";

describe("KanbanClient", () => {
  let client: KanbanClient;
  const mockFetch = vi.fn();

  beforeEach(() => {
    mockFetch.mockClear();
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
      ok: false, status: 401,
      json: async () => ({ success: false, error_data: { message: "unauthorized", code: "AUTH" } }),
    });
    await expect(client.health()).rejects.toThrow(AuthError);
  });

  it("throws NotFoundError on 404", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false, status: 404,
      json: async () => ({ success: false, error_data: { message: "not found", code: "NOT_FOUND" } }),
    });
    await expect(client.getIssue(toIssueId("bad"))).rejects.toThrow(NotFoundError);
  });

  it("retries once on 500", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: { ok: true } }) });
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
