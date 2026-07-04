import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useForm, FormProvider, useWatch } from "react-hook-form";
import * as React from "react";
import { AsyncSelectField } from "@/components/crud/fields/async-select-field";
import { TextField } from "@/components/crud/fields/text-field";

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
  return (
    <FormProvider {...form}>
      <TextField name="parent" meta={{ type: "text" }} />
      <AsyncSelectField name="child" meta={{ type: "async-select", dependsOn: ["parent"] }} />
      <ChildValueProbe />
    </FormProvider>
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
});
