import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import * as React from "react";
import { AuditTimeline } from "@/components/crud/audit-timeline";
import { I18nProvider } from "@/components/providers/i18n-provider";
import type { AuditRow } from "@/lib/crud/types";

// `I18nProvider` memanggil `useRouter()` — butuh mock manual di luar App Router.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const rows: AuditRow[] = [
  {
    id: "a2",
    entityId: "1",
    action: "approve",
    from: "submitted",
    to: "approved",
    actor: "Admin",
    at: "2026-07-02T10:00:00.000Z",
  },
  {
    id: "a1",
    entityId: "1",
    action: "submit",
    from: "draft",
    to: "submitted",
    actor: "Editor",
    at: "2026-07-01T09:00:00.000Z",
  },
];

function wrap(ui: React.ReactNode) {
  return render(<I18nProvider initialLocale="en">{ui}</I18nProvider>);
}

describe("AuditTimeline", () => {
  it("me-render satu entri per baris: label aksi (i18n) + from→to + actor", () => {
    wrap(<AuditTimeline rows={rows} />);

    expect(screen.getByText("Approve")).toBeInTheDocument();
    expect(screen.getByText("Submit")).toBeInTheDocument();
    expect(screen.getByText(/submitted → approved/)).toBeInTheDocument();
    expect(screen.getByText(/draft → submitted/)).toBeInTheDocument();
    expect(screen.getByText(/Admin/)).toBeInTheDocument();
    expect(screen.getByText(/Editor/)).toBeInTheDocument();
  });

  it("fallback ke nama aksi mentah bila tak ada key i18n workflow.action.<action>", () => {
    wrap(
      <AuditTimeline
        rows={[{ id: "a3", entityId: "1", action: "custom-action", from: "x", to: "y", actor: "Admin", at: "2026-07-01T00:00:00.000Z" }]}
      />,
    );
    expect(screen.getByText("custom-action")).toBeInTheDocument();
  });

  it("menampilkan empty state saat rows kosong", () => {
    wrap(<AuditTimeline rows={[]} />);
    expect(screen.getByText("No data yet.")).toBeInTheDocument();
  });
});
