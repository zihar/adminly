import { render } from "@testing-library/react";
import { GraduationCap } from "lucide-react";
import { describe, expect, test } from "vitest";

import { StatCard } from "../stat-card";

describe("StatCard", () => {
  test("prop tone membungkus ikon dengan chip warna chart yang sesuai", () => {
    const { container } = render(
      <StatCard title="Total Siswa" value="274" tone="green" icon={GraduationCap} />,
    );
    // Tanpa prop `delta`, satu-satunya <svg> adalah ikon (bukan panah delta).
    const svg = container.querySelector("svg");
    const chip = svg?.parentElement;
    expect(chip?.className).toContain("bg-chart-2/10");
    expect(chip?.className).toContain("text-chart-2");
  });

  test("tanpa tone, ikon tetap tampil netral", () => {
    const { container } = render(
      <StatCard title="X" value="1" icon={GraduationCap} />,
    );
    const svg = container.querySelector("svg");
    expect(svg?.parentElement?.className).toContain("text-muted-foreground");
  });
});
