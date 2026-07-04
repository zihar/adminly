import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/regions/options/route";
import { regionsData } from "@/app/api/regions/_data";

function childrenOf(parentId: string) {
  return regionsData.filter((r) => r.parentId === parentId);
}

// Bangun NextRequest dengan query param bracket "parent[parentId]" via URL +
// searchParams.set agar encoding round-trip sama seperti yang dibaca route
// lewat sp.get("parent[parentId]").
function buildRequest(params: { parentId?: string; q?: string } = {}) {
  const url = new URL("http://localhost/api/regions/options");
  if (params.parentId !== undefined) {
    url.searchParams.set("parent[parentId]", params.parentId);
  }
  if (params.q !== undefined) {
    url.searchParams.set("q", params.q);
  }
  return new NextRequest(url);
}

describe("regions hierarchy fixture", () => {
  it("has roots and nested children", () => {
    expect(childrenOf("").length).toBeGreaterThan(0); // countries
    const country = childrenOf("")[0];
    expect(childrenOf(country.id).length).toBeGreaterThan(0); // states
  });
});

describe("GET /api/regions/options (route handler)", () => {
  it("mengembalikan anak-anak dari parent[parentId] yang diberikan", async () => {
    const req = buildRequest({ parentId: "c1" });
    const res = await GET(req);
    const body = await res.json();

    const expected = childrenOf("c1").map((r) => ({ value: r.id, label: r.name }));
    expect(body).toEqual(expected);
  });

  it("default ke region ROOT (parentId kosong) saat parent tidak diberikan", async () => {
    const req = buildRequest();
    const res = await GET(req);
    const body = await res.json();

    const expected = childrenOf("").map((r) => ({ value: r.id, label: r.name }));
    expect(body).toEqual(expected);
  });

  it("memfilter anak dari parent[parentId] dengan substring q (case-insensitive)", async () => {
    const req = buildRequest({ parentId: "c1", q: "a1" });
    const res = await GET(req);
    const body = await res.json();

    const expected = childrenOf("c1")
      .filter((r) => r.name.toLowerCase().includes("a1"))
      .map((r) => ({ value: r.id, label: r.name }));
    expect(body).toEqual(expected);
    expect(body.length).toBeGreaterThan(0); // pastikan filter tidak trivial kosong
  });
});
