import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useForm, FormProvider, useWatch } from "react-hook-form";
import * as React from "react";
import { TextareaField } from "@/components/crud/fields/textarea-field";

function ValueProbe() {
  const value = useWatch({ name: "deskripsi" });
  return <span data-testid="textarea-value">{String(value ?? "")}</span>;
}

function Harness() {
  const form = useForm({ defaultValues: { deskripsi: "test" } });
  return (
    <FormProvider {...form}>
      <TextareaField name="deskripsi" meta={{ type: "textarea", labelKey: "items.deskripsi" }} />
      <ValueProbe />
    </FormProvider>
  );
}

describe("TextareaField", () => {
  it("merender textarea dengan name field", () => {
    render(<Harness />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("mengikat value ke RHF dan mencerminkan perubahan", () => {
    render(<Harness />);
    expect(screen.getByTestId("textarea-value")).toHaveTextContent("test");

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "updated" } });

    expect(screen.getByTestId("textarea-value")).toHaveTextContent("updated");
  });
});
