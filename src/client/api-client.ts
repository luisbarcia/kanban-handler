import type {
  HealthStatus,
  Project,
  Issue,
  IssueId,
  Tag,
  Workspace,
  WorkspaceId,
  Session,
  SessionId,
  ProjectId,
  MemberId,
  TagId,
  CreateIssueInput,
  UpdateIssueInput,
  IssueFilters,
  PaginationParams,
  ApiResponse,
} from "./types.js";
import { AuthError, ApiError, NetworkError, NotFoundError } from "../utils/errors.js";
import { endpoints } from "./endpoints.js";

type FetchFn = typeof globalThis.fetch;

const RETRY_DELAY_MS = 1000;
const TIMEOUT_MS = 10_000;
const MAX_ATTEMPTS = 2;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * HTTP client for the Kanban API. Wraps `fetch` with:
 * - Bearer-token authentication on every request
 * - A 10-second timeout per attempt
 * - One automatic retry for 5xx errors and network failures
 * - Typed error classes (`AuthError`, `NotFoundError`, `ApiError`, `NetworkError`)
 *
 * @example
 * const client = new KanbanClient("https://kanban.example.com", "my-token");
 * const projects = await client.listProjects();
 */
export class KanbanClient {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly fetchFn: FetchFn;

  /**
   * @param baseUrl - Base URL of the Kanban API server (no trailing slash).
   * @param token - Bearer token used to authenticate every request.
   * @param fetchFn - Optional custom `fetch` implementation, defaults to `globalThis.fetch`.
   */
  constructor(baseUrl: string, token: string, fetchFn: FetchFn = globalThis.fetch) {
    this.baseUrl = baseUrl;
    this.token = token;
    this.fetchFn = fetchFn;
  }

  private async request<T>(url: string, init: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.token}`,
      ...(init.headers as Record<string, string> | undefined),
    };

    let lastError: unknown;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      if (attempt > 0) {
        await delay(RETRY_DELAY_MS);
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

      try {
        const response = await this.fetchFn(url, {
          ...init,
          headers,
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (!response.ok) {
          const body = await response.json().catch(() => ({})) as ApiResponse<unknown>;
          const message = body.error_data?.message ?? `HTTP ${response.status}`;

          if (response.status === 401) {
            throw new AuthError(message);
          }
          if (response.status === 404) {
            throw new NotFoundError(message);
          }
          if (response.status >= 500) {
            lastError = new ApiError(message, response.status);
            continue; // retry on 5xx
          }

          throw new ApiError(message, response.status);
        }

        if (response.status === 204 || response.headers?.get('content-length') === '0') {
          return undefined as T;
        }

        const body = await response.json() as ApiResponse<T>;
        if (body.data === undefined) {
          return undefined as T;
        }
        return body.data;
      } catch (err) {
        clearTimeout(timer);

        // Don't retry on auth or not found errors — rethrow immediately
        if (err instanceof AuthError || err instanceof NotFoundError) {
          throw err;
        }

        // Retry on network failures
        if (err instanceof TypeError) {
          lastError = new NetworkError(err.message, url);
          continue;
        }

        // All other errors (including non-retryable ApiError) rethrow immediately
        throw err;
      }
    }

    if (lastError instanceof NetworkError) {
      throw lastError;
    }

    throw lastError ?? new ApiError("Request failed", undefined);
  }

  // Health

  /**
   * Checks whether the API server is healthy and reachable.
   *
   * @returns A `HealthStatus` object with `ok` and an optional `version` string.
   * @throws {NetworkError} If the server cannot be reached.
   */
  async health(): Promise<HealthStatus> {
    return this.request<HealthStatus>(endpoints.health(this.baseUrl), { method: "GET" });
  }

  // Projects

  /**
   * Returns all projects visible to the authenticated user.
   *
   * @returns An array of `Project` objects.
   * @throws {AuthError} If the token is invalid or expired.
   */
  async listProjects(): Promise<Project[]> {
    return this.request<Project[]>(endpoints.listProjects(this.baseUrl), { method: "GET" });
  }

  // Issues

  /**
   * Lists issues belonging to a project, with optional filtering and pagination.
   *
   * @param projectId - The project whose issues to retrieve.
   * @param filters - Optional status/assignee filters.
   * @param pagination - Optional page and limit parameters.
   * @returns An array of matching `Issue` objects.
   */
  async listIssues(projectId: ProjectId, filters?: IssueFilters, pagination?: PaginationParams): Promise<Issue[]> {
    return this.request<Issue[]>(endpoints.listIssues(this.baseUrl, projectId, filters, pagination), { method: "GET" });
  }

  /**
   * Creates a new issue in the given project.
   *
   * @param projectId - The project in which to create the issue.
   * @param input - Title and optional description, priority, and initial status.
   * @returns The newly created `Issue`.
   */
  async createIssue(projectId: ProjectId, input: CreateIssueInput): Promise<Issue> {
    return this.request<Issue>(endpoints.createIssue(this.baseUrl), {
      method: "POST",
      body: JSON.stringify({ ...input, projectId }),
    });
  }

  /**
   * Fetches a single issue by its ID.
   *
   * @param id - The ID of the issue to retrieve.
   * @returns The matching `Issue`.
   * @throws {NotFoundError} If no issue with that ID exists.
   */
  async getIssue(id: IssueId): Promise<Issue> {
    return this.request<Issue>(endpoints.getIssue(this.baseUrl, id), { method: "GET" });
  }

  /**
   * Updates one or more fields on an existing issue.
   *
   * @param id - The ID of the issue to update.
   * @param input - Fields to patch; unspecified fields are left unchanged.
   * @returns The updated `Issue`.
   * @throws {NotFoundError} If no issue with that ID exists.
   */
  async updateIssue(id: IssueId, input: UpdateIssueInput): Promise<Issue> {
    return this.request<Issue>(endpoints.updateIssue(this.baseUrl, id), {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  /**
   * Convenience method to change only the status of an issue.
   *
   * @param id - The ID of the issue to move.
   * @param status - The target status value (e.g. `"in_progress"`, `"done"`).
   * @returns The updated `Issue`.
   */
  async moveIssue(id: IssueId, status: string): Promise<Issue> {
    return this.updateIssue(id, { status });
  }

  /**
   * Permanently deletes an issue.
   *
   * @param id - The ID of the issue to delete.
   * @throws {NotFoundError} If no issue with that ID exists.
   */
  async deleteIssue(id: IssueId): Promise<void> {
    return this.request<void>(endpoints.deleteIssue(this.baseUrl, id), { method: "DELETE" });
  }

  // Assignees

  /**
   * Assigns a member to an issue.
   *
   * @param issueId - The issue to assign the member to.
   * @param memberId - The member to assign.
   */
  async assignIssue(issueId: IssueId, memberId: MemberId): Promise<void> {
    return this.request<void>(endpoints.assignIssue(this.baseUrl, issueId), {
      method: "POST",
      body: JSON.stringify({ memberId }),
    });
  }

  /**
   * Removes a member from an issue's assignee list.
   *
   * @param issueId - The issue to unassign the member from.
   * @param memberId - The member to remove.
   */
  async unassignIssue(issueId: IssueId, memberId: MemberId): Promise<void> {
    return this.request<void>(endpoints.unassignIssue(this.baseUrl, issueId, memberId), { method: "DELETE" });
  }

  // Tags

  /**
   * Returns all tags defined in the workspace.
   *
   * @returns An array of `Tag` objects.
   */
  async listTags(): Promise<Tag[]> {
    return this.request<Tag[]>(endpoints.listTags(this.baseUrl), { method: "GET" });
  }

  /**
   * Attaches a tag to an issue.
   *
   * @param issueId - The issue to tag.
   * @param tagId - The tag to attach.
   */
  async addTag(issueId: IssueId, tagId: TagId): Promise<void> {
    return this.request<void>(endpoints.addTag(this.baseUrl, issueId), {
      method: "POST",
      body: JSON.stringify({ tagId }),
    });
  }

  /**
   * Detaches a tag from an issue.
   *
   * @param issueId - The issue to remove the tag from.
   * @param tagId - The tag to detach.
   */
  async removeTag(issueId: IssueId, tagId: TagId): Promise<void> {
    return this.request<void>(endpoints.removeTag(this.baseUrl, issueId, tagId), { method: "DELETE" });
  }

  // Workspaces

  /**
   * Returns all workspaces visible to the authenticated user.
   *
   * @returns An array of `Workspace` objects.
   */
  async listWorkspaces(): Promise<Workspace[]> {
    return this.request<Workspace[]>(endpoints.listWorkspaces(this.baseUrl), { method: "GET" });
  }

  /**
   * Creates and starts a new workspace for the given issue.
   *
   * @param issueId - The issue to associate with the new workspace.
   * @returns The newly created `Workspace`.
   */
  async startWorkspace(issueId: IssueId): Promise<Workspace> {
    return this.request<Workspace>(endpoints.startWorkspace(this.baseUrl), {
      method: "POST",
      body: JSON.stringify({ issueId }),
    });
  }

  /**
   * Stops and deletes a workspace.
   *
   * @param id - The ID of the workspace to delete.
   * @throws {NotFoundError} If no workspace with that ID exists.
   */
  async deleteWorkspace(id: WorkspaceId): Promise<void> {
    return this.request<void>(endpoints.deleteWorkspace(this.baseUrl, id), { method: "DELETE" });
  }

  // Sessions

  /**
   * Lists all sessions within a workspace.
   *
   * @param workspaceId - The workspace whose sessions to retrieve.
   * @returns An array of `Session` objects.
   */
  async listSessions(workspaceId: WorkspaceId): Promise<Session[]> {
    return this.request<Session[]>(endpoints.listSessions(this.baseUrl, workspaceId), { method: "GET" });
  }

  /**
   * Creates a new interactive session inside a workspace.
   *
   * @param workspaceId - The workspace in which to create the session.
   * @returns The newly created `Session`.
   */
  async createSession(workspaceId: WorkspaceId): Promise<Session> {
    return this.request<Session>(endpoints.createSession(this.baseUrl, workspaceId), { method: "POST" });
  }

  /**
   * Sends a follow-up prompt to an active session and returns the updated session state.
   *
   * @param sessionId - The session to send the prompt to.
   * @param prompt - The prompt text to submit.
   * @returns The updated `Session` after the prompt is processed.
   */
  async runSessionPrompt(sessionId: SessionId, prompt: string): Promise<Session> {
    return this.request<Session>(endpoints.runSessionPrompt(this.baseUrl, sessionId), {
      method: "POST",
      body: JSON.stringify({ prompt }),
    });
  }
}
