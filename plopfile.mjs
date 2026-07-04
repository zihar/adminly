/**
 * Generator scaffold resource CRUD generik.
 *
 * Jalankan:  npm run gen:resource
 *
 * Menghasilkan satu resource yang langsung jalan end-to-end di atas layer CRUD
 * generik (`defineResource` + route dinamis `[resource]`), meniru pola
 * `items`/`regions`:
 *   - src/config/resources/<name>.ts          (definisi resource)
 *   - src/app/api/<name>/_data.ts              (mock store in-memory)
 *   - src/app/api/<name>/route.ts              (GET list + POST)
 *   - src/app/api/<name>/[id]/route.ts         (GET/PUT/DELETE)
 *   - src/app/api/<name>/bulk-delete/route.ts  (POST)
 *   - src/app/api/<name>/options/route.ts      (GET options)
 * dan menyunting (inject) file bersama:
 *   - src/config/resources/register.ts   (import + daftarkan ke registry)
 *   - src/config/rbac.ts                 (4 permission ke union + role Admin)
 *   - src/locales/en.ts & id.ts          (blok label i18n)
 *
 * Route UI tidak perlu digenerate — `src/app/(app)/[resource]/…` sudah generik.
 * Tipe diambil dari mock store (`_data.ts`), jadi tidak menyentuh openapi.yaml.
 */
// eslint-disable-next-line import/no-anonymous-default-export -- kontrak API plop: plopfile mengekspor fungsi setup
export default function (plop) {
  plop.setGenerator("resource", {
    description: "Scaffold resource CRUD generik baru (config + API mock + i18n + RBAC)",
    prompts: [
      {
        type: "input",
        name: "name",
        message: 'Nama resource (plural, huruf kecil, mis. "products"):',
        validate: (v) =>
          /^[a-z][a-z0-9-]*$/.test(v) ||
          "Wajib huruf kecil, boleh angka/dash, diawali huruf.",
      },
      {
        type: "input",
        name: "label",
        message: 'Label tampil di UI (mis. "Products"):',
        default: (a) => a.name.charAt(0).toUpperCase() + a.name.slice(1),
      },
      { type: "input", name: "seedA", message: "Contoh data #1 (nama):", default: "Contoh A" },
      { type: "input", name: "seedB", message: "Contoh data #2 (nama):", default: "Contoh B" },
    ],
    actions: () => {
      const tpl = (f) => `plop-templates/resource/${f}`;
      return [
        // --- File baru (add) ---
        {
          type: "add",
          path: "src/config/resources/{{name}}.ts",
          templateFile: tpl("resource.ts.hbs"),
        },
        {
          type: "add",
          path: "src/app/api/{{name}}/_data.ts",
          templateFile: tpl("_data.ts.hbs"),
        },
        {
          type: "add",
          path: "src/app/api/{{name}}/route.ts",
          templateFile: tpl("route.ts.hbs"),
        },
        {
          type: "add",
          path: "src/app/api/{{name}}/[id]/route.ts",
          templateFile: tpl("id-route.ts.hbs"),
        },
        {
          type: "add",
          path: "src/app/api/{{name}}/bulk-delete/route.ts",
          templateFile: tpl("bulk-delete.ts.hbs"),
        },
        {
          type: "add",
          path: "src/app/api/{{name}}/options/route.ts",
          templateFile: tpl("options.ts.hbs"),
        },

        // --- Injeksi file bersama (modify) ---
        // register.ts: import resource baru (setelah import registry yg selalu di baris atas)
        {
          type: "modify",
          path: "src/config/resources/register.ts",
          pattern: /(import { registerResources } from "@\/config\/resources\/index";\n)/,
          template:
            '$1import { {{camelCase name}}Resource } from "@/config/resources/{{name}}";\n',
        },
        // register.ts: daftarkan ke array registerResources([...])
        {
          type: "modify",
          path: "src/config/resources/register.ts",
          pattern: /registerResources\(\[/,
          template: "registerResources([{{camelCase name}}Resource, ",
        },
        // rbac.ts: tambah 4 literal ke union Permission (sebagai anggota pertama)
        {
          type: "modify",
          path: "src/config/rbac.ts",
          pattern: /(export type Permission =\n)/,
          template:
            '$1  | "{{name}}:view"\n  | "{{name}}:create"\n  | "{{name}}:update"\n  | "{{name}}:delete"\n',
        },
        // rbac.ts: beri role Admin keempat permission tsb
        {
          type: "modify",
          path: "src/config/rbac.ts",
          pattern: /(  Admin: \[\n)/,
          template:
            '$1    "{{name}}:view",\n    "{{name}}:create",\n    "{{name}}:update",\n    "{{name}}:delete",\n',
        },
        // en.ts: blok label (sumber kebenaran tipe Dictionary)
        {
          type: "modify",
          path: "src/locales/en.ts",
          pattern: /(export const en = \{\n)/,
          template: '$1  {{name}}: {\n    title: "{{label}}",\n    nama: "Name",\n  },\n',
        },
        // id.ts: blok label (wajib mirror bentuk en.ts)
        {
          type: "modify",
          path: "src/locales/id.ts",
          pattern: /(export const id: Dictionary = \{\n)/,
          template: '$1  {{name}}: {\n    title: "{{label}}",\n    nama: "Nama",\n  },\n',
        },

        // Catatan penutup untuk developer.
        (answers) =>
          `\nSelesai. Jalankan \`npm run dev\` lalu buka /${answers.name}. ` +
          "Verifikasi tipe: `npx tsc --noEmit`.",
      ];
    },
  });
}
