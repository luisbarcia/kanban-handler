// Branded type utility
export type Brand<T, B extends string> = T & { readonly __brand: B };

// Domain IDs
export type ProjectId = Brand<string, "ProjectId">;
export type IssueId = Brand<string, "IssueId">;
export type MemberId = Brand<string, "MemberId">;
export type TagId = Brand<string, "TagId">;
export type WorkspaceId = Brand<string, "WorkspaceId">;
export type SessionId = Brand<string, "SessionId">;

// ID constructors
export const toProjectId = (id: string): ProjectId => id as ProjectId;
export const toIssueId = (id: string): IssueId => id as IssueId;
export const toMemberId = (id: string): MemberId => id as MemberId;
export const toTagId = (id: string): TagId => id as TagId;
export const toWorkspaceId = (id: string): WorkspaceId => id as WorkspaceId;
export const toSessionId = (id: string): SessionId => id as SessionId;

// API response envelope
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error_data?: { message: string; code: string };
}

// Pagination
export interface PaginationParams {
  limit?: number;
  page?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

// Domain models
export interface Issue {
  id: IssueId;
  title: string;
  description?: string;
  status: string;
  priority?: string;
  projectId: ProjectId;
  assignees: MemberId[];
  tags: TagId[];
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: ProjectId;
  name: string;
}

export interface Tag {
  id: TagId;
  name: string;
  color?: string;
}

export interface Workspace {
  id: WorkspaceId;
  issueId: IssueId;
  status: string;
}

export interface Session {
  id: SessionId;
  workspaceId: WorkspaceId;
  status: string;
}

export interface Execution {
  id: string;
  sessionId: SessionId;
  status: string;
  output?: string;
}

export interface CreateIssueInput {
  title: string;
  description?: string;
  priority?: string;
  status?: string;
}

export interface UpdateIssueInput {
  title?: string;
  description?: string;
  priority?: string;
  status?: string;
}

export interface IssueFilters {
  status?: string;
  assignee?: MemberId;
}

export interface HealthStatus {
  ok: boolean;
  version?: string;
}
