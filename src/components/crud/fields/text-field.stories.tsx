import * as React from "react";
import { useForm, FormProvider } from "react-hook-form";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { TextField } from "@/components/crud/fields/text-field";

// TextField hanya butuh konteks react-hook-form (register). Decorator di bawah
// menyediakan FormProvider agar field bisa dirender terisolasi.
const meta = {
  title: "CRUD/Fields/TextField",
  component: TextField,
  decorators: [
    (Story) => {
      const methods = useForm({ defaultValues: { nama: "" } });
      return (
        <FormProvider {...methods}>
          <div style={{ maxWidth: 320 }}>
            <Story />
          </div>
        </FormProvider>
      );
    },
  ],
  args: { name: "nama", meta: { type: "text" } },
} satisfies Meta<typeof TextField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
