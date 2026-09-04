import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import * as React from "react";
import {
  TemplateProvider,
  useTemplate,
} from "@/components/providers/template-provider";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

function Probe() {
  const { template, setTemplate } = useTemplate();
  return (
    <div>
      <span data-testid="id">{template}</span>
      <button onClick={() => setTemplate("adminly")}>set</button>
    </div>
  );
}

afterEach(() => {
  document.cookie = "adminly_template=; path=/; max-age=0";
  document.documentElement.removeAttribute("data-template");
  document.documentElement.removeAttribute("data-density");
  document.documentElement.removeAttribute("data-surface");
  refresh.mockClear();
});

describe("TemplateProvider", () => {
  it("memakai initialTemplate sebagai state awal", () => {
    render(
      <TemplateProvider initialTemplate="adminly">
        <Probe />
      </TemplateProvider>,
    );
    expect(screen.getByTestId("id").textContent).toBe("adminly");
  });

  it("setTemplate memasang tiga atribut, menulis cookie, dan me-refresh", () => {
    render(
      <TemplateProvider initialTemplate="adminly">
        <Probe />
      </TemplateProvider>,
    );
    act(() => {
      screen.getByText("set").click();
    });

    const el = document.documentElement;
    expect(el.dataset.template).toBe("adminly");
    expect(el.dataset.density).toBe("normal");
    expect(el.dataset.surface).toBe("bergaris");
    expect(document.cookie).toContain("adminly_template=adminly");
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("useTemplate melempar error di luar provider", () => {
    const quiet = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow(/TemplateProvider/);
    quiet.mockRestore();
  });
});
