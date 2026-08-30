/**
 * Honest OpenAPI stub (ADR-0008): every listed path is implemented; no path
 * is listed that is not. Request/response schemas arrive with the typed
 * generation rung (queued for Phase 2) — until then the spec carries
 * summaries only and says so in its description.
 */
export function buildOpenApiStub(baseUrl: string): Record<string, unknown> {
  const summary = (value: string) => ({ summary: value });
  return {
    openapi: "3.1.0",
    info: {
      title: "Rivet API",
      version: "0.0.0",
      description:
        "Work in progress: paths listed here are implemented; typed request/response schemas land with a later rung. Authentication: session cookie (see /api/auth/*).",
    },
    servers: [{ url: baseUrl }],
    paths: {
      "/healthz": { get: summary("Liveness probe") },
      "/readyz": { get: summary("Readiness probe (checks database connectivity)") },
      "/api/auth/{path}": {
        description: "Identity engine endpoints (sign-up, sign-in, sign-out, get-session, …)",
      },
      "/api/orgs": {
        post: summary("Create an organization (caller becomes OWNER)"),
        get: summary("List organizations the caller belongs to"),
      },
      "/api/orgs/{orgId}": {
        get: summary("Get an organization (VIEWER+)"),
        patch: summary("Rename an organization (ADMIN+)"),
        delete: summary("Delete an organization and its tree (OWNER)"),
      },
      "/api/orgs/{orgId}/projects": {
        post: summary("Create a project (ADMIN+)"),
        get: summary("List projects (VIEWER+)"),
      },
      "/api/orgs/{orgId}/projects/{projectId}": {
        get: summary("Get a project (VIEWER+)"),
        patch: summary("Rename a project (ADMIN+)"),
        delete: summary("Delete a project (ADMIN+)"),
      },
      "/api/orgs/{orgId}/projects/{projectId}/environments": {
        post: summary("Create an environment (DEVELOPER+)"),
        get: summary("List environments (VIEWER+)"),
      },
      "/api/orgs/{orgId}/projects/{projectId}/environments/{environmentId}": {
        delete: summary("Delete an environment (DEVELOPER+)"),
      },
      "/api/orgs/{orgId}/projects/{projectId}/services": {
        post: summary("Create a service (DEVELOPER+)"),
        get: summary("List services (VIEWER+)"),
      },
      "/api/orgs/{orgId}/projects/{projectId}/services/{serviceId}": {
        patch: summary("Update a service's name/criticality (DEVELOPER+)"),
        delete: summary("Delete a service (DEVELOPER+)"),
      },
      "/api/orgs/{orgId}/projects/{projectId}/dsns": {
        post: summary("Issue a DSN (ADMIN+)"),
        get: summary("List DSNs with rendered DSN URLs (DEVELOPER+)"),
      },
      "/api/orgs/{orgId}/projects/{projectId}/dsns/{dsnId}": {
        delete: summary("Revoke a DSN (ADMIN+)"),
      },
      "/api/orgs/{orgId}/api-keys": {
        post: summary("Issue an API key — full key returned exactly once (ADMIN+)"),
        get: summary("List API keys (prefix only, never key material) (ADMIN+)"),
      },
      "/api/orgs/{orgId}/api-keys/{keyId}": {
        delete: summary("Revoke an API key (ADMIN+)"),
      },
      "/api/openapi.json": { get: summary("This document") },
    },
  };
}
