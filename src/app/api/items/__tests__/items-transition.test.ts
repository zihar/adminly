import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

import { POST as transitionItem } from "@/app/api/items/[id]/transition/route";
import { GET as auditItem } from "@/app/api/items/[id]/audit/route";
import { itemsStore } from "@/app/api/items/_data";
import { auditStore } from "@/app/api/_store/audit-store";
import { itemsResource } from "@/config/resources/items";

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

  it("reason (opsional) ikut tersimpan di baris audit saat diberikan", async () => {
    // Buktikan plumbing hook->route->auditStore untuk `reason` TANPA bergantung
    // pada `requiresReason` (belum di-wiring ke config demo `items.ts` — itu
    // tugas Task 4): transisi "submit" biasa, reason tetap opsional & tersimpan.
    itemsStore.create({ id: "itm-reason-plumbing", nama: "Reason plumbing", status: "draft" });

    const res = await transitionItem(
      new NextRequest("http://localhost/api/items/itm-reason-plumbing/transition", {
        method: "POST",
        body: JSON.stringify({ action: "submit", reason: "catatan tambahan" }),
      }),
      { params: Promise.resolve({ id: "itm-reason-plumbing" }) },
    );
    expect(res.status).toBe(200);
    expect(auditStore.listFor("itm-reason-plumbing")[0]).toMatchObject({ reason: "catatan tambahan" });
  });

  it("transisi tanpa reason (non-requiresReason) tetap 200, audit.reason = null", async () => {
    itemsStore.create({ id: "itm-no-reason", nama: "No reason", status: "draft" });

    const res = await transitionItem(
      new NextRequest("http://localhost/api/items/itm-no-reason/transition", {
        method: "POST",
        body: JSON.stringify({ action: "submit" }),
      }),
      { params: Promise.resolve({ id: "itm-no-reason" }) },
    );
    expect(res.status).toBe(200);
    expect(auditStore.listFor("itm-no-reason")[0]).toMatchObject({ reason: null });
  });
});

// Validasi `requiresReason` (Task 4 belum meng-wire flag ini ke config demo
// `items.ts` — sengaja TIDAK diedit di task ini). Untuk membuktikan cabang
// validasi di route bekerja lewat jalur nyata (bukan unit test terpisah dari
// logikanya), test ini men-toggle `requiresReason` pada transition "reject"
// SECARA RUNTIME (mutasi objek `itemsResource.workflow.transitions` di
// memori, bukan file config) lalu mengembalikannya (`afterEach`). Ini
// membuktikan plumbing `bodySchema.reason` -> `transition.requiresReason`
// check -> `badRequest` end-to-end memakai kode produksi yang sesungguhnya.
describe("items transition — validasi requiresReason (toggle runtime sementara)", () => {
  const rejectTransition = itemsResource.workflow?.transitions.find((tr) => tr.action === "reject");
  const originalRequiresReason = rejectTransition?.requiresReason;

  beforeEach(() => {
    if (rejectTransition) rejectTransition.requiresReason = true;
  });
  afterEach(() => {
    if (rejectTransition) rejectTransition.requiresReason = originalRequiresReason;
  });

  it("reject tanpa reason saat requiresReason=true -> 400/envelope", async () => {
    itemsStore.create({ id: "itm-reject-no-reason", nama: "Reject no reason", status: "submitted" });

    const res = await transitionItem(
      new NextRequest("http://localhost/api/items/itm-reject-no-reason/transition", {
        method: "POST",
        body: JSON.stringify({ action: "reject" }),
      }),
      { params: Promise.resolve({ id: "itm-reject-no-reason" }) },
    );
    expect([400, 422]).toContain(res.status);
    const json = await res.json();
    expect(json.status).toBe("error");
  });

  it("reject dengan reason blank (spasi) saat requiresReason=true -> 400/envelope", async () => {
    itemsStore.create({ id: "itm-reject-blank-reason", nama: "Reject blank reason", status: "submitted" });

    const res = await transitionItem(
      new NextRequest("http://localhost/api/items/itm-reject-blank-reason/transition", {
        method: "POST",
        body: JSON.stringify({ action: "reject", reason: "   " }),
      }),
      { params: Promise.resolve({ id: "itm-reject-blank-reason" }) },
    );
    expect([400, 422]).toContain(res.status);
  });

  it("reject dengan reason saat requiresReason=true -> 200, audit.reason tersimpan", async () => {
    itemsStore.create({ id: "itm-reject-with-reason", nama: "Reject with reason", status: "submitted" });

    const res = await transitionItem(
      new NextRequest("http://localhost/api/items/itm-reject-with-reason/transition", {
        method: "POST",
        body: JSON.stringify({ action: "reject", reason: "tak layak" }),
      }),
      { params: Promise.resolve({ id: "itm-reject-with-reason" }) },
    );
    expect(res.status).toBe(200);
    expect(auditStore.listFor("itm-reject-with-reason")[0]).toMatchObject({ reason: "tak layak" });
  });
});
