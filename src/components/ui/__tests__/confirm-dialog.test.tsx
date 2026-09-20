import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

describe("ConfirmDialog", () => {
  it("menampilkan judul dan deskripsi saat open", () => {
    render(
      <ConfirmDialog
        open
        onOpenChange={() => {}}
        title="Hapus data?"
        description="Tindakan ini tidak bisa dibatalkan."
        confirmLabel="Konfirmasi"
        cancelLabel="Batal"
        onConfirm={() => {}}
      />,
    );
    expect(screen.getByText("Hapus data?")).toBeInTheDocument();
    expect(screen.getByText("Tindakan ini tidak bisa dibatalkan.")).toBeInTheDocument();
  });

  it("tidak merender apa pun saat open false", () => {
    render(
      <ConfirmDialog
        open={false}
        onOpenChange={() => {}}
        title="Hapus data?"
        confirmLabel="Konfirmasi"
        cancelLabel="Batal"
        onConfirm={() => {}}
      />,
    );
    expect(screen.queryByText("Hapus data?")).not.toBeInTheDocument();
  });

  it("klik tombol konfirmasi memanggil onConfirm tanpa menutup sendiri", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <ConfirmDialog
        open
        onOpenChange={onOpenChange}
        title="Hapus data?"
        confirmLabel="Konfirmasi"
        cancelLabel="Batal"
        onConfirm={onConfirm}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Konfirmasi" }));
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("klik tombol batal menutup dialog tanpa memanggil onConfirm", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    // Harness terkontrol sungguhan (bukan `open` statis + `onOpenChange` no-op)
    // supaya klik Batal benar2 menutup lewat state, sama seperti pemanggil nyata.
    function Harness() {
      const [open, setOpen] = React.useState(true);
      return (
        <ConfirmDialog
          open={open}
          onOpenChange={setOpen}
          title="Hapus data?"
          confirmLabel="Konfirmasi"
          cancelLabel="Batal"
          onConfirm={onConfirm}
        />
      );
    }
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Batal" }));
    expect(onConfirm).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByText("Hapus data?")).not.toBeInTheDocument();
    });
  });

  it("tombol konfirmasi dan batal nonaktif saat loading", () => {
    render(
      <ConfirmDialog
        open
        onOpenChange={() => {}}
        title="Hapus data?"
        confirmLabel="Konfirmasi"
        cancelLabel="Batal"
        onConfirm={() => {}}
        loading
      />,
    );
    expect(screen.getByRole("button", { name: "Konfirmasi" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Batal" })).toBeDisabled();
  });
});
