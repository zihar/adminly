import { describe, it, expect } from "vitest";
import { initialListParams, DEFAULT_PER_PAGE } from "@/lib/crud/list-params";
import { defineResource } from "@/lib/crud/define-resource";
import type { ResourceDef } from "@/lib/crud/define-resource";
import { createResourceApi } from "@/lib/crud/create-resource-api";

// Fixture ringan — hanya field yang dipakai `initialListParams` yang relevan
// (`list.perPage`, `list.defaultSort`, `scope`); sisanya nilai minimal valid.
// Anotasi return `ResourceDef` (bare) menyamai pola `resource-table.test.tsx`
// (`let def: ResourceDef; def = defineResource({...})`) — memberi TS hint
// kontekstual saat inferensi generic `defineResource`, supaya `TNew`/`TUpdate`
// tak melebar jadi `Partial<unknown>` (lihat catatan varians di
// `src/config/resources/index.ts`, `AnyResourceDef`).
function makeDef(opts?: { scope?: string[]; perPage?: number; defaultSort?: string }): ResourceDef {
  return defineResource({
    name: "items",
    path: "/items",
    api: createResourceApi({ resource: "items", path: "/items" }),
    permissions: { view: "items:view", create: "items:create", update: "items:update", delete: "items:delete" },
    columns: [{ field: "nama", labelKey: "items.nama" }],
    list: { perPage: opts?.perPage, defaultSort: opts?.defaultSort },
    scope: opts?.scope,
    form: { schema: undefined as never, layout: [{ tabKey: "umum", fields: ["nama"] }], fields: { nama: { type: "text" } } },
  });
}

describe("initialListParams", () => {
  it("mengembalikan default page/perPage/order tanpa scope utk resource tanpa def.scope", () => {
    const def = makeDef();
    expect(initialListParams(def)).toEqual({
      page: 1,
      perPage: DEFAULT_PER_PAGE,
      sort: undefined,
      order: "asc",
    });
  });

  it("dipanggil tanpa argumen scope (backward-compatible) tetap tak menyertakan `scope`, walau def.scope diisi", () => {
    const def = makeDef({ scope: ["workspace"] });
    const params = initialListParams(def);
    expect(params).not.toHaveProperty("scope");
  });

  it("menyertakan `scope` HANYA saat def.scope diisi DAN argumen scope diberikan", () => {
    const def = makeDef({ scope: ["workspace"] });
    const params = initialListParams(def, { workspace: "w1" });
    expect(params.scope).toEqual({ workspace: "w1" });
  });

  it("tidak menyertakan `scope` utk resource tanpa def.scope walau argumen scope diberikan", () => {
    const def = makeDef();
    const params = initialListParams(def, { workspace: "w1" });
    expect(params).not.toHaveProperty("scope");
  });

  it("membuang key def.scope yang nilainya undefined/kosong dari argumen scope", () => {
    const def = makeDef({ scope: ["workspace", "term"] });
    const params = initialListParams(def, { workspace: "w1", term: "" });
    expect(params.scope).toEqual({ workspace: "w1" });
  });

  it("tidak menyertakan `scope` sama sekali bila hasil filter kosong (mis. scope aktif tak punya key def.scope)", () => {
    const def = makeDef({ scope: ["workspace"] });
    const params = initialListParams(def, {});
    expect(params).not.toHaveProperty("scope");
  });

  it("perPage & defaultSort resource tetap dihormati saat scope disertakan", () => {
    const def = makeDef({ scope: ["workspace"], perPage: 5, defaultSort: "nama" });
    const params = initialListParams(def, { workspace: "w1" });
    expect(params.perPage).toBe(5);
    expect(params.sort).toBe("nama");
    expect(params.scope).toEqual({ workspace: "w1" });
  });
});
