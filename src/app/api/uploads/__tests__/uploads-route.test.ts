// @vitest-environment node
//
// Route test ini butuh lingkungan "node" (bukan default "jsdom" repo ini):
// jsdom mengganti `globalThis.File`/`FormData` dgn polyfill sendiri yang
// tidak dikenali parser multipart Undici (dipakai `NextRequest.formData()`
// di bawah tenda) — `instanceof File` di route gagal walau file-nya valid.
// Di runtime Node produksi sungguhan (tempat route ini benar2 jalan),
// `File`/`FormData` konsisten satu sumber (Undici), jadi pragma ini
// menyamakan lingkungan test dgn lingkungan produksi.
import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";

import { POST } from "@/app/api/uploads/route";
import { GET } from "@/app/api/uploads/[id]/route";
import { uploadStore } from "@/app/api/_store/upload-store";

describe("uploads route", () => {
  it("POST /api/uploads dgn file mengembalikan 201 {id,url,name} dan tersimpan di store", async () => {
    const form = new FormData();
    const file = new File([new Uint8Array([1, 2, 3])], "a.png", { type: "image/png" });
    form.set("file", file);

    const res = await POST(
      new NextRequest("http://localhost/api/uploads", { method: "POST", body: form }),
    );

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).toMatchObject({ url: `/api/uploads/${json.id}`, name: "a.png" });
    expect(typeof json.id).toBe("string");
    expect(uploadStore.get(json.id)).toBeTruthy();
  });

  it("POST /api/uploads tanpa file mengembalikan envelope 400", async () => {
    const form = new FormData();
    const res = await POST(
      new NextRequest("http://localhost/api/uploads", { method: "POST", body: form }),
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toMatchObject({ code: 400, status: "error" });
  });

  it("GET /api/uploads/{id} mengembalikan bytes dgn content-type yang sesuai", async () => {
    const form = new FormData();
    const file = new File([new Uint8Array([9, 9, 9])], "b.txt", { type: "text/plain" });
    form.set("file", file);
    const uploadRes = await POST(
      new NextRequest("http://localhost/api/uploads", { method: "POST", body: form }),
    );
    const { id } = await uploadRes.json();

    const res = await GET(new NextRequest(`http://localhost/api/uploads/${id}`), {
      params: Promise.resolve({ id }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/plain");
    const buf = Buffer.from(await res.arrayBuffer());
    expect([...buf]).toEqual([9, 9, 9]);
  });

  it("GET /api/uploads/{id} untuk id yang tidak ada mengembalikan envelope 404", async () => {
    const res = await GET(new NextRequest("http://localhost/api/uploads/tidak-ada"), {
      params: Promise.resolve({ id: "tidak-ada" }),
    });

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json).toMatchObject({ code: 404, status: "error", data: null });
  });
});
