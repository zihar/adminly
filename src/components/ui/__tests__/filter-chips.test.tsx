import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterChips } from "@/components/ui/filter-chips";

const OPTIONS = [
  { value: "draft", label: "Draf" },
  { value: "approved", label: "Disetujui" },
];

function setup(value = "") {
  const onChange = vi.fn();
  render(
    <FilterChips
      options={OPTIONS}
      value={value}
      onChange={onChange}
      allLabel="Semua"
    />,
  );
  return { onChange, user: userEvent.setup() };
}

describe("FilterChips", () => {
  it("merender chip Semua lalu satu chip per opsi, semuanya type=button", () => {
    setup();
    const chips = screen.getAllByRole("button");
    expect(chips.map((c) => c.textContent)).toEqual(["Semua", "Draf", "Disetujui"]);
    for (const chip of chips) expect(chip).toHaveAttribute("type", "button");
  });

  it("mengklik chip memanggil onChange dengan nilainya; Semua mengirim string kosong", async () => {
    const { onChange, user } = setup("approved");
    await user.click(screen.getByRole("button", { name: "Draf" }));
    expect(onChange).toHaveBeenLastCalledWith("draft");
    await user.click(screen.getByRole("button", { name: "Semua" }));
    expect(onChange).toHaveBeenLastCalledWith("");
  });

  it("hanya satu chip aria-pressed=true pada satu waktu", () => {
    setup("approved");
    const pressed = screen
      .getAllByRole("button")
      .filter((c) => c.getAttribute("aria-pressed") === "true");
    expect(pressed).toHaveLength(1);
    expect(pressed[0]).toHaveTextContent("Disetujui");
  });

  it("nilai kosong menandai chip Semua sebagai aktif", () => {
    setup("");
    expect(screen.getByRole("button", { name: "Semua" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("nilai yang tak dikenal tidak menandai chip mana pun (data lama) dan tidak melempar", () => {
    setup("arsip-lama");
    const pressed = screen
      .getAllByRole("button")
      .filter((c) => c.getAttribute("aria-pressed") === "true");
    expect(pressed).toHaveLength(0);
  });

  it("bisa dioperasikan dengan papan ketik: Tab lalu Enter dan Spasi", async () => {
    const { onChange, user } = setup();
    await user.tab();
    expect(screen.getByRole("button", { name: "Semua" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Draf" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenLastCalledWith("draft");
    await user.tab();
    await user.keyboard(" ");
    expect(onChange).toHaveBeenLastCalledWith("approved");
  });

  it("chip ramah sentuh: touch-manipulation dan target lebih tinggi di layar kecil", () => {
    setup();
    for (const chip of screen.getAllByRole("button")) {
      expect(chip.className).toContain("touch-manipulation");
      expect(chip.className).toContain("max-sm:h-11");
    }
  });
});
