import { describe, it, expect, afterEach, vi } from "vitest";

import { setAuthTokenProvider } from "@/lib/api/auth";
import { uploadFile } from "@/lib/api/upload";

afterEach(() => {
  vi.unstubAllGlobals();
  setAuthTokenProvider(() => null);
});

describe("uploadFile", () => {
  it("POST FormData ke /api/uploads (tanpa header Content-Type manual) dan mengembalikan json hasil parse", async () => {
    const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(
      async () =>
        new Response(JSON.stringify({ id: "u_1", url: "/api/uploads/u_1", name: "a.png" }), {
          status: 201,
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const file = new File([new Uint8Array([1, 2, 3])], "a.png", { type: "image/png" });
    const result = await uploadFile(file);

    expect(result).toEqual({ id: "u_1", url: "/api/uploads/u_1", name: "a.png" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/uploads");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBeInstanceOf(FormData);
    expect((init?.body as FormData).get("file")).toBe(file);
    // Browser harus yang set boundary Content-Type — jangan diset manual.
    expect(init?.headers).toBeUndefined();
  });

  it("menyertakan header Authorization saat token tersedia", async () => {
    setAuthTokenProvider(() => "tok-123");
    const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(
      async () =>
        new Response(JSON.stringify({ id: "u_2", url: "/api/uploads/u_2", name: "b.png" }), {
          status: 201,
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const file = new File([new Uint8Array([1])], "b.png", { type: "image/png" });
    await uploadFile(file);

    const [, init] = fetchMock.mock.calls[0];
    expect(init?.headers).toEqual({ Authorization: "Bearer tok-123" });
  });

  it("melempar error saat respons tidak ok", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 500 })));
    const file = new File([new Uint8Array([1])], "c.png", { type: "image/png" });
    await expect(uploadFile(file)).rejects.toThrow();
  });
});
