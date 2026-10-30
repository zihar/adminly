import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "@/components/ui/badge";

describe("Badge", () => {
  it.each(["success", "warning"] as const)(
    "varian %s menandai data-variant dan memakai token status",
    (variant) => {
      render(<Badge variant={variant}>Disetujui</Badge>);
      const badge = screen.getByText("Disetujui");
      expect(badge).toHaveAttribute("data-variant", variant);
      expect(badge).toHaveAttribute("data-slot", "badge");
      expect(badge.className).toContain("--status-");
    },
  );

  it("varian success dan warning memakai token status yang berbeda", () => {
    render(
      <>
        <Badge variant="success">A</Badge>
        <Badge variant="warning">B</Badge>
      </>,
    );
    expect(screen.getByText("A").className).toContain("--status-approved-");
    expect(screen.getByText("B").className).toContain("--status-submitted-");
  });

  it("varian danger memakai pasangan token status rejected (bukan destructive/10)", () => {
    render(<Badge variant="danger">Ditolak</Badge>);
    const badge = screen.getByText("Ditolak");
    expect(badge).toHaveAttribute("data-variant", "danger");
    expect(badge.className).toContain("--status-rejected-bg");
    expect(badge.className).toContain("--status-rejected-fg");
  });

  it("memuat titik penanda dekoratif (aria-hidden) di depan teks", () => {
    render(<Badge variant="success">Disetujui</Badge>);
    const dot = screen
      .getByText("Disetujui")
      .querySelector('[data-slot="badge-dot"]');
    expect(dot).not.toBeNull();
    expect(dot).toHaveAttribute("aria-hidden", "true");
  });

  it("varian bawaan tanpa warna status tetap utuh", () => {
    render(<Badge>Baku</Badge>);
    expect(screen.getByText("Baku")).toHaveAttribute("data-variant", "default");
  });
});
