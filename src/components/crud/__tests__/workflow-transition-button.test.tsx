import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { WorkflowTransitionButton } from "@/components/crud/workflow-transition-button";
import { I18nProvider } from "@/components/providers/i18n-provider";
import type { WorkflowTransition } from "@/lib/crud/define-resource";

// `I18nProvider` memanggil `useRouter()` (untuk `router.refresh()` saat ganti
// locale) — di luar App Router (mis. di test) itu butuh mock manual.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

function wrap(ui: React.ReactNode) {
  return render(<I18nProvider initialLocale="en">{ui}</I18nProvider>);
}

// Mock mutation berbentuk sama seperti hasil `def.api.useTransition()`
// (`UseMutationResult`) — hanya field yang benar2 dipakai komponen.
function mockMutation() {
  return { mutate: vi.fn(), isPending: false };
}

const reasonTransition: WorkflowTransition = {
  action: "reject",
  from: ["submitted"],
  to: "rejected",
  permission: "items:approve",
  labelKey: "workflow.action.reject",
  variant: "destructive",
  requiresReason: true,
};

const plainTransition: WorkflowTransition = {
  action: "approve",
  from: ["submitted"],
  to: "approved",
  permission: "items:approve",
  labelKey: "workflow.action.approve",
  variant: "default",
};

describe("WorkflowTransitionButton", () => {
  it("transisi requiresReason: klik tombol membuka dialog, Konfirmasi disabled sampai alasan diisi, lalu memanggil mutate dg reason & menutup dialog", async () => {
    const user = userEvent.setup();
    const mutation = mockMutation();
    // Cast: shape mock cukup utk yang dipakai komponen (`mutate`/`isPending`),
    // bukan seluruh `UseMutationResult` (banyak field lain tak relevan di sini).
    wrap(
      <WorkflowTransitionButton
        transition={reasonTransition}
        id="1"
        mutation={mutation as never}
      />,
    );

    // Sebelum diklik: dialog belum terbuka (textarea alasan tak ada).
    expect(screen.queryByLabelText("Reason")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reject" }));

    const textarea = await screen.findByLabelText("Reason");
    const confirmButton = screen.getByRole("button", { name: "Confirm" });
    expect(confirmButton).toBeDisabled();

    await user.type(textarea, "Tidak sesuai kebijakan");
    expect(confirmButton).not.toBeDisabled();

    await user.click(confirmButton);

    expect(mutation.mutate).toHaveBeenCalledWith(
      { id: "1", action: "reject", reason: "Tidak sesuai kebijakan" },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );

    // Simulasikan sukses: caller (komponen) memanggil `onSuccess` yang
    // meng-close dialog + reset reason.
    const opts = mutation.mutate.mock.calls[0][1] as { onSuccess: () => void };
    act(() => opts.onSuccess());

    await waitFor(() => expect(screen.queryByLabelText("Reason")).not.toBeInTheDocument());
  });

  it("transisi requiresReason: Cancel me-reset alasan — dialog dibuka ulang textarea kosong & Konfirmasi disabled lagi", async () => {
    const user = userEvent.setup();
    const mutation = mockMutation();
    wrap(
      <WorkflowTransitionButton
        transition={reasonTransition}
        id="1"
        mutation={mutation as never}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Reject" }));
    const textarea = await screen.findByLabelText("Reason");
    await user.type(textarea, "Alasan yang akan dibatalkan");
    expect(screen.getByRole("button", { name: "Confirm" })).not.toBeDisabled();

    // Batalkan lewat tombol Cancel — dialog tertutup TANPA memanggil mutate.
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByLabelText("Reason")).not.toBeInTheDocument());
    expect(mutation.mutate).not.toHaveBeenCalled();

    // Buka ulang dialog — alasan lama TIDAK boleh nempel (bug T3 review: reset
    // hanya terjadi di `onSuccess`, jadi Cancel/Escape/backdrop lalu buka ulang
    // sebelumnya masih menampilkan alasan basi + Konfirmasi ter-enable).
    await user.click(screen.getByRole("button", { name: "Reject" }));
    const reopenedTextarea = await screen.findByLabelText("Reason");
    expect(reopenedTextarea).toHaveValue("");
    expect(screen.getByRole("button", { name: "Confirm" })).toBeDisabled();
  });

  it("transisi tanpa requiresReason: klik tombol langsung memanggil mutate tanpa membuka dialog", async () => {
    const user = userEvent.setup();
    const mutation = mockMutation();
    wrap(
      <WorkflowTransitionButton
        transition={plainTransition}
        id="2"
        mutation={mutation as never}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Approve" }));

    expect(mutation.mutate).toHaveBeenCalledWith(
      { id: "2", action: "approve" },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
    expect(screen.queryByLabelText("Reason")).not.toBeInTheDocument();
  });
});
