import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormProvider, useForm } from "react-hook-form";
import { FieldRenderer } from "@/components/crud/fields";
import { FormModeProvider } from "@/components/crud/form-mode-context";
import { I18nProvider } from "@/components/providers/i18n-provider";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

function Harness({ type, options }: { type: "text" | "select"; options?: { value: string; label: string }[] }) {
  const form = useForm({ defaultValues: { nilai: "" } });
  return <I18nProvider initialLocale="en"><FormProvider {...form}><FormModeProvider mode="detail">
    <FieldRenderer name="nilai" meta={{ type, options }} />
  </FormModeProvider></FormProvider></I18nProvider>;
}

describe("read-only fields", () => {
  it("text disabled dalam mode detail", () => {
    render(<Harness type="text" />);
    expect(screen.getByRole("textbox")).toBeDisabled();
  });

  it("select authored disabled dan tidak membuka opsi", async () => {
    const user = userEvent.setup();
    render(<Harness type="select" options={[{ value: "a", label: "A" }]} />);
    const trigger = screen.getByRole("button");
    expect(trigger).toBeDisabled();
    await user.click(trigger);
    expect(screen.queryByRole("option", { name: "A" })).not.toBeInTheDocument();
  });
});
