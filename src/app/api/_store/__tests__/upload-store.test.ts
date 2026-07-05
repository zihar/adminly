import { describe, it, expect } from "vitest";

import { createUploadStore } from "../upload-store";

describe("upload-store", () => {
  it("save() lalu get() mengembalikan record yang sama (roundtrip)", () => {
    const store = createUploadStore();
    const { id } = store.save({ name: "a.png", type: "image/png", base64: "QUJD" });

    expect(id).toMatch(/^u_/);
    expect(store.get(id)).toEqual({ name: "a.png", type: "image/png", base64: "QUJD" });
  });

  it("get() untuk id yang tidak pernah disimpan mengembalikan null", () => {
    const store = createUploadStore();
    expect(store.get("tidak-ada")).toBeNull();
  });

  it("id unik antar pemanggilan save()", () => {
    const store = createUploadStore();
    const a = store.save({ name: "a.png", type: "image/png", base64: "AA" });
    const b = store.save({ name: "b.png", type: "image/png", base64: "BB" });
    expect(a.id).not.toBe(b.id);
  });
});
