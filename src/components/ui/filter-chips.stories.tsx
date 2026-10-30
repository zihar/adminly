import * as React from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { FilterChips } from "@/components/ui/filter-chips";

const meta = {
  title: "UI/FilterChips",
  component: FilterChips,
  args: {
    options: [
      { value: "draft", label: "Draf" },
      { value: "submitted", label: "Diajukan" },
      { value: "approved", label: "Disetujui" },
      { value: "rejected", label: "Ditolak" },
    ],
    value: "",
    onChange: () => {},
    allLabel: "Semua",
    label: "Status",
  },
  render: function Render(args) {
    const [value, setValue] = React.useState(args.value);
    return <FilterChips {...args} value={value} onChange={setValue} />;
  },
} satisfies Meta<typeof FilterChips>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Terpilih: Story = { args: { value: "approved" } };
