import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useForm, FormProvider, useWatch } from "react-hook-form";
import * as React from "react";
import { AsyncSelectField } from "@/components/crud/fields/async-select-field";
import { TextField } from "@/components/crud/fields/text-field";
import { I18nProvider } from "@/components/providers/i18n-provider";

// `I18nProvider` memanggil `useRouter()` (untuk `router.refresh()` saat ganti
// locale) — di luar App Router (mis. di test) itu butuh mock manual.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

/**
 * Menampilkan nilai RHF `child` sebagai teks. Dipakai alih-alih membaca
 * `<select>` DOM secara langsung karena elemen `<select>` native tidak bisa
 * merefleksikan sebuah value tanpa `<option>` yang cocok (di sini tidak ada
 * `optionsFrom`, jadi daftar option kosong) — sumber kebenaran yang diuji
 * adalah state RHF, bukan tampilan DOM select-nya.
 */
function ChildValueProbe() {
  const value = useWatch({ name: "child" });
  return <span data-testid="child-value">{String(value ?? "")}</span>;
}

function Harness() {
  const form = useForm({ defaultValues: { parent: "a", child: "existing" } });
  // `AsyncSelectField` memakai `useI18n()` untuk placeholder select, jadi wajib
  // dibungkus `I18nProvider`.
  return (
    <I18nProvider initialLocale="en">
      <FormProvider {...form}>
        <TextField name="parent" meta={{ type: "text" }} />
        <AsyncSelectField name="child" meta={{ type: "async-select", dependsOn: ["parent"] }} />
        <ChildValueProbe />
      </FormProvider>
    </I18nProvider>
  );
}

/**
 * Meniru alur EDIT nyata: `useForm()` TANPA `defaultValues`, lalu `reset(data)`
 * dijalankan lewat tombol SETELAH mount (meniru `useGetOne` async di
 * `ResourceForm`). Parent berpindah `undefined → "a"` saat `mounted.current ===
 * true` — jalur yang sebelumnya diam-diam menghapus value anak yang sudah
 * terisi.
 */
function AsyncEditHarness() {
  const form = useForm();
  return (
    <I18nProvider initialLocale="en">
      <FormProvider {...form}>
        <button type="button" onClick={() => form.reset({ parent: "a", child: "existing" })}>load</button>
        <TextField name="parent" meta={{ type: "text" }} />
        <AsyncSelectField name="child" meta={{ type: "async-select", dependsOn: ["parent"] }} />
        <ChildValueProbe />
      </FormProvider>
    </I18nProvider>
  );
}

describe("AsyncSelectField - reset cascade", () => {
  it("tidak menghapus value yang sudah terisi saat mount pertama", () => {
    render(<Harness />);
    expect(screen.getByTestId("child-value")).toHaveTextContent("existing");
  });

  it("mereset value ke string kosong saat field induk (dependsOn) berubah", () => {
    render(<Harness />);
    expect(screen.getByTestId("child-value")).toHaveTextContent("existing");

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "b" } });

    expect(screen.getByTestId("child-value")).toHaveTextContent("");
  });

  it("tidak menghapus value anak saat `reset()` mengisi form SETELAH mount (alur edit nyata)", () => {
    render(<AsyncEditHarness />);
    // `reset()` dijalankan SETELAH mount (mounted.current sudah true) → parent
    // berpindah undefined → "a". `fireEvent` membungkus efek lanjutan dalam
    // `act`, jadi assertion deterministik.
    fireEvent.click(screen.getByText("load"));
    expect(screen.getByDisplayValue("a")).toBeInTheDocument();
    // Value anak TIDAK boleh terhapus: perubahan parent berasal dari reset()
    // (non-dirty), bukan aksi user.
    expect(screen.getByTestId("child-value")).toHaveTextContent("existing");
  });
});
