import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ResourceForm } from "@/components/crud/resource-form";
import { demoResource, demoListHandlers } from "@/components/crud/__demo__/demo-resource";

// Form generik berbasis `def.form` (react-hook-form + zodResolver). Mode create
// (tanpa `id`) tidak menembak network saat render — useGetOne di-gate `enabled`.
const meta = {
  title: "CRUD/ResourceForm",
  component: ResourceForm,
  args: { def: demoResource },
  parameters: { msw: { handlers: demoListHandlers } },
} satisfies Meta<typeof ResourceForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Mode create — form kosong, tombol Save. Submit kosong → error zod inline. */
export const Create: Story = {};

/** Mode edit — memuat data id "1" via MSW lalu prefill field. */
export const Edit: Story = {
  args: { id: "1" },
};
