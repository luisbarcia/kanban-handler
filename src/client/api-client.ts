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

export class KanbanClient {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly fetchFn: FetchFn;

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

        const body = await response.json() as ApiResponse<T>;
        return body.data as T;
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
  async health(): Promise<HealthStatus> {
    return this.request<HealthStatus>(endpoints.health(this.baseUrl), { method: "GET" });
  }

  // Projects
  async listProjects(): Promise<Project[]> {
    return this.request<Project[]>(endpoints.listProjects(this.baseUrl), { method: "GET" });
  }

  // Issues
  async listIssues(projectId: ProjectId, filters?: IssueFilters, pagination?: PaginationParams): Promise<Issue[]> {
    return this.request<Issue[]>(endpoints.listIssues(this.baseUrl, projectId, filters, pagination), { method: "GET" });
  }

  async createIssue(projectId: ProjectId, input: CreateIssueInput): Promise<Issue> {
    return this.request<Issue>(endpoints.createIssue(this.baseUrl), {
      method: "POST",
      body: JSON.stringify({ ...input, projectId }),
    });
  }

  async getIssue(id: IssueId): Promise<Issue> {
    return this.request<Issue>(endpoints.getIssue(this.baseUrl, id), { method: "GET" });
  }

  async updateIssue(id: IssueId, input: UpdateIssueInput): Promise<Issue> {
    return this.request<Issue>(endpoints.updateIssue(this.baseUrl, id), {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  async moveIssue(id: IssueId, status: string): Promise<Issue> {
    return this.updateIssue(id, { status });
  }

  async deleteIssue(id: IssueId): Promise<void> {
    return this.request<void>(endpoints.deleteIssue(this.baseUrl, id), { method: "DELETE" });
  }

  // Assignees
  async assignIssue(issueId: IssueId, memberId: MemberId): Promise<void> {
    return this.request<void>(endpoints.assignIssue(this.baseUrl, issueId), {
      method: "POST",
      body: JSON.stringify({ memberId }),
    });
  }

  async unassignIssue(issueId: IssueId, memberId: MemberId): Promise<void> {
    return this.request<void>(endpoints.unassignIssue(this.baseUrl, issueId, memberId), { method: "DELETE" });
  }

  // Tags
  async listTags(): Promise<Tag[]> {
    return this.request<Tag[]>(endpoints.listTags(this.baseUrl), { method: "GET" });
  }

  async addTag(issueId: IssueId, tagId: TagId): Promise<void> {
    return this.request<void>(endpoints.addTag(this.baseUrl, issueId), {
      method: "POST",
      body: JSON.stringify({ tagId }),
    });
  }

  async removeTag(issueId: IssueId, tagId: TagId): Promise<void> {
    return this.request<void>(endpoints.removeTag(this.baseUrl, issueId, tagId), { method: "DELETE" });
  }

  // Workspaces
  async listWorkspaces(): Promise<Workspace[]> {
    return this.request<Workspace[]>(endpoints.listWorkspaces(this.baseUrl), { method: "GET" });
  }

  async startWorkspace(issueId: IssueId): Promise<Workspace> {
    return this.request<Workspace>(endpoints.startWorkspace(this.baseUrl), {
      method: "POST",
      body: JSON.stringify({ issueId }),
    });
  }

  async deleteWorkspace(id: WorkspaceId): Promise<void> {
    return this.request<void>(endpoints.deleteWorkspace(this.baseUrl, id), { method: "DELETE" });
  }

  // Sessions
  async listSessions(workspaceId: WorkspaceId): Promise<Session[]> {
    return this.request<Session[]>(endpoints.listSessions(this.baseUrl, workspaceId), { method: "GET" });
  }

  async createSession(workspaceId: WorkspaceId): Promise<Session> {
    return this.request<Session>(endpoints.createSession(this.baseUrl, workspaceId), { method: "POST" });
  }

  async runSessionPrompt(sessionId: SessionId, prompt: string): Promise<Session> {
    return this.request<Session>(endpoints.runSessionPrompt(this.baseUrl, sessionId), {
      method: "POST",
      body: JSON.stringify({ prompt }),
    });
  }
}
