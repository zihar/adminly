import { describe, it, expect } from "vitest";
import { normalizeError, buildListSearchParams, CrudError } from "@/lib/crud/errors";

describe("normalizeError", () => {
  it("memetakan 422 ke fieldErrors", () => {
    const e = normalizeError(422, { code: "99", status: "error", message: "Validasi gagal", errors: { nama: ["wajib diisi"] } });
    expect(e).toBeInstanceOf(CrudError);
    expect(e.httpStatus).toBe(422);
    expect(e.fieldErrors).toEqual({ nama: ["wajib diisi"] });
  });

  it("pakai pesan generik untuk 500 tanpa membocorkan body", () => {
    const e = normalizeError(500, { message: "SQLSTATE... /home/app/vendor/laravel" });
    expect(e.httpStatus).toBe(500);
    expect(e.message).toBe("Terjadi kesalahan pada server. Coba lagi.");
    expect(e.fieldErrors).toBeUndefined();
  });
});

describe("buildListSearchParams", () => {
  it("menyusun query pagination/sort/search/filter/scope", () => {
    const sp = buildListSearchParams({
      page: 2, perPage: 20, sort: "nama", order: "asc", q: "budi",
      filters: { id_kelas: 18 }, scope: { id_tahun_ajaran: 2 },
    });
    expect(sp.get("page")).toBe("2");
    expect(sp.get("per_page")).toBe("20");
    expect(sp.get("sort")).toBe("nama");
    expect(sp.get("order")).toBe("asc");
    expect(sp.get("q")).toBe("budi");
    expect(sp.get("filter[id_kelas]")).toBe("18");
    expect(sp.get("scope[id_tahun_ajaran]")).toBe("2");
  });

  it("melewati nilai kosong/undefined", () => {
    const sp = buildListSearchParams({ page: 1, perPage: 10, filters: { x: "" , y: undefined } });
    expect(sp.has("filter[x]")).toBe(false);
    expect(sp.has("filter[y]")).toBe(false);
  });
});
