import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useForm, FormProvider, useWatch } from "react-hook-form";
import * as React from "react";
import { SelectField } from "@/components/crud/fields/select-field";
import { I18nProvider } from "@/components/providers/i18n-provider";

// `SelectField` memakai `useI18n()` untuk placeholder opsi kosong (meniru
// `AsyncSelectField`), jadi butuh mock manual `useRouter()` di luar App Router.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

function ValueProbe() {
  const value = useWatch({ name: "warna" });
  return <span data-testid="warna-value">{String(value ?? "")}</span>;
}

function Harness() {
  const form = useForm({ defaultValues: { warna: "" } });
  return (
    <I18nProvider initialLocale="en">
      <FormProvider {...form}>
        <SelectField
          name="warna"
          meta={{
            type: "select",
            options: [
              { value: "merah", label: "Merah" },
              { value: "biru", label: "Biru" },
            ],
          }}
        />
        <ValueProbe />
      </FormProvider>
    </I18nProvider>
  );
}

describe("SelectField", () => {
  it("merender satu <option> per meta.options (plus placeholder kosong)", () => {
    render(<Harness />);
    expect(screen.getByRole("option", { name: "Merah" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Biru" })).toBeInTheDocument();
  });

  it("memilih opsi mengubah value RHF ke value opsi tsb", () => {
    render(<Harness />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "biru" } });
    expect(screen.getByTestId("warna-value")).toHaveTextContent("biru");
  });
});
