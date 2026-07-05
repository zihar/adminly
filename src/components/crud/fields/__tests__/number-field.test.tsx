import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useForm, FormProvider, useWatch } from "react-hook-form";
import * as React from "react";
import { NumberField } from "@/components/crud/fields/number-field";

function ValueProbe() {
  const value = useWatch({ name: "kuantitas" });
  return <span data-testid="number-value">{typeof value === "number" ? value : "not-a-number"}</span>;
}

function Harness() {
  const form = useForm({ defaultValues: { kuantitas: 42 } });
  return (
    <FormProvider {...form}>
      <NumberField name="kuantitas" meta={{ type: "number", labelKey: "items.kuantitas" }} />
      <ValueProbe />
    </FormProvider>
  );
}

describe("NumberField", () => {
  it("merender input tipe number", () => {
    render(<Harness />);
    const input = screen.getByRole("spinbutton");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "number");
  });

  it("mendaftar value sebagai number (valueAsNumber: true)", () => {
    render(<Harness />);
    expect(screen.getByTestId("number-value")).toHaveTextContent("42");

    const input = screen.getByRole("spinbutton") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "123" } });

    expect(screen.getByTestId("number-value")).toHaveTextContent("123");
  });
});
