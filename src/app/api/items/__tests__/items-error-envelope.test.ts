import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";

import { GET as getOne } from "@/app/api/items/[id]/route";
import { POST as createItem } from "@/app/api/items/route";

describe("items error envelope", () => {
  it("GET item yang tidak ada mengembalikan envelope 404", async () => {
    const res = await getOne(
      new NextRequest("http://localhost/api/items/tidak-ada"),
      { params: Promise.resolve({ id: "tidak-ada" }) },
    );
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json).toMatchObject({ code: 404, status: "error", data: null });
  });

  it("POST body tidak valid mengembalikan envelope 422 dgn field errors", async () => {
    const res = await createItem(
      new NextRequest("http://localhost/api/items", {
        method: "POST",
        body: JSON.stringify({ nama: "" }),
      }),
    );
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.status).toBe("error");
    expect(Array.isArray(json.data.nama)).toBe(true);
  });
});
