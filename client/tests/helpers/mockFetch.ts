import { vi } from "vitest";

// Small helper for the Lab 1/2 UI tests: route fetch() calls by URL to fake responses.
export type Route = (url: string, init?: RequestInit) => { status?: number; body?: unknown } | undefined;

export function mockFetch(route: Route) {
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const result = route(url, init) ?? { status: 404, body: { error: "Not mocked: " + url } };
    const status = result.status ?? 200;
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: { get: () => "application/json" },
      json: async () => result.body,
      text: async () => JSON.stringify(result.body),
      blob: async () => new Blob([]),
    } as unknown as Response;
  });
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

export function loginAs(user: { id: string; fullName: string; email: string; role: string }) {
  localStorage.setItem("user", JSON.stringify({ ...user, mustChangePassword: false }));
  localStorage.setItem("token", "fake-token");
}
