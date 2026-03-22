/**
 * Utility type that brands a primitive type `T` with a nominal tag `B`,
 * preventing accidental misuse of structurally identical types.
 *
 * @template T - The underlying primitive type (e.g. `string`, `number`).
 * @template B - A string literal used as the brand discriminant.
 */
export type Brand<T, B extends string> = T & { readonly __brand: B };

/**
 * Branded string types for domain entity identifiers.
 * Each type is structurally identical to `string` but nominally distinct,
 * so the compiler rejects accidental cross-assignment.
 */
export type ProjectId = Brand<string, "ProjectId">;
/** Branded identifier for an Issue entity. */
export type IssueId = Brand<string, "IssueId">;
/** Branded identifier for a Member entity. */
export type MemberId = Brand<string, "MemberId">;
/** Branded identifier for a Tag entity. */
export type TagId = Brand<string, "TagId">;
/** Branded identifier for a Workspace entity. */
export type WorkspaceId = Brand<string, "WorkspaceId">;
/** Branded identifier for a Session entity. */
export type SessionId = Brand<string, "SessionId">;

/**
 * ID constructor functions — cast a plain `string` to the corresponding
 * branded ID type. Use these at trust boundaries (e.g. API response parsing)
 * rather than `as` casts spread throughout the codebase.
 *
 * @param id - The raw string identifier returned by the API.
 * @returns The same value re-typed as the branded ID.
 */
export const toProjectId = (id: string): ProjectId => id as ProjectId;
/** @see toProjectId */
export const toIssueId = (id: string): IssueId => id as IssueId;
/** @see toProjectId */
export const toMemberId = (id: string): MemberId => id as MemberId;
/** @see toProjectId */
export const toTagId = (id: string): TagId => id as TagId;
/** @see toProjectId */
export const toWorkspaceId = (id: string): WorkspaceId => id as WorkspaceId;
/** @see toProjectId */
export const toSessionId = (id: string): SessionId => id as SessionId;

/**
 * Standard envelope returned by every API endpoint.
 *
 * @template T - The shape of the `data` payload on success.
 */
export interface ApiResponse<T> {
  /** Whether the request succeeded. */
  success: boolean;
  /** Payload present when `success` is `true`. */
  data?: T;
  /** Error details present when `success` is `false`. */
  error_data?: { message: string; code: string };
}

/** Query-string parameters for paginated list endpoints. */
export interface PaginationParams {
  /** Maximum number of items to return per page. */
  limit?: number;
  /** 1-based page number to fetch. */
  page?: number;
}

/**
 * Paginated list response wrapping an array of items together with
 * the pagination metadata needed to fetch subsequent pages.
 *
 * @template T - The type of each item in the list.
 */
export interface PaginatedResponse<T> {
  /** Items on the current page. */
  items: T[];
  /** Total number of items across all pages. */
  total: number;
  /** Current page number (1-based). */
  page: number;
  /** Page size used for this response. */
  limit: number;
}

/** A kanban issue belonging to a project. */
export interface Issue {
  id: IssueId;
  title: string;
  description?: string;
  /** Current workflow status (e.g. `"todo"`, `"in_progress"`, `"done"`). */
  status: string;
  priority?: string;
  projectId: ProjectId;
  /** Members assigned to this issue. */
  assignees: MemberId[];
  /** Tags attached to this issue. */
  tags: TagId[];
  /** ISO 8601 creation timestamp. */
  createdAt: string;
  /** ISO 8601 last-updated timestamp. */
  updatedAt: string;
}

/** A top-level project that groups issues. */
export interface Project {
  id: ProjectId;
  name: string;
}

/** A label that can be attached to issues for categorisation. */
export interface Tag {
  id: TagId;
  name: string;
  /** Optional hex or CSS colour string for UI display. */
  color?: string;
}

/** A development workspace associated with an issue. */
export interface Workspace {
  id: WorkspaceId;
  /** The issue this workspace was created for. */
  issueId: IssueId;
  status: string;
}

/** An interactive session running inside a workspace. */
export interface Session {
  id: SessionId;
  workspaceId: WorkspaceId;
  status: string;
}

/** A single prompt execution within a session. */
export interface Execution {
  id: string;
  sessionId: SessionId;
  status: string;
  /** Captured stdout/stderr from the execution, if available. */
  output?: string;
}

/** Fields required when creating a new issue. */
export interface CreateIssueInput {
  title: string;
  description?: string;
  priority?: string;
  status?: string;
}

/** Fields that may be updated on an existing issue; all are optional. */
export interface UpdateIssueInput {
  title?: string;
  description?: string;
  priority?: string;
  status?: string;
}

/** Optional filters applied when listing issues. */
export interface IssueFilters {
  /** Return only issues with this status value. */
  status?: string;
  /** Return only issues assigned to this member. */
  assignee?: MemberId;
}

/** Health-check response from the API server. */
export interface HealthStatus {
  /** `true` when the server is healthy and accepting requests. */
  ok: boolean;
  /** API server version string, if returned. */
  version?: string;
}
