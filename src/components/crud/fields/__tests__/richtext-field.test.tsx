import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useForm, FormProvider, useWatch } from "react-hook-form";
import * as React from "react";
import { RichtextField } from "@/components/crud/fields/richtext-field";

function ValueProbe() {
  const value = useWatch({ name: "konten" });
  return <span data-testid="konten-value">{String(value ?? "")}</span>;
}

function Harness() {
  const form = useForm({ defaultValues: { konten: "awal" } });
  return (
    <FormProvider {...form}>
      <RichtextField name="konten" meta={{ type: "richtext" }} />
      <ValueProbe />
    </FormProvider>
  );
}

describe("RichtextField", () => {
  it("merender textarea dengan id={name}", () => {
    render(<Harness />);
    const textarea = screen.getByRole("textbox");
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveAttribute("id", "konten");
  });

  it("mengikat value ke RHF dan mencerminkan perubahan", () => {
    render(<Harness />);
    expect(screen.getByTestId("konten-value")).toHaveTextContent("awal");

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "isi baru" } });

    expect(screen.getByTestId("konten-value")).toHaveTextContent("isi baru");
  });
});
