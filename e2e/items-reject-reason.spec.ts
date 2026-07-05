import { test, expect } from "@playwright/test";

// E2E reject-reason (Task 4, plan `reject-reason-dialog`): transisi `reject`
// pada `itemsResource` ditandai `requiresReason:true` (config/resources/
// items.ts) — beda dari `workflow-items.spec.ts` (submit/approve satu-klik),
// di sini klik "Reject" WAJIB membuka dialog alasan (`WorkflowTransitionButton`)
// sebelum request transisi terkirim. Role default demo Admin (lihat
// DEFAULT_ROLE di config/rbac.ts) punya `items:approve`, jadi tombol
// Reject langsung terlihat tanpa perlu RoleSwitcher.
test("Workflow items: reject wajib alasan — dialog, validasi, audit timeline", async ({ page }) => {
  // Nama unik per run — store mock in-memory dipertahankan selama umur dev
  // server, nama statis bisa bentrok antar run (pola sama `workflow-items.spec.ts`).
  const nama = `Item Reject ${Date.now()}`;
  const alasan = "Data tidak lengkap, mohon lengkapi kembali";

  // --- Create (item baru selalu "draft") — navigasi lewat link "Create" di
  // halaman list (BUKAN goto("/items/create") langsung), pola andal existing. ---
  await page.goto("/items");
  await page.getByRole("link", { name: /create/i }).click();
  await page.waitForURL(/\/items\/create$/);
  await page.getByRole("textbox").fill(nama);
  await page.getByRole("button", { name: /save/i }).click();
  await expect(page).toHaveURL(/\/items$/);

  const row = page.getByRole("row", { name: new RegExp(nama) });
  await expect(row).toBeVisible();
  await expect(row.getByText("Draft", { exact: true })).toBeVisible();

  // --- Submit (draft -> submitted, butuh items:update) — dulu ke status yang
  // mengizinkan reject. ---
  await row.getByRole("button", { name: /submit/i }).click();
  await expect(row.getByText("Submitted", { exact: true })).toBeVisible();

  // --- Reject (submitted -> rejected, requiresReason:true) — klik tombol
  // membuka dialog (BUKAN langsung transisi satu-klik seperti submit/approve). ---
  await row.getByRole("button", { name: /reject/i }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const confirmButton = dialog.getByRole("button", { name: /confirm/i });
  const reasonTextarea = dialog.getByLabel(/reason/i);

  // Konfirmasi disabled selagi alasan kosong.
  await expect(confirmButton).toBeDisabled();

  await reasonTextarea.fill(alasan);
  await expect(confirmButton).toBeEnabled();

  await confirmButton.click();
  await expect(dialog).toBeHidden();

  // Status baris jadi "Rejected" (badge) & "Submitted" tak lagi terlihat.
  await expect(row.getByText("Rejected", { exact: true })).toBeVisible();
  await expect(row.getByText("Submitted", { exact: true })).toHaveCount(0);

  // Tak ada transisi lanjutan terdaftar dari "rejected" (lihat
  // `itemsResource.workflow.transitions`) — tombol aksi workflow hilang.
  await expect(row.getByRole("button", { name: /submit/i })).toHaveCount(0);
  await expect(row.getByRole("button", { name: /approve/i })).toHaveCount(0);
  await expect(row.getByRole("button", { name: /reject/i })).toHaveCount(0);

  // --- Alasan tampil di timeline audit panel edit (`AuditTimeline` merender
  // `row.reason` dalam kutip kurawal “...” — cocokkan substring alasan saja
  // agar tak rapuh terhadap gaya tanda kutip). ---
  await row.getByRole("link", { name: /^edit$/i }).click();
  await page.waitForURL(/\/items\/.+\/edit$/);
  await expect(page.getByText(alasan)).toBeVisible();
});
