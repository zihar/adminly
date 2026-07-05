import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useForm, FormProvider, useWatch } from "react-hook-form";
import * as React from "react";
import { DateTimeField } from "@/components/crud/fields/datetime-field";

function ValueProbe() {
  const value = useWatch({ name: "jadwalRapat" });
  return <span data-testid="datetime-value">{typeof value === "string" ? value : "not-a-string"}</span>;
}

function Harness() {
  const form = useForm({ defaultValues: { jadwalRapat: "2026-01-01T09:00" } });
  return (
    <FormProvider {...form}>
      <DateTimeField name="jadwalRapat" meta={{ type: "datetime", labelKey: "items.jadwalRapat" }} />
      <ValueProbe />
    </FormProvider>
  );
}

describe("DateTimeField", () => {
  it("merender input tipe datetime-local dengan id sesuai name", () => {
    render(<Harness />);
    const input = document.getElementById("jadwalRapat") as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "datetime-local");
    expect(input).toHaveAttribute("id", "jadwalRapat");
  });

  it("melakukan round-trip value string datetime-local lewat RHF", () => {
    render(<Harness />);
    expect(screen.getByTestId("datetime-value")).toHaveTextContent("2026-01-01T09:00");

    const input = document.getElementById("jadwalRapat") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "2026-07-05T14:30" } });

    expect(screen.getByTestId("datetime-value")).toHaveTextContent("2026-07-05T14:30");
  });
});
