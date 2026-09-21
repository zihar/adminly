import * as React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { FieldRenderer, registerField, type FieldProps } from "@/components/crud/fields";
import { FormModeProvider } from "@/components/crud/form-mode-context";
import { TextField } from "@/components/crud/fields/text-field";

function ProbeField({ disabled }: FieldProps) {
  return <input aria-label="probe" disabled={disabled} />;
}

afterEach(() => {
  registerField("text", TextField);
});

function Harness({ disabled }: { disabled?: boolean }) {
  const form = useForm({ defaultValues: { nama: "" } });

  return (
    <FormProvider {...form}>
      <FormModeProvider mode="detail">
        <FieldRenderer name="nama" meta={{ type: "text" }} disabled={disabled} />
      </FormModeProvider>
    </FormProvider>
  );
}

describe("FormModeProvider", () => {
  it("meneruskan disabled dari mode detail", () => {
    registerField("text", ProbeField);
    render(<Harness />);

    expect(screen.getByRole("textbox", { name: "probe" })).toBeDisabled();
  });

  it("mengutamakan prop disabled eksplisit daripada mode detail", () => {
    registerField("text", ProbeField);
    render(<Harness disabled={false} />);

    expect(screen.getByRole("textbox", { name: "probe" })).not.toBeDisabled();
  });
});
