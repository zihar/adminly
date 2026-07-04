import { describe, it, expect, beforeEach } from "vitest";
import { _resetRegistry, registerResources } from "@/config/resources/index";
import { itemsResource } from "@/config/resources/items";
import { resourceNavItems, resourceRoutePermissions } from "@/config/site";

describe("nav & route-permission dari registry", () => {
  beforeEach(() => { _resetRegistry(); registerResources([itemsResource]); });
  it("menghasilkan nav item utk resource", () => {
    const nav = resourceNavItems();
    expect(nav.find((n) => n.href === "/items")).toBeTruthy();
  });
  it("menghasilkan route-permission utk resource", () => {
    const rp = resourceRoutePermissions();
    expect(rp.find((r) => r.prefix === "/items")?.permission).toBe("items:view");
  });
});
