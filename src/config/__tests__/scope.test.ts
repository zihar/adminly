import { describe, expect, it } from "vitest";
import { parseScope } from "@/config/scope";

describe("parseScope", () => {
  it("returns {} for undefined/invalid JSON", () => {
    expect(parseScope(undefined)).toEqual({});
    expect(parseScope("not-json")).toEqual({});
  });
  it("keeps only known dimension keys and drops empties", () => {
    const raw = JSON.stringify({ workspace: "w1", bogus: "x", period: "" });
    expect(parseScope(raw)).toEqual({ workspace: "w1" });
  });
});
