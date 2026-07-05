import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useForm, FormProvider, useWatch } from "react-hook-form";
import * as React from "react";
import { CheckboxField } from "@/components/crud/fields/checkbox-field";

function ValueProbe() {
  const value = useWatch({ name: "aktif" });
  return (
    <span data-testid="aktif-value">
      {typeof value === "boolean" ? String(value) : "not-a-boolean"}
    </span>
  );
}

function Harness() {
  const form = useForm({ defaultValues: { aktif: false } });
  return (
    <FormProvider {...form}>
      <CheckboxField name="aktif" meta={{ type: "checkbox" }} />
      <ValueProbe />
    </FormProvider>
  );
}

describe("CheckboxField", () => {
  it("merender satu checkbox boolean dg id={name}", () => {
    render(<Harness />);
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toHaveAttribute("id", "aktif");
  });

  it("men-toggle value RHF sebagai boolean", () => {
    render(<Harness />);
    expect(screen.getByTestId("aktif-value")).toHaveTextContent("false");
    fireEvent.click(screen.getByRole("checkbox"));
    expect(screen.getByTestId("aktif-value")).toHaveTextContent("true");
  });
});
