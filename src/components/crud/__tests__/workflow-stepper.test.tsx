import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import * as React from "react";
import { WorkflowStepper } from "@/components/crud/workflow-stepper";
import { I18nProvider } from "@/components/providers/i18n-provider";
import type { WorkflowStatus } from "@/lib/crud/define-resource";

// `I18nProvider` memanggil `useRouter()` (untuk `router.refresh()` saat ganti
// locale) — di luar App Router (mis. di test) itu butuh mock manual.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const statuses: WorkflowStatus[] = [
  { value: "draft", labelKey: "workflow.status.draft" },
  { value: "submitted", labelKey: "workflow.status.submitted" },
  { value: "approved", labelKey: "workflow.status.approved" },
  { value: "rejected", labelKey: "workflow.status.rejected" },
];

function wrap(ui: React.ReactNode) {
  return render(<I18nProvider initialLocale="en">{ui}</I18nProvider>);
}

describe("WorkflowStepper", () => {
  it("me-render semua status berurutan lewat label i18n (bukan raw value)", () => {
    wrap(<WorkflowStepper statuses={statuses} current="submitted" />);
    expect(screen.getByText("Draft")).toBeInTheDocument();
    expect(screen.getByText("Submitted")).toBeInTheDocument();
    expect(screen.getByText("Approved")).toBeInTheDocument();
    expect(screen.getByText("Rejected")).toBeInTheDocument();
    expect(screen.queryByText("submitted")).not.toBeInTheDocument();
  });

  it("menandai step `current` sebagai aktif (aria-current=step) — step lain tidak", () => {
    wrap(<WorkflowStepper statuses={statuses} current="submitted" />);
    const active = screen.getByText("Submitted");
    expect(active).toHaveAttribute("aria-current", "step");
    expect(screen.getByText("Draft")).not.toHaveAttribute("aria-current", "step");
    expect(screen.getByText("Approved")).not.toHaveAttribute("aria-current", "step");
  });

  it("tidak crash & tak ada step aktif saat `current` tak ada di daftar statuses", () => {
    wrap(<WorkflowStepper statuses={statuses} current="unknown-status" />);
    for (const s of ["Draft", "Submitted", "Approved", "Rejected"]) {
      expect(screen.getByText(s)).not.toHaveAttribute("aria-current", "step");
    }
  });
});
