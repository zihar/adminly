import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScopeSwitcher } from "@/components/layout/scope-switcher";
import { I18nProvider } from "@/components/providers/i18n-provider";
import { ScopeProvider } from "@/components/providers/scope-provider";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

describe("ScopeSwitcher", () => {
  it("renders a trigger for the workspace dimension label", () => {
    render(
      <I18nProvider initialLocale="en">
        <ScopeProvider initial={{}}>
          <ScopeSwitcher />
        </ScopeProvider>
      </I18nProvider>,
    );
    // Label resolved via i18n (scope.workspace → "Workspace")
    expect(screen.getAllByText(/Workspace/i).length).toBeGreaterThan(0);
  });
});
