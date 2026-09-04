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
│  ├─ layout.tsx            # root: fonts, QueryProvider, ThemeProvider, I18nProvider, Toaster
│  ├─ page.tsx              # redirect → /dashboard
│  ├─ login/                # login page (outside the dashboard shell)
│  ├─ api/users/            # Route Handlers (GET/POST + [id] DELETE) — demo backend
│  └─ (app)/                # dashboard shell (sidebar + header + footer)
│     ├─ layout.tsx         # RbacProvider + SidebarProvider + AppSidebar + SiteHeader
│     ├─ dashboard/         # overview: stat cards + chart + activity
│     ├─ users/             # prefetch + hydrate → TanStack Query table
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
├─ hooks/
│  └─ api/use-users.ts      # TanStack Query hooks (query + optimistic mutations)
├─ proxy.ts                 # RBAC route protection (Next.js 16: "proxy", not "middleware")
└─ lib/
   ├─ data.ts               # dummy data — replace with a real API/DB
   ├─ api/client.ts         # typed openapi-fetch client
   ├─ api/schema.d.ts       # GENERATED from openapi.yaml (npm run gen:api)
   ├─ api/users-store.ts    # in-memory store behind the Route Handlers
   ├─ query/get-query-client.ts  # QueryClient factory (App Router pattern)
   ├─ get-dictionary.ts     # server-side i18n helper
   └─ utils.ts              # cn() helper
```

## Using it for a new project

1. **Change the identity** in `src/config/site.ts` (`siteConfig.name`).
2. **Set up the menu** by editing the `navMain` array in `src/config/site.ts` — the sidebar, breadcrumb, and active page follow automatically. Add new pages at `src/app/(app)/<name>/page.tsx`.
3. **Wire up data**: replace `src/lib/data.ts` with fetches to your API/database. Pages are Server Components, so they can be `async` + `await fetch(...)`.
4. **Branding/colors**: pick a built-in template in **Settings → Appearance**, or
   set `DEFAULT_TEMPLATE` in `src/config/templates.ts` to choose the default for
   your fork. To restyle a template, edit its CSS variables in
   `src/app/themes/<id>.css`. `src/app/themes/base.css` holds the fallback
   tokens used when no template attribute is present (Storybook, unit tests).
5. **Add UI components**: `npx shadcn@latest add <component>`.

## Generic CRUD resources + scaffold generator

A **resource** is a config-driven CRUD module (list/create/edit/delete) rendered
by the generic `[resource]` routes — no per-module page code. See
`src/config/resources/items.ts` for the anatomy (`defineResource` +
`createResourceApi`).

**Scaffold a new resource** instead of wiring it by hand:

```bash
npm run gen:resource            # interactive
# or non-interactive (bypass):
npx plop resource products Products "Contoh A" "Contoh B"
```

The generator (`plopfile.mjs` + `plop-templates/resource/`) emits and wires up:

- `src/config/resources/<name>.ts` — the resource definition (one `nama` text field to start).
- `src/app/api/<name>/{route,[id]/route,bulk-delete/route,options/route}.ts` + `_data.ts` — a mock in-memory store (following the `regions` pattern; type comes from `_data.ts`, so **no `openapi.yaml`/`gen:api` step**).
- Injects into `src/config/resources/register.ts` (registry), `src/config/rbac.ts` (4 `<name>:*` permissions + Admin role), and `src/locales/{en,id}.ts` (label block).

After generating: run `npx tsc --noEmit`, then `npm run dev` and open `/<name>`.

> **Note:** `src/config/resources/__tests__/register.test.ts` asserts the exact
> number of registered resources — bump that count when you add one. To extend a
> generated resource (more fields, cascade, real backend types), edit its
> `<name>.ts` and `_data.ts`; for a real backend add the schema to `openapi.yaml`
> and switch the type to `components["schemas"][...]` (as `items.ts` does).

## Design templates

A **template** bundles three things: colour and type tokens, the navigation
shell, and component density/surface. Three ship with Adminly:

| Template | For | Shell |
|---|---|---|
| Adminly | neutral default | sidebar |
| Kertas Kerja | long forms, master data | sidebar |
| Ruang Rapat | dashboards read together on a screen | top navigation |

Users pick one in **Settings → Appearance**; the choice is stored in the
`adminly_template` cookie. Light/dark stays a separate axis — every template
works in both.

**Adding a template:** add an entry to `TEMPLATES` in `src/config/templates.ts`,
create `src/app/themes/<id>.css` with a light block and a `.dark` block, and
import it in `globals.css` **before** `vocabulary.css`. The import order is part
of the contract — theme files must come after `base.css`, or they stop
overriding it. `src/config/__tests__/template-css.test.ts` fails if a registered
template is missing tokens — but that test parses theme files with a
brace-naive regex, so `src/app/themes/<id>.css` must contain only flat token
blocks, no `@media` and no nested rules; `vocabulary.css` is the exception and
may use them, since the integrity test never reads it.

Component styling lives only in `src/app/themes/vocabulary.css`, keyed off the
`data-slot` markers shadcn components already carry — nothing in
`src/components/ui/` is modified, so `npx shadcn@latest add` stays safe. This
works because `vocabulary.css` lives in its own CSS layer, `adminly-vocabulary`,
declared **after** Tailwind's `utilities` layer in `src/app/globals.css`
(`@layer theme, base, components, utilities, adminly-vocabulary;`). Layer order
is settled before specificity is even considered, so a rule in `vocabulary.css`
overrides a utility class that a shadcn component hardcodes into its own
`className` (e.g. `ring-1` in `card.tsx`) — that's what lets a template restyle
a component without ever touching `src/components/ui/`. The trade-off: a
utility written in a consumer's `className` no longer automatically wins over
a vocabulary rule; to override one locally you need Tailwind's `!` important
modifier (e.g. `shadow-none!`).

## Data layer (TanStack Query + typed OpenAPI client)

- `openapi.yaml` is the API contract. `npm run gen:api` regenerates
  `src/lib/api/schema.d.ts` with `openapi-typescript` — never edit it by hand.
- `src/lib/api/client.ts` is an `openapi-fetch` client typed end-to-end from the
  spec (paths, params, bodies, responses).
- Query/mutation hooks live in `src/hooks/api/*` and demonstrate caching,
  optimistic updates, and rollback (see `use-users.ts`).
- The users page prefetches on the server and hydrates on the client.

**Pointing at a real backend:** set `NEXT_PUBLIC_API_BASE_URL` (see `.env.example`),
replace `openapi.yaml` with your backend's spec (or a URL), run `npm run gen:api`,
and delete `src/app/api/*` + `src/lib/api/users-store.ts`. Everything else is unchanged.

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

## Testing & Storybook

```bash
npm test               # unit/integration (Vitest, jsdom) — 80+ tests
npm run test:watch     # Vitest watch mode
npm run test:e2e       # end-to-end (Playwright, chromium) — auto-starts npm run dev
npm run storybook      # component explorer at http://localhost:6006
npm run build-storybook # static Storybook build (Vite)
```

- **Vitest** covers the CRUD layer, registry, RBAC, components, and API route handlers (`src/**/__tests__`).
- **Playwright** e2e lives in `e2e/`. First run needs browsers: `npx playwright install chromium`.
  Specs cover generic CRUD (`crud-items`), RBAC route/UI gating (`rbac`), form validation,
  list search/sort, login, and users CRUD. Data is served by the in-memory mock stores, so no
  backend is required; `playwright.config.ts` starts the dev server automatically.
- **Storybook** uses the Vite framework (`@storybook/nextjs-vite`) — chosen over the webpack
  `@storybook/nextjs` because Next 16 defaults to Turbopack. Core CRUD components have stories
  (`src/components/crud/*.stories.tsx`); global providers (React Query, i18n, RBAC, nuqs) are
  wired as decorators in `.storybook/preview.tsx`, and network is stubbed with MSW
  (`src/components/crud/__demo__/`).

## License

[MIT](./LICENSE) © zihar
