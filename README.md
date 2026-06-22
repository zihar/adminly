# Adminly

**Adminly** — a generic **internal-tool** dashboard starter, ready to fork for each new project.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui (Base UI variant) · Recharts · next-themes · Sonner.

## Running

```bash
git clone https://github.com/zihar/adminly.git
cd adminly
npm install

npm run dev     # development mode (http://localhost:3000)
npm run build   # production build
npm start       # run the production build
```

`/` redirects to `/dashboard` automatically.

## Structure

```
src/
├─ app/
│  ├─ layout.tsx            # root: fonts, ThemeProvider, I18nProvider, Toaster
│  ├─ page.tsx              # redirect → /dashboard
│  ├─ login/                # login page (outside the dashboard shell)
│  └─ (app)/                # dashboard shell (sidebar + header + footer)
│     ├─ layout.tsx         # RbacProvider + SidebarProvider + AppSidebar + SiteHeader
│     ├─ dashboard/         # overview: stat cards + chart + activity
│     ├─ users/             # example table + search + row actions
│     ├─ analytics/         # example chart page
│     └─ settings/          # example form + tabs
├─ components/
│  ├─ ui/                   # shadcn components (don't edit unless needed)
│  ├─ layout/               # app-sidebar, site-header/footer, nav-user, mode/role/locale toggles
│  ├─ dashboard/            # stat-card, overview-chart, users-table
│  ├─ auth/                 # login-form, <Can> (permission gating)
│  └─ providers/            # theme-provider, rbac-provider, i18n-provider
├─ config/
│  ├─ site.ts               # ⭐ app name + sidebar nav items
│  ├─ rbac.ts               # roles, permissions, route→permission map
│  └─ i18n.ts               # locales config (default English)
├─ locales/                 # en.ts (type source) + id.ts dictionaries
├─ proxy.ts                 # RBAC route protection (Next.js 16: "proxy", not "middleware")
└─ lib/
   ├─ data.ts               # dummy data — replace with a real API/DB
   ├─ get-dictionary.ts     # server-side i18n helper
   └─ utils.ts              # cn() helper
```

## Using it for a new project

1. **Change the identity** in `src/config/site.ts` (`siteConfig.name`).
2. **Set up the menu** by editing the `navMain` array in `src/config/site.ts` — the sidebar, breadcrumb, and active page follow automatically. Add new pages at `src/app/(app)/<name>/page.tsx`.
3. **Wire up data**: replace `src/lib/data.ts` with fetches to your API/database. Pages are Server Components, so they can be `async` + `await fetch(...)`.
4. **Branding/colors**: edit the CSS variables in `src/app/globals.css` (`:root` and `.dark`).
5. **Add UI components**: `npx shadcn@latest add <component>`.

## Technical notes

- The shadcn components here use **Base UI** (`@base-ui/react`), not Radix. For composition, use the **`render={<Component />}`** prop — not `asChild`. See `app-sidebar.tsx` & `nav-user.tsx`.
- Dark mode uses `next-themes` (`.dark` class). The toggle is in the header.
- The sidebar open/closed state is stored in the `sidebar_state` cookie, read in `(app)/layout.tsx`.

## RBAC (Role-Based Access Control)

Adminly ships a ready-to-use RBAC scaffold with 3 example roles: **Admin · Editor · Viewer**.

- **Source of truth:** `src/config/rbac.ts` — the role list, `Permission`, the
  `ROLE_PERMISSIONS` map, and `ROUTE_PERMISSIONS` (route prefix → permission).
- **Route protection:** `src/proxy.ts` blocks page access by role (redirects to
  `/dashboard`). Note: in Next.js 16, `middleware` was renamed to **`proxy`**.
- **UI gating:** the sidebar automatically hides menus without permission
  (`navMain[].permission`), and the `<Can permission="users:manage">…</Can>` component
  gates buttons/actions.
- **Active role (demo):** stored in the `adminly_role` cookie, switchable via the
  **Role switcher** in the header. In a real project, replace the role source with the
  user's session/JWT and also verify authorization in Server Components/Server Actions.

| Role | dashboard | analytics | users | settings |
|------|:--------:|:---------:|:-----:|:--------:|
| Admin  | ✅ | ✅ | ✅ | ✅ |
| Editor | ✅ | ✅ | — | — |
| Viewer | ✅ | — | — | — |

## i18n (multiple languages)

Adminly has a lightweight **dictionary + cookie** i18n setup, defaulting to **English** (`en`),
with **Indonesian** (`id`) as a second option. The locale is NOT in the URL — a good fit for
internal tools that don't need multi-locale SEO.

- **Dictionaries:** `src/locales/en.ts` (source of truth for the `Dictionary` type) &
  `src/locales/id.ts` (must follow the same shape — TypeScript errors if a key is missing).
- **Server Components:** `await getDictionary()` from `src/lib/get-dictionary.ts`
  (used in every `page.tsx` + `generateMetadata`).
- **Client Components:** `const { t, locale, setLocale } = useI18n()` from
  `src/components/providers/i18n-provider.tsx`.
- **Switching language:** via the **Language switcher** in the header (stored in the
  `adminly_locale` cookie).
- `<html lang>` follows the active locale (set in `src/app/layout.tsx`).

Adding a new language: add its code to `LOCALES` (`src/config/i18n.ts`), create
`src/locales/<code>.ts` mirroring the `Dictionary` shape, and register it in `src/locales/index.ts`.

## License

[MIT](./LICENSE) © zihar
