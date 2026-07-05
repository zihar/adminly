import { z } from "zod";
import { defineResource } from "@/lib/crud/define-resource";
import { createResourceApi } from "@/lib/crud/create-resource-api";
import type { components } from "@/lib/api/schema";

type T = components["schemas"]["Slider"];
type TNew = components["schemas"]["NewSlider"];

export const sliderSchema = z.object({
  slider: z.string().min(1, "Wajib diisi"),
});

export const sliderResource = defineResource<T, TNew, TNew>({
  name: "slider",
  path: "/slider",
  api: createResourceApi<T, TNew, TNew>({ resource: "slider", path: "/slider" }),
  permissions: {
    view: "slider:view",
    create: "slider:create",
    update: "slider:update",
    delete: "slider:delete",
  },
  columns: [
    { field: "slider", labelKey: "slider.slider", sortable: true, searchable: true },
  ],
  list: { defaultSort: "slider", perPage: 20 },
  form: {
    schema: sliderSchema,
    layout: [{ tabKey: "umum", fields: ["slider"] }],
    fields: { slider: { type: "text", labelKey: "slider.slider" } },
  },
});
