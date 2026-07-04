import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { useForm, FormProvider } from "react-hook-form";
import * as React from "react";
import { FieldRenderer } from "@/components/crud/fields";

function Harness() {
  const form = useForm({ defaultValues: { nama: "" } });
  return (
    <FormProvider {...form}>
      <FieldRenderer name="nama" meta={{ type: "text", labelKey: "items.nama" }} />
    </FormProvider>
  );
}

describe("FieldRenderer", () => {
  it("merender input teks dengan name field", () => {
    render(<Harness />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });
});
