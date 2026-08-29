import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm, FormProvider, useFormState, useWatch } from "react-hook-form";
import * as React from "react";
import { SelectField } from "@/components/crud/fields/select-field";
import { I18nProvider } from "@/components/providers/i18n-provider";

// `SelectField` memakai `useI18n()` untuk placeholder/no-results, jadi butuh
// mock manual `useRouter()` di luar App Router (sama seperti sebelumnya).
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

function ValueProbe() {
  const value = useWatch({ name: "warna" });
  return <span data-testid="warna-value">{String(value ?? "")}</span>;
}

function TouchedProbe() {
  const { touchedFields } = useFormState({ name: "warna" });
  return <span data-testid="warna-touched">{String(Boolean((touchedFields as Record<string, unknown>).warna))}</span>;
}

function Harness({ triggerError }: { triggerError?: boolean }) {
  const form = useForm({ defaultValues: { warna: "" } });
  React.useEffect(() => {
    if (triggerError) {
      form.setError("warna", { type: "manual", message: "Wajib diisi" });
    }
  }, [triggerError, form]);
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
        <TouchedProbe />
      </FormProvider>
    </I18nProvider>
  );
}

describe("SelectField", () => {
  it("opsi tak ada di DOM sebelum trigger diklik, muncul sesudahnya", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.queryByRole("option", { name: "Merah" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button"));
    expect(await screen.findByRole("option", { name: "Merah" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Biru" })).toBeInTheDocument();
  });

  it("memilih opsi mengubah value RHF ke value opsi tsb (string)", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button"));
    await user.click(await screen.findByRole("option", { name: "Biru" }));
    expect(screen.getByTestId("warna-value")).toHaveTextContent("biru");
  });

  it("mengetik teks yang tak cocok opsi mana pun menampilkan noResults", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button"));
    await user.type(screen.getByRole("combobox"), "zzz-tidak-ada-yang-cocok");
    expect(await screen.findByText("No results")).toBeInTheDocument();
  });

  it("trigger dapat aria-invalid=true saat field ada error validasi", () => {
    render(<Harness triggerError />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-invalid", "true");
  });

  it("memilih opsi menandai touchedFields (popover tertutup lewat close() terpusat, bukan setOpen langsung)", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.getByTestId("warna-touched")).toHaveTextContent("false");
    await user.click(screen.getByRole("button"));
    await user.click(await screen.findByRole("option", { name: "Biru" }));
    expect(screen.getByTestId("warna-touched")).toHaveTextContent("true");
  });
});
