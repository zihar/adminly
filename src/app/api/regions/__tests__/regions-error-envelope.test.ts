import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";

import { GET as getOne } from "@/app/api/regions/[id]/route";
import { POST as createRegion } from "@/app/api/regions/route";

describe("regions error envelope", () => {
  it("GET region yang tidak ada mengembalikan envelope 404", async () => {
    const res = await getOne(
      new NextRequest("http://localhost/api/regions/tidak-ada"),
      { params: Promise.resolve({ id: "tidak-ada" }) },
    );
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json).toMatchObject({ code: 404, status: "error", data: null });
  });

  it("POST body tidak valid mengembalikan envelope 422 dgn field errors", async () => {
    const res = await createRegion(
      new NextRequest("http://localhost/api/regions", {
        method: "POST",
        body: JSON.stringify({ name: "" }),
      }),
    );
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.status).toBe("error");
    expect(Array.isArray(json.data.name)).toBe(true);
  });
});
