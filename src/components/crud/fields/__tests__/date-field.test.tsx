import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useForm, FormProvider, useWatch } from "react-hook-form";
import * as React from "react";
import { DateField } from "@/components/crud/fields/date-field";

function ValueProbe() {
  const value = useWatch({ name: "tanggalLahir" });
  return <span data-testid="date-value">{typeof value === "string" ? value : "not-a-string"}</span>;
}

function Harness() {
  const form = useForm({ defaultValues: { tanggalLahir: "2026-01-01" } });
  return (
    <FormProvider {...form}>
      <DateField name="tanggalLahir" meta={{ type: "date", labelKey: "items.tanggalLahir" }} />
      <ValueProbe />
    </FormProvider>
  );
}

describe("DateField", () => {
  it("merender input tipe date dengan id sesuai name", () => {
    render(<Harness />);
    const input = document.getElementById("tanggalLahir") as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "date");
    expect(input).toHaveAttribute("id", "tanggalLahir");
  });

  it("melakukan round-trip value string YYYY-MM-DD lewat RHF", () => {
    render(<Harness />);
    expect(screen.getByTestId("date-value")).toHaveTextContent("2026-01-01");

    const input = document.getElementById("tanggalLahir") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "2026-07-05" } });

    expect(screen.getByTestId("date-value")).toHaveTextContent("2026-07-05");
  });
});
