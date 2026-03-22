import type { IssueFilters, PaginationParams } from "./types.js";

function qs(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return "";
  return "?" + entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&");
}

export const endpoints = {
  health: (base: string) => `${base}/api/health`,
  listProjects: (base: string) => `${base}/api/projects`,
  listIssues: (base: string, projectId: string, filters?: IssueFilters, pagination?: PaginationParams) =>
    `${base}/api/issues${qs({ project_id: projectId, status: filters?.status, assignee: filters?.assignee, limit: pagination?.limit, page: pagination?.page })}`,
  createIssue: (base: string) => `${base}/api/issues`,
  getIssue: (base: string, id: string) => `${base}/api/issues/${id}`,
  updateIssue: (base: string, id: string) => `${base}/api/issues/${id}`,
  deleteIssue: (base: string, id: string) => `${base}/api/issues/${id}`,
  assignIssue: (base: string, issueId: string) => `${base}/api/issues/${issueId}/assignees`,
  unassignIssue: (base: string, issueId: string, memberId: string) => `${base}/api/issues/${issueId}/assignees/${memberId}`,
  listTags: (base: string) => `${base}/api/tags`,
  addTag: (base: string, issueId: string) => `${base}/api/issues/${issueId}/tags`,
  removeTag: (base: string, issueId: string, tagId: string) => `${base}/api/issues/${issueId}/tags/${tagId}`,
  listWorkspaces: (base: string) => `${base}/api/workspaces`,
  startWorkspace: (base: string) => `${base}/api/workspaces`,
  deleteWorkspace: (base: string, id: string) => `${base}/api/workspaces/${id}`,
  listSessions: (base: string, workspaceId: string) => `${base}/api/workspaces/${workspaceId}/sessions`,
  createSession: (base: string, workspaceId: string) => `${base}/api/workspaces/${workspaceId}/sessions`,
  runSessionPrompt: (base: string, sessionId: string) => `${base}/api/sessions/${sessionId}/follow-up`,
} as const;
