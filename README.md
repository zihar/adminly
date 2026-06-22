# Adminly

**Adminly** — starter dashboard generik untuk **internal tool**, siap di-fork tiap ada project baru.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui (varian Base UI) · Recharts · next-themes · Sonner.

## Menjalankan

```bash
git clone https://github.com/zihar/adminly.git
cd adminly
npm install

npm run dev     # mode development (http://localhost:3000)
npm run build   # build produksi
npm start       # jalankan hasil build
```

`/` otomatis redirect ke `/dashboard`.

## Struktur

```
src/
├─ app/
│  ├─ layout.tsx            # root: font, ThemeProvider, Toaster
│  ├─ page.tsx              # redirect → /dashboard
│  └─ (app)/                # shell dashboard (sidebar + header)
│     ├─ layout.tsx         # SidebarProvider + AppSidebar + SiteHeader
│     ├─ dashboard/         # ringkasan: stat card + chart + aktivitas
│     ├─ users/             # contoh tabel + search + aksi baris
│     ├─ analytics/         # contoh halaman chart
│     └─ settings/          # contoh form + tabs
├─ components/
│  ├─ ui/                   # komponen shadcn (jangan diedit kecuali perlu)
│  ├─ layout/               # app-sidebar, site-header, nav-user, mode-toggle, page-header
│  ├─ dashboard/            # stat-card, overview-chart, users-table
│  └─ providers/            # theme-provider
├─ config/site.ts           # ⭐ nama app + item navigasi sidebar
└─ lib/
   ├─ data.ts               # data dummy — ganti dengan API/DB asli
   └─ utils.ts              # helper cn()
```

## Cara memakai untuk project baru

1. **Ganti identitas** di `src/config/site.ts` (`siteConfig.name`) dan judul di `src/app/layout.tsx`.
2. **Atur menu** dengan mengedit array `navMain` di `src/config/site.ts` — sidebar, breadcrumb, dan halaman aktif ikut otomatis. Tambah halaman baru di `src/app/(app)/<nama>/page.tsx`.
3. **Sambungkan data**: ganti `src/lib/data.ts` dengan fetch ke API/database. Page adalah Server Component, jadi bisa `async` + `await fetch(...)`.
4. **Branding/warna**: ubah variabel CSS di `src/app/globals.css` (`:root` dan `.dark`).
5. **Tambah komponen UI**: `npx shadcn@latest add <komponen>`.

## Catatan teknis

- Komponen shadcn di sini memakai **Base UI** (`@base-ui/react`), bukan Radix. Untuk komposisi, pakai prop **`render={<Komponen />}`** — bukan `asChild`. Contoh di `app-sidebar.tsx` & `nav-user.tsx`.
- Dark mode pakai `next-themes` (class `.dark`). Toggle ada di header.
- State buka/tutup sidebar tersimpan di cookie `sidebar_state`, dibaca di `(app)/layout.tsx`.

## RBAC (Role-Based Access Control)

Adminly punya scaffold RBAC siap pakai dengan 3 role contoh: **Admin · Editor · Viewer**.

- **Sumber kebenaran:** `src/config/rbac.ts` — daftar role, `Permission`, pemetaan
  `ROLE_PERMISSIONS`, dan `ROUTE_PERMISSIONS` (prefix route → permission).
- **Proteksi route:** `src/proxy.ts` memblokir akses halaman sesuai role (redirect ke
  `/dashboard`). Catatan: di Next.js 16 `middleware` diganti **`proxy`**.
- **Gating UI:** sidebar otomatis menyembunyikan menu tanpa izin (`navMain[].permission`),
  dan komponen `<Can permission="users:manage">…</Can>` untuk tombol/aksi.
- **Role aktif (demo):** disimpan di cookie `adminly_role`, bisa diganti lewat
  **Role switcher** di header. Di project nyata, ganti sumber role dengan sesi/JWT user
  dan verifikasi otorisasi juga di Server Component/Server Action.

| Role | dashboard | analytics | users | settings |
|------|:--------:|:---------:|:-----:|:--------:|
| Admin  | ✅ | ✅ | ✅ | ✅ |
| Editor | ✅ | ✅ | — | — |
| Viewer | ✅ | — | — | — |

## Lisensi

[MIT](./LICENSE) © zihar
