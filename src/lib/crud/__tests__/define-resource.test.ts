import { describe, it, expect, beforeEach } from "vitest";
import { defineResource } from "@/lib/crud/define-resource";
import { registerResources, getResource, allResources, _resetRegistry } from "@/config/resources/index";
import { createResourceApi } from "@/lib/crud/create-resource-api";

const itemDef = defineResource({
  name: "items", path: "/items",
  api: createResourceApi({ resource: "items", path: "/items" }),
  permissions: { view: "items:view", create: "items:create", update: "items:update", delete: "items:delete" },
  columns: [{ field: "nama", labelKey: "items.nama", sortable: true, searchable: true }],
  form: { schema: undefined as never, layout: [{ tabKey: "umum", fields: ["nama"] }], fields: { nama: { type: "text" } } },
});

describe("resource registry", () => {
  beforeEach(() => _resetRegistry());
  it("mendaftar & mengambil resource by name", () => {
    registerResources([itemDef]);
    expect(getResource("items")?.name).toBe("items");
    expect(allResources()).toHaveLength(1);
  });
  it("getResource mengembalikan undefined utk nama tak dikenal", () => {
    registerResources([itemDef]);
    expect(getResource("nope")).toBeUndefined();
  });
});
