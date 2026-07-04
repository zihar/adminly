import { describe, it, expect } from "vitest";
import { ensureResourcesRegistered } from "@/config/resources/register";
import { getResource, allResources, _resetRegistry } from "@/config/resources/index";

describe("ensureResourcesRegistered", () => {
  it("mendaftarkan resource items sekali & aman dipanggil berulang (idempotent)", () => {
    _resetRegistry();

    ensureResourcesRegistered();
    expect(getResource("items")).toBeDefined();
    expect(allResources()).toHaveLength(1);

    // Panggilan berulang TIDAK boleh mencoba registrasi ulang (guard `done`) —
    // tanpa guard ini, `registerResources` akan melempar "Resource duplikat".
    expect(() => ensureResourcesRegistered()).not.toThrow();
    expect(allResources()).toHaveLength(1);
  });
});
