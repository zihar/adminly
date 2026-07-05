import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useForm, FormProvider, useWatch } from "react-hook-form";
import * as React from "react";
import { RadioField } from "@/components/crud/fields/radio-field";

function ValueProbe() {
  const value = useWatch({ name: "gender" });
  return <span data-testid="gender-value">{String(value ?? "")}</span>;
}

function Harness() {
  const form = useForm({ defaultValues: { gender: "" } });
  return (
    <FormProvider {...form}>
      <RadioField
        name="gender"
        meta={{
          type: "radio",
          options: [
            { value: "m", label: "Laki-laki" },
            { value: "f", label: "Perempuan" },
          ],
        }}
      />
      <ValueProbe />
    </FormProvider>
  );
}

describe("RadioField", () => {
  it("merender satu radio per meta.options dg name yang sama", () => {
    render(<Harness />);
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(2);
    expect(radios[0]).toHaveAttribute("name", "gender");
    expect(radios[1]).toHaveAttribute("name", "gender");
  });

  it("radio pertama membawa id={name} agar <Label htmlFor> bisa fokus", () => {
    render(<Harness />);
    expect(screen.getByRole("radio", { name: "Laki-laki" })).toHaveAttribute("id", "gender");
  });

  it("memilih satu opsi mengubah value RHF ke value opsi tsb", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("radio", { name: "Perempuan" }));
    expect(screen.getByTestId("gender-value")).toHaveTextContent("f");
  });
});
