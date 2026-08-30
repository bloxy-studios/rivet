import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "./api";

function mockResponse(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiFetch", () => {
  it("returns parsed JSON on success and sends JSON headers for bodies", async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse(201, { id: "x" }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await apiFetch<{ id: string }>("/api/orgs", {
      method: "POST",
      body: JSON.stringify({ name: "Acme" }),
    });
    expect(result).toEqual({ id: "x" });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new Headers(init.headers).get("Content-Type")).toBe("application/json");
    expect(init.credentials).toBe("same-origin");
  });

  it("maps the API error envelope onto ApiError with status and message", async () => {
    // A Response body reads once — return a fresh Response per call.
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementation(() =>
          Promise.resolve(mockResponse(403, { error: { message: "Not a member." } })),
        ),
    );
    await expect(apiFetch("/api/orgs/nope")).rejects.toThrow(ApiError);
    await expect(apiFetch("/api/orgs/nope")).rejects.toMatchObject({
      status: 403,
      message: "Not a member.",
    });
  });

  it("falls back to a generic message when the body is not the envelope", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("boom", { status: 500 })));
    await expect(apiFetch("/api/orgs")).rejects.toMatchObject({
      status: 500,
      message: "Request failed (500).",
    });
  });

  it("resolves undefined for 204s", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    await expect(apiFetch("/api/orgs/x/api-keys/y", { method: "DELETE" })).resolves.toBeUndefined();
  });
});
