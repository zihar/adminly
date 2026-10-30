import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Combobox } from "@/components/ui/combobox";

const OPTIONS = [
  { value: "merah", label: "Merah" },
  { value: "biru", label: "Biru" },
  { value: 7, label: "Tujuh" },
];

function setup(props: Partial<React.ComponentProps<typeof Combobox>> = {}) {
  const onChange = vi.fn();
  const onBlur = vi.fn();
  render(
    <Combobox
      options={OPTIONS}
      value=""
      onChange={onChange}
      onBlur={onBlur}
      placeholder="Pilih…"
      searchPlaceholder="Cari…"
      emptyLabel="Tidak ada hasil"
      {...props}
    />,
  );
  return { onChange, onBlur, user: userEvent.setup() };
}

describe("Combobox", () => {
  it("opsi baru ada di DOM setelah trigger diklik", async () => {
    const { user } = setup();
    expect(screen.queryByRole("option", { name: "Merah" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Pilih…" }));
    expect(await screen.findByRole("option", { name: "Merah" })).toBeInTheDocument();
  });

  it("mengetik di kotak cari menyaring opsi dan menampilkan pesan kosong", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button"));
    await user.type(await screen.findByPlaceholderText("Cari…"), "bir");
    expect(screen.getByRole("option", { name: "Biru" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Merah" })).not.toBeInTheDocument();
    await user.clear(screen.getByPlaceholderText("Cari…"));
    await user.type(screen.getByPlaceholderText("Cari…"), "zzz");
    expect(screen.getByText("Tidak ada hasil")).toBeInTheDocument();
  });

  it("memilih opsi bernilai angka memanggil onChange dengan string", async () => {
    const { user, onChange } = setup();
    await user.click(screen.getByRole("button"));
    await user.click(await screen.findByRole("option", { name: "Tujuh" }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("7");
  });

  it("Esc menutup panel dan memanggil onBlur", async () => {
    const { user, onBlur } = setup();
    await user.click(screen.getByRole("button"));
    await screen.findByRole("option", { name: "Merah" });
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("option", { name: "Merah" })).not.toBeInTheDocument();
    expect(onBlur).toHaveBeenCalled();
  });

  it("onBlur terpanggil juga saat memilih opsi", async () => {
    const { user, onBlur } = setup();
    await user.click(screen.getByRole("button"));
    await user.click(await screen.findByRole("option", { name: "Biru" }));
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it("trigger menampilkan label opsi terpilih, termasuk untuk value angka", () => {
    setup({ value: "7" });
    expect(screen.getByRole("button", { name: "Tujuh" })).toBeInTheDocument();
  });

  it("dengan clearLabel, opsi pertama bernilai kosong dan memilihnya memanggil onChange('')", async () => {
    const { user, onChange } = setup({ value: "biru", clearLabel: "Semua" });
    await user.click(screen.getByRole("button", { name: "Biru" }));
    const options = await screen.findAllByRole("option");
    expect(options[0]).toHaveTextContent("Semua");
    await user.click(options[0]);
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("dengan clearLabel dan value kosong, trigger menampilkan clearLabel", () => {
    setup({ value: "", clearLabel: "Semua" });
    expect(screen.getByRole("button", { name: "Semua" })).toBeInTheDocument();
  });

  it("disabled tidak membuka panel; invalid menandai aria-invalid", async () => {
    const { user } = setup({ disabled: true, invalid: true });
    const trigger = screen.getByRole("button");
    expect(trigger).toHaveAttribute("aria-invalid", "true");
    await user.click(trigger);
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });

  it("kotak cari di dalam panel punya nama aksesibel", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button"));
    expect(await screen.findByPlaceholderText("Cari…")).toHaveAttribute("aria-label", "Cari…");
  });

  it("label opsi terpilih dipotong (truncate) dan tombol boleh menyempit (min-w-0)", () => {
    const panjang = "Label yang sangat panjang ".repeat(10).trim();
    setup({ options: [{ value: "x", label: panjang }], value: "x" });
    const trigger = screen.getByRole("button");
    const label = screen.getByText(panjang);
    expect(label.className).toContain("truncate");
    expect(trigger.className).toContain("min-w-0");
    expect(trigger).toContainElement(label);
  });
});
