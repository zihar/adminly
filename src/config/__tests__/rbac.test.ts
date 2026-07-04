import { describe, expect, it } from "vitest";
import { can } from "@/config/rbac";

describe("permission items:approve", () => {
  it("diberikan ke Admin", () => {
    expect(can("Admin", "items:approve")).toBe(true);
  });
  it("tidak diberikan ke Editor", () => {
    expect(can("Editor", "items:approve")).toBe(false);
  });
  it("tidak diberikan ke Viewer", () => {
    expect(can("Viewer", "items:approve")).toBe(false);
  });
});
