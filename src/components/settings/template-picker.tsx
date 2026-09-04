"use client";

import { Check } from "lucide-react";
import { useTheme } from "next-themes";

import { useI18n } from "@/components/providers/i18n-provider";
import { useTemplate } from "@/components/providers/template-provider";
import { TEMPLATES } from "@/config/templates";
import { resolveLabel } from "@/locales";
import { cn } from "@/lib/utils";

/**
 * Kartu pilihan template. Tiap kartu memuat MINIATUR ASLI — bukan tangkapan
 * layar — yang dibungkus atribut template sendiri, jadi pratinjaunya tak
 * pernah bisa basi terhadap templatenya.
 *
 * Miniatur memakai token via `bg-sidebar`, `bg-card`, dst. dan mewarisi mode
 * terang/gelap halaman; ia sengaja TIDAK mencoba menampilkan kedua mode
 * sekaligus.
 *
 * Elemen "kartu" di dalam miniatur diberi `data-slot="card"` (bukan gaya
 * `border`/`shadow` yang ditulis tangan) supaya aturan asli di
 * `src/app/themes/vocabulary.css` — `[data-surface="terangkat"]
 * :where([data-slot="card"]) { box-shadow: var(--lift) }` — ikut berlaku di
 * subtree ini. Aturan itu MENIMPA `box-shadow` yang sama dipakai `ring-1
 * ring-foreground/10` (garis kartu asli, lihat `card.tsx`), jadi pratinjau
 * `terangkat` otomatis kehilangan garisnya dan mendapat elevasi — tanpa
 * cabang kode per-template di sini.
 */
export function TemplatePicker() {
  const { template, setTemplate } = useTemplate();
  const { t } = useI18n();
  // Varian gelap tiap template di src/app/themes/*.css ditulis sebagai
  // selector GABUNGAN `[data-template="x"].dark` — kelas `.dark` harus ada
  // di ELEMEN YANG SAMA dengan `data-template`, bukan sekadar leluhur.
  // <html> punya keduanya sekaligus (lihat layout.tsx), tapi div miniatur di
  // sini cuma leluhur `.dark`-nya — jadi kelasnya harus dipasang manual di
  // sini juga, kalau tidak miniatur SELALU tampil terang walau halaman gelap.
  const { resolvedTheme } = useTheme();
  // Aman hanya karena tab Appearance dipasang malas (Base UI `Tabs.Panel`
  // defaultnya `keepMounted={false}`) SETELAH `ThemeProvider` selesai
  // meresolusi tema — kalau nanti pemasangan tab jadi eager atau
  // digerakkan URL, miniatur ini bisa sekejap menampilkan palet yang salah.
  const isDark = resolvedTheme === "dark";

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {TEMPLATES.map((tpl) => {
        const selected = tpl.id === template;
        return (
          <button
            key={tpl.id}
            type="button"
            onClick={() => setTemplate(tpl.id)}
            aria-pressed={selected}
            className={cn(
              "group rounded-lg border p-1 text-left transition-shadow",
              "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
              selected ? "border-primary ring-primary ring-1" : "hover:border-foreground/25",
            )}
          >
            <div
              data-template={tpl.id}
              data-density={tpl.density}
              data-surface={tpl.surface}
              className={cn("bg-background overflow-hidden rounded-md", isDark && "dark")}
            >
              {tpl.shell === "topnav" ? (
                <div className="bg-sidebar flex h-7 items-center gap-2 px-2">
                  <span className="bg-sidebar-foreground/85 size-2.5 rounded-sm" />
                  <span className="bg-sidebar-foreground/45 h-1.5 w-8 rounded-full" />
                  <span className="bg-sidebar-foreground/45 h-1.5 w-8 rounded-full" />
                </div>
              ) : null}
              <div className="flex h-24">
                {tpl.shell === "sidebar" ? (
                  <div className="bg-sidebar border-border w-12 shrink-0 space-y-1.5 border-r p-2">
                    <span className="bg-sidebar-primary block size-3 rounded-sm" />
                    <span className="bg-sidebar-foreground/25 block h-1.5 w-full rounded-full" />
                    <span className="bg-sidebar-foreground/25 block h-1.5 w-3/4 rounded-full" />
                  </div>
                ) : null}
                <div className="flex-1 space-y-2 p-2">
                  {/*
                   * `data-slot="card"` + `ring-1 ring-foreground/10` meniru
                   * gaya asli `card.tsx` (bukan utility `border` yang ditulis
                   * tangan) supaya aturan `terangkat` di vocabulary.css —
                   * yang menimpa properti `box-shadow` yang sama dipakai
                   * `ring` — benar-benar menghapus garisnya, bukan cuma
                   * menambah bayangan di atas garis yang tetap ada.
                   */}
                  <div
                    data-slot="card"
                    className="bg-card ring-foreground/10 rounded-md p-2 ring-1"
                  >
                    <span className="bg-foreground/70 block h-1.5 w-1/2 rounded-full" />
                    <span className="bg-muted-foreground/40 mt-1.5 block h-1.5 w-full rounded-full" />
                    <span className="bg-muted-foreground/40 mt-1 block h-1.5 w-4/5 rounded-full" />
                  </div>
                  <span className="bg-primary block h-4 w-14 rounded-md" />
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2 px-2 py-2">
              <span
                className={cn(
                  "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-sm border",
                  selected
                    ? "bg-primary border-primary text-primary-foreground"
                    : "border-muted-foreground/40",
                )}
              >
                {selected ? <Check className="size-3" /> : null}
              </span>
              <span>
                <span className="block text-sm font-medium">
                  {resolveLabel(t, tpl.labelKey)}
                </span>
                <span className="text-muted-foreground block text-sm">
                  {resolveLabel(t, tpl.descKey)}
                </span>
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
