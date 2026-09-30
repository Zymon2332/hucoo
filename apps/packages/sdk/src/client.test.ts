import { describe, expect, it, vi } from "vitest";
import { createSdk } from "./client";
import { ApiError } from "./types";

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

function mockFetch(impl: () => Promise<Response>) {
  return vi.fn(impl) as unknown as typeof fetch;
}

function firstCall(fetchImpl: typeof fetch) {
  return (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [
    string,
    RequestInit,
  ];
}

describe("Sdk", () => {
  it("unwraps Result.data on success", async () => {
    const fetchImpl = mockFetch(async () =>
      jsonResponse({ code: 200, message: "success", data: { id: "1" } }),
    );
    const sdk = createSdk({ baseUrl: "http://api", fetchImpl });
    await expect(sdk.get("/thing")).resolves.toEqual({ id: "1" });
  });

  it("throws ApiError on business failure", async () => {
    const fetchImpl = mockFetch(async () =>
      jsonResponse({ code: 403, message: "forbidden", traceId: "t1" }),
    );
    const sdk = createSdk({ baseUrl: "http://api", fetchImpl });
    await expect(sdk.get("/thing")).rejects.toMatchObject({
      name: "ApiError",
      code: 403,
      message: "forbidden",
    });
  });

  it("attaches bearer token", async () => {
    const fetchImpl = mockFetch(async () =>
      jsonResponse({ code: 200, message: "ok", data: null }),
    );
    const sdk = createSdk({
      baseUrl: "http://api",
      fetchImpl,
      getToken: () => "tok",
    });
    await sdk.get("/thing");
    const [, init] = firstCall(fetchImpl);
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer tok",
    );
  });

  it("builds query string and skips undefined", async () => {
    const fetchImpl = mockFetch(async () =>
      jsonResponse({ code: 200, message: "ok", data: null }),
    );
    const sdk = createSdk({ baseUrl: "http://api", fetchImpl });
    await sdk.get("/list", { query: { page: 1, keyword: undefined } });
    const [url] = firstCall(fetchImpl);
    expect(url).toBe("http://api/list?page=1");
  });

  it("calls onUnauthorized on 401", async () => {
    const fetchImpl = mockFetch(async () => new Response("", { status: 401 }));
    const onUnauthorized = vi.fn();
    const sdk = createSdk({ baseUrl: "http://api", fetchImpl, onUnauthorized });
    await expect(sdk.get("/me")).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });
});
