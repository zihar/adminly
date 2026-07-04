import { describe, expect, it } from "vitest";
import { regionsData } from "@/app/api/regions/_data";

function childrenOf(parentId: string) {
  return regionsData.filter((r) => r.parentId === parentId);
}

describe("regions hierarchy fixture", () => {
  it("has roots and nested children", () => {
    expect(childrenOf("").length).toBeGreaterThan(0); // countries
    const country = childrenOf("")[0];
    expect(childrenOf(country.id).length).toBeGreaterThan(0); // states
  });
});
