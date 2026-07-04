import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";

import { POST as transitionItem } from "@/app/api/items/[id]/transition/route";
import { GET as auditItem } from "@/app/api/items/[id]/audit/route";

// Catatan: store in-memory (`itemsStore`) berbagi state antar test — pakai id
// baris seed yang berbeda tiap kasus supaya status awal ("draft") terjamin
// belum diubah test lain (mirip pola di items-error-envelope.test.ts).
describe("items transition + audit", () => {
  it("POST transition submit pada item draft -> 200, status submitted, audit tercatat", async () => {
    const res = await transitionItem(
      new NextRequest("http://localhost/api/items/itm-1/transition", {
        method: "POST",
        body: JSON.stringify({ action: "submit" }),
      }),
      { params: Promise.resolve({ id: "itm-1" }) },
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("submitted");

    const auditRes = await auditItem(
      new NextRequest("http://localhost/api/items/itm-1/audit"),
      { params: Promise.resolve({ id: "itm-1" }) },
    );
    expect(auditRes.status).toBe(200);
    const rows = await auditRes.json();
    expect(rows[0]).toMatchObject({ from: "draft", to: "submitted", action: "submit" });
  });

  it("transisi ilegal (approve pada draft) -> envelope 400/422", async () => {
    const res = await transitionItem(
      new NextRequest("http://localhost/api/items/itm-2/transition", {
        method: "POST",
        body: JSON.stringify({ action: "approve" }),
      }),
      { params: Promise.resolve({ id: "itm-2" }) },
    );
    expect([400, 422]).toContain(res.status);
    const json = await res.json();
    expect(json.status).toBe("error");
  });

  it("id tidak ditemukan -> envelope 404", async () => {
    const res = await transitionItem(
      new NextRequest("http://localhost/api/items/tidak-ada/transition", {
        method: "POST",
        body: JSON.stringify({ action: "submit" }),
      }),
      { params: Promise.resolve({ id: "tidak-ada" }) },
    );
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json).toMatchObject({ code: 404, status: "error" });
  });
});
