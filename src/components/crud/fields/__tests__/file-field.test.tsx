import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useForm, FormProvider, useWatch } from "react-hook-form";
import * as React from "react";
import { toast } from "sonner";
import { FileField } from "@/components/crud/fields/file-field";
import { I18nProvider } from "@/components/providers/i18n-provider";
import { uploadFile } from "@/lib/api/upload";

// `FileField` memakai `useI18n()` (teks dropzone/uploading), jadi butuh mock
// manual `useRouter()` di luar App Router (sama seperti test field lain).
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

// Upload sungguhan (Task 1) di-mock — test ini hanya memverifikasi FileField
// memanggilnya & menyimpan URL hasilnya, bukan perilaku endpoint itu sendiri.
vi.mock("@/lib/api/upload", () => ({
  uploadFile: vi.fn(),
}));

const mockedUploadFile = vi.mocked(uploadFile);

function ValueProbe() {
  const value = useWatch({ name: "lampiran" });
  return <span data-testid="lampiran-value">{String(value ?? "")}</span>;
}

function Harness({ accept }: { accept?: string }) {
  const form = useForm({ defaultValues: { lampiran: "" } });
  return (
    <I18nProvider initialLocale="en">
      <FormProvider {...form}>
        <FileField name="lampiran" meta={{ type: "file", accept }} />
        <ValueProbe />
      </FormProvider>
    </I18nProvider>
  );
}

describe("FileField", () => {
  afterEach(() => {
    mockedUploadFile.mockReset();
  });

  it("merender input file tersembunyi dengan id={name}", () => {
    render(<Harness />);
    const input = document.getElementById("lampiran") as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "file");
  });

  it("menghormati meta.accept", () => {
    render(<Harness accept="image/*" />);
    const input = document.getElementById("lampiran") as HTMLInputElement;
    expect(input).toHaveAttribute("accept", "image/*");
  });

  it("saat file dipilih: memanggil uploadFile, menampilkan status pending, lalu menyimpan URL hasil unggah ke RHF", async () => {
    let resolveUpload: (value: { id: string; url: string; name: string }) => void = () => {};
    mockedUploadFile.mockReturnValue(
      new Promise((resolve) => {
        resolveUpload = resolve;
      }),
    );

    render(<Harness />);
    const input = document.getElementById("lampiran") as HTMLInputElement;
    const file = new File(["halo dunia"], "halo.txt", { type: "text/plain" });

    fireEvent.change(input, { target: { files: [file] } });

    expect(mockedUploadFile).toHaveBeenCalledWith(file);
    // Status pending tampil selagi upload masih berjalan.
    await screen.findByText(/uploading/i);

    resolveUpload({ id: "x", url: "/api/uploads/x", name: "a.png" });

    await waitFor(() => {
      expect(screen.getByTestId("lampiran-value")).toHaveTextContent("/api/uploads/x");
    });
    // Value BUKAN data-URL — hasil upload endpoint, bukan FileReader.
    expect(screen.getByTestId("lampiran-value").textContent).not.toMatch(/^data:/);
    // Preview link ke file muncul setelah upload sukses.
    expect(screen.getByRole("link")).toHaveAttribute("href", "/api/uploads/x");
  });

  it("upload gagal: menampilkan toast.error, tidak mengubah value, dan membersihkan status pending", async () => {
    const errorSpy = vi.spyOn(toast, "error");
    mockedUploadFile.mockRejectedValue(new Error("network down"));

    render(<Harness />);
    const input = document.getElementById("lampiran") as HTMLInputElement;
    const file = new File(["halo dunia"], "halo.txt", { type: "text/plain" });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(errorSpy).toHaveBeenCalled());
    expect(screen.getByTestId("lampiran-value")).toHaveTextContent("");
    // Status pending sudah dibersihkan (bukan macet di "uploading").
    expect(screen.queryByText(/uploading/i)).not.toBeInTheDocument();

    errorSpy.mockRestore();
  });

  it("tidak melempar error saat tidak ada file dipilih", () => {
    render(<Harness />);
    const input = document.getElementById("lampiran") as HTMLInputElement;
    expect(() => {
      fireEvent.change(input, { target: { files: [] } });
    }).not.toThrow();
    expect(screen.getByTestId("lampiran-value")).toHaveTextContent("");
    expect(mockedUploadFile).not.toHaveBeenCalled();
  });
});
