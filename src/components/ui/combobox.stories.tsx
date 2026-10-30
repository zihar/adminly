import * as React from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Combobox } from "@/components/ui/combobox";

const OPTIONS = [
  { value: "high", label: "Tinggi" },
  { value: "medium", label: "Sedang" },
  { value: "low", label: "Rendah" },
];

const meta = {
  title: "UI/Combobox",
  component: Combobox,
  args: {
    options: OPTIONS,
    value: "",
    onChange: () => {},
    placeholder: "Pilih…",
    searchPlaceholder: "Cari…",
    emptyLabel: "Tidak ada hasil",
  },
  render: function Render(args) {
    const [value, setValue] = React.useState(args.value);
    return (
      <div style={{ maxWidth: 280 }}>
        <Combobox {...args} value={value} onChange={setValue} />
      </div>
    );
  },
} satisfies Meta<typeof Combobox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Filter tabel: opsi pertama "Semua" bernilai kosong. */
export const DenganOpsiSemua: Story = { args: { clearLabel: "Semua" } };

export const Terpilih: Story = { args: { value: "medium" } };

export const TidakValid: Story = { args: { invalid: true } };
