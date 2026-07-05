import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { useForm, FormProvider, useWatch } from "react-hook-form";
import * as React from "react";
import { HiddenField } from "@/components/crud/fields/hidden-field";

function ValueProbe() {
  const value = useWatch({ name: "resourceId" });
  return <span data-testid="hidden-value">{String(value ?? "")}</span>;
}

function Harness() {
  const form = useForm({ defaultValues: { resourceId: "uuid-12345" } });
  return (
    <FormProvider {...form}>
      <HiddenField name="resourceId" meta={{ type: "hidden" }} />
      <ValueProbe />
    </FormProvider>
  );
}

describe("HiddenField", () => {
  it("merender input tersembunyi", () => {
    render(<Harness />);
    const input = document.querySelector('input[type="hidden"]');
    expect(input).toBeInTheDocument();
  });

  it("membawa value ke form state RHF", () => {
    render(<Harness />);
    expect(screen.getByTestId("hidden-value")).toHaveTextContent("uuid-12345");
  });

  it("tidak tampil di DOM secara visual", () => {
    render(<Harness />);
    const input = document.querySelector('input[type="hidden"]') as HTMLInputElement;
    expect(input).not.toBeVisible();
  });
});
