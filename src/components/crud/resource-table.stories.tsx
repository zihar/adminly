import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ResourceTable } from "@/components/crud/resource-table";
import {
  demoResource,
  demoListHandlers,
  demoEmptyHandlers,
  demoErrorHandlers,
} from "@/components/crud/__demo__/demo-resource";

// Tabel data generik. Data list disajikan lewat MSW (stub `/api/items`) supaya
// story deterministik tanpa dev server / backend.
const meta = {
  title: "CRUD/ResourceTable",
  component: ResourceTable,
  args: { def: demoResource },
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof ResourceTable>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Daftar berisi beberapa baris (Admin → tombol Create/Edit/Delete terlihat). */
export const WithData: Story = {
  parameters: { msw: { handlers: demoListHandlers } },
};

/** Keadaan kosong — pesan "No data yet." */
export const Empty: Story = {
  parameters: { msw: { handlers: demoEmptyHandlers } },
};

/** Keadaan error — baris "Failed to load data." saat API 500. */
export const ErrorState: Story = {
  parameters: { msw: { handlers: demoErrorHandlers } },
};
