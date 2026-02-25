// Re-export all types
export * from "./events";

// Standard API response envelope
export interface ApiResponse<T = unknown> {
  timestamp: string;
  status: number;
  success: boolean;
  data: T;
}

// User (matches /auth/verify response)
export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  emailVerified: boolean;
  avatar: string;
  bio: string;
  phoneVerified: boolean;
  userType: string;
  isAdmin: boolean;
  mfaEnabled: boolean;
  onboarded: boolean;
  status: string;
  authMethod: string;
  createdAt: string;
  updatedAt: string;
  authId: string;
}

// Repo version snapshot
export interface RepoVersion {
  version: string;
  commit: string;
  commitMessage: string;
  s3Key: string;
  markdownKey: string;
  createdAt: string;
}

// Repo (populated object inside workspace GET responses)
export interface Repo {
  _id: string;
  id: string;
  userId: string;
  name: string;
  full_name: string;
  description: string;
  default_branch: string;
  language: string;
  private: boolean;
  initialized: boolean;
  versions: RepoVersion[];
  deployments: unknown[];
  current_version: string;
  createdAt: string;
  updatedAt: string;
}

// Workspace — repoId is a string after CREATE/UPDATE, or populated Repo on GET
export interface Workspace {
  _id: string;
  id: string;
  ownerId: string;
  name: string;
  description: string;
  repoId: string | Repo;
  createdAt: string;
  updatedAt: string;
}

// GitHub repo (from /auth/github/repos — used in repo selector)
export interface GitHubRepo {
  id?: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  default_branch: string;
  language: string | null;
  html_url?: string;
  clone_url?: string;
  updated_at?: string;
}

// ── Helpers ────────────────────────────────────────

/** Safely extract the populated Repo object from a Workspace, or null. */
export function getRepo(workspace: Workspace): Repo | null {
  return typeof workspace.repoId === "object" ? workspace.repoId : null;
}

/** Get the string repo ID regardless of whether it's populated. */
export function getRepoId(workspace: Workspace): string {
  return typeof workspace.repoId === "object"
    ? workspace.repoId.id
    : workspace.repoId;
}
