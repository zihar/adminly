import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { ScopeProvider, useScope } from "@/components/providers/scope-provider";

// Kunci scope generik (demo: `workspace`) — bukan istilah domain spesifik.
function Probe() {
  const { scope, setScope } = useScope();
  return (
    <div>
      <span data-testid="val">{String(scope.workspaceId ?? "")}</span>
      <button onClick={() => setScope({ workspaceId: 2 })}>set</button>
    </div>
  );
}

describe("ScopeProvider", () => {
  it("menyimpan & memperbarui scope", async () => {
    render(
      <ScopeProvider initial={{ workspaceId: 1 }}>
        <Probe />
      </ScopeProvider>,
    );
    expect(screen.getByTestId("val").textContent).toBe("1");
    await userEvent.click(screen.getByRole("button", { name: "set" }));
    expect(screen.getByTestId("val").textContent).toBe("2");
  });
});
