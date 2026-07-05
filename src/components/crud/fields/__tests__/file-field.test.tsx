import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useForm, FormProvider, useWatch } from "react-hook-form";
import * as React from "react";
import { FileField } from "@/components/crud/fields/file-field";

function ValueProbe() {
  const value = useWatch({ name: "lampiran" });
  return <span data-testid="lampiran-value">{String(value ?? "")}</span>;
}

function Harness({ accept }: { accept?: string }) {
  const form = useForm({ defaultValues: { lampiran: "" } });
  return (
    <FormProvider {...form}>
      <FileField name="lampiran" meta={{ type: "file", accept }} />
      <ValueProbe />
    </FormProvider>
  );
}

describe("FileField", () => {
  it("merender input file dengan id={name}", () => {
    render(<Harness />);
    const input = document.getElementById("lampiran") as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "file");
  });

  it("menghormati meta.accept", () => {
    render(<Harness accept="image/*" />);
    const input = document.getElementById("lampiran") as HTMLInputElement;
    expect(input).toHaveAttribute("accept", "image/*");
  });

  it("menyimpan data-URL ke RHF saat file dipilih", async () => {
    render(<Harness />);
    const input = document.getElementById("lampiran") as HTMLInputElement;
    const file = new File(["halo dunia"], "halo.txt", { type: "text/plain" });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByTestId("lampiran-value").textContent).toMatch(/^data:/);
    });
  });

  it("tidak melempar error saat tidak ada file dipilih", () => {
    render(<Harness />);
    const input = document.getElementById("lampiran") as HTMLInputElement;
    expect(() => {
      fireEvent.change(input, { target: { files: [] } });
    }).not.toThrow();
    expect(screen.getByTestId("lampiran-value")).toHaveTextContent("");
  });
});
