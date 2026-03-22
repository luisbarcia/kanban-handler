import type { IssueFilters, PaginationParams } from "./types.js";

function qs(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return "";
  return "?" + entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&");
}

/**
 * URL factory functions for every Kanban API endpoint.
 * Each function accepts a `base` URL and any path/query parameters required
 * by that endpoint, and returns a fully-formed URL string ready to pass to
 * `fetch`.
 *
 * @example
 * endpoints.health("https://kanban.example.com")
 * // => "https://kanban.example.com/api/health"
 *
 * @example
 * endpoints.listIssues("https://kanban.example.com", projectId, { status: "open" }, { limit: 20 })
 * // => "https://kanban.example.com/api/issues?project_id=...&status=open&limit=20"
 */
export const endpoints = {
  /** `GET /api/health` — server health check. */
  health: (base: string) => `${base}/api/health`,

  /** `GET /api/projects` — list all projects. */
  listProjects: (base: string) => `${base}/api/projects`,

  /**
   * `GET /api/issues` — list issues, optionally filtered and paginated.
   *
   * @param base - Base API URL.
   * @param projectId - ID of the project whose issues to fetch.
   * @param filters - Optional status/assignee filters.
   * @param pagination - Optional limit/page query parameters.
   */
  listIssues: (base: string, projectId: string, filters?: IssueFilters, pagination?: PaginationParams) =>
    `${base}/api/issues${qs({ project_id: projectId, status: filters?.status, assignee: filters?.assignee, limit: pagination?.limit, page: pagination?.page })}`,

  /** `POST /api/issues` — create a new issue. */
  createIssue: (base: string) => `${base}/api/issues`,

  /** `GET /api/issues/:id` — fetch a single issue by ID. */
  getIssue: (base: string, id: string) => `${base}/api/issues/${id}`,

  /** `PATCH /api/issues/:id` — update fields on an existing issue. */
  updateIssue: (base: string, id: string) => `${base}/api/issues/${id}`,

  /** `DELETE /api/issues/:id` — permanently delete an issue. */
  deleteIssue: (base: string, id: string) => `${base}/api/issues/${id}`,

  /** `POST /api/issues/:issueId/assignees` — add a member as an assignee. */
  assignIssue: (base: string, issueId: string) => `${base}/api/issues/${issueId}/assignees`,

  /** `DELETE /api/issues/:issueId/assignees/:memberId` — remove an assignee from an issue. */
  unassignIssue: (base: string, issueId: string, memberId: string) => `${base}/api/issues/${issueId}/assignees/${memberId}`,

  /** `GET /api/tags` — list all available tags. */
  listTags: (base: string) => `${base}/api/tags`,

  /** `POST /api/issues/:issueId/tags` — attach a tag to an issue. */
  addTag: (base: string, issueId: string) => `${base}/api/issues/${issueId}/tags`,

  /** `DELETE /api/issues/:issueId/tags/:tagId` — detach a tag from an issue. */
  removeTag: (base: string, issueId: string, tagId: string) => `${base}/api/issues/${issueId}/tags/${tagId}`,

  /** `GET /api/workspaces` — list all workspaces. */
  listWorkspaces: (base: string) => `${base}/api/workspaces`,

  /** `POST /api/workspaces` — create (start) a new workspace. */
  startWorkspace: (base: string) => `${base}/api/workspaces`,

  /** `DELETE /api/workspaces/:id` — stop and remove a workspace. */
  deleteWorkspace: (base: string, id: string) => `${base}/api/workspaces/${id}`,

  /** `GET /api/workspaces/:workspaceId/sessions` — list sessions within a workspace. */
  listSessions: (base: string, workspaceId: string) => `${base}/api/workspaces/${workspaceId}/sessions`,

  /** `POST /api/workspaces/:workspaceId/sessions` — create a new session in a workspace. */
  createSession: (base: string, workspaceId: string) => `${base}/api/workspaces/${workspaceId}/sessions`,

  /** `POST /api/sessions/:sessionId/follow-up` — send a follow-up prompt to a running session. */
  runSessionPrompt: (base: string, sessionId: string) => `${base}/api/sessions/${sessionId}/follow-up`,
} as const;
