import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import * as React from "react";
import { ScopeProvider, useScope } from "@/components/providers/scope-provider";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

function Probe() {
  const { scope, setScope } = useScope();
  return (
    <div>
      <span data-testid="ws">{String(scope.workspace ?? "-")}</span>
      <button onClick={() => setScope({ workspace: "w2" })}>set</button>
      <button onClick={() => setScope({ workspace: "" })}>clear</button>
    </div>
  );
}

afterEach(() => { document.cookie = "adminly_scope=; path=/; max-age=0"; });

describe("ScopeProvider persistence", () => {
  it("sets, persists to cookie, and clears a dimension", () => {
    render(<ScopeProvider initial={{}}><Probe /></ScopeProvider>);
    expect(screen.getByTestId("ws").textContent).toBe("-");
    act(() => { screen.getByText("set").click(); });
    expect(screen.getByTestId("ws").textContent).toBe("w2");
    expect(document.cookie).toContain("adminly_scope");
    act(() => { screen.getByText("clear").click(); });
    expect(screen.getByTestId("ws").textContent).toBe("-");
  });
});
