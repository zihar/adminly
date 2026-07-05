import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";

import { GET, POST } from "@/app/api/items/route";

describe("items route", () => {
  it("GET mengembalikan wrapper paginated", async () => {
    const res = await GET(
      new NextRequest("http://localhost/api/items?page=1&per_page=10"),
    );
    const json = await res.json();
    expect(json).toHaveProperty("data");
    expect(json.meta).toMatchObject({ page: 1, per_page: 10 });
    expect(Array.isArray(json.data)).toBe(true);
  });

  it("GET dgn filter[prioritas] hanya mengembalikan baris yang cocok", async () => {
    const res = await GET(
      new NextRequest("http://localhost/api/items?filter[prioritas]=high"),
    );
    const json = await res.json();
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeGreaterThan(0);
    for (const row of json.data as { prioritas?: string }[]) {
      expect(row.prioritas).toBe("high");
    }
  });

  it("POST membuat item baru (201)", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api/items", {
        method: "POST",
        body: JSON.stringify({ nama: "Baru" }),
      }),
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.nama).toBe("Baru");
  });
});
