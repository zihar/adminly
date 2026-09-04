import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useVisibleNav } from "@/hooks/use-visible-nav";

const pathname = vi.hoisted(() => ({ value: "/dashboard" }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.value }));

const can = vi.hoisted(() => ({ fn: (_: string): boolean => true }));
vi.mock("@/components/providers/rbac-provider", () => ({
  useRbac: () => ({ can: can.fn }),
}));

describe("useVisibleNav", () => {
  it("menyaring item yang permission-nya tidak dimiliki role aktif", () => {
    can.fn = (p: string) => p !== "users:manage";
    const { result } = renderHook(() => useVisibleNav());
    expect(result.current.items.some((i) => i.href === "/users")).toBe(false);
    expect(result.current.items.some((i) => i.href === "/dashboard")).toBe(true);
  });

  it("menandai item aktif dari pathname, termasuk sub-route", () => {
    can.fn = () => true;
    pathname.value = "/items/itm-1/edit";
    const { result } = renderHook(() => useVisibleNav());
    expect(result.current.current?.href).toBe("/items");
  });

  it("menentukan item aktif walau item itu tersaring dari daftar", () => {
    can.fn = (p: string) => p !== "users:manage";
    pathname.value = "/users";
    const { result } = renderHook(() => useVisibleNav());
    expect(result.current.current?.href).toBe("/users");
    expect(result.current.items.some((i) => i.href === "/users")).toBe(false);
  });
});
