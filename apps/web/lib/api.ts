import type { OrgRole } from "@rivet/types";

/** Typed error carrying the API's status and message envelope. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface ErrorEnvelope {
  error?: { message?: string };
}

/**
 * Fetch wrapper for the management API (same-origin via the Next proxy).
 * Parses the error envelope into ApiError; 204s resolve to undefined.
 */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined) headers.set("Content-Type", "application/json");
  const response = await fetch(path, { ...init, headers, credentials: "same-origin" });

  if (response.status === 204) return undefined as T;

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = undefined;
  }

  if (!response.ok) {
    const message =
      (payload as ErrorEnvelope | undefined)?.error?.message ??
      `Request failed (${response.status}).`;
    throw new ApiError(response.status, message);
  }
  return payload as T;
}

// ---- Entities (mirror apps/server responses; dates arrive as ISO strings) ----

export interface Org {
  id: string;
  name: string;
  slug: string;
  role: OrgRole;
  createdAt: string;
}

export interface Project {
  id: string;
  orgId: string;
  name: string;
  slug: string;
  createdAt: string;
}

export interface Environment {
  id: string;
  projectId: string;
  name: string;
}

export interface Service {
  id: string;
  projectId: string;
  name: string;
  criticality: string;
}

export interface Dsn {
  id: string;
  projectId: string;
  publicKey: string;
  label: string | null;
  createdAt: string;
  revokedAt: string | null;
  dsn: string;
}

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  projectId: string | null;
  createdAt: string;
  revokedAt: string | null;
}

// ---- Calls used by the shell ----

export const getOrgs = () => apiFetch<Org[]>("/api/orgs");
export const createOrg = (name: string) =>
  apiFetch<Org>("/api/orgs", { method: "POST", body: JSON.stringify({ name }) });

export const getProjects = (orgId: string) => apiFetch<Project[]>(`/api/orgs/${orgId}/projects`);
export const createProject = (orgId: string, name: string) =>
  apiFetch<Project>(`/api/orgs/${orgId}/projects`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
export const getProject = (orgId: string, projectId: string) =>
  apiFetch<Project>(`/api/orgs/${orgId}/projects/${projectId}`);

export const getEnvironments = (orgId: string, projectId: string) =>
  apiFetch<Environment[]>(`/api/orgs/${orgId}/projects/${projectId}/environments`);
export const getServices = (orgId: string, projectId: string) =>
  apiFetch<Service[]>(`/api/orgs/${orgId}/projects/${projectId}/services`);

export const getDsns = (orgId: string, projectId: string) =>
  apiFetch<Dsn[]>(`/api/orgs/${orgId}/projects/${projectId}/dsns`);
export const createDsn = (orgId: string, projectId: string, label?: string) =>
  apiFetch<Dsn>(`/api/orgs/${orgId}/projects/${projectId}/dsns`, {
    method: "POST",
    body: JSON.stringify(label ? { label } : {}),
  });

export const getApiKeys = (orgId: string) => apiFetch<ApiKey[]>(`/api/orgs/${orgId}/api-keys`);
export const createApiKey = (orgId: string, name: string) =>
  apiFetch<{ key: string; apiKey: ApiKey }>(`/api/orgs/${orgId}/api-keys`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
export const revokeApiKey = (orgId: string, keyId: string) =>
  apiFetch<undefined>(`/api/orgs/${orgId}/api-keys/${keyId}`, { method: "DELETE" });
