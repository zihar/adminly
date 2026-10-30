"use client"

import { cn } from "@/lib/utils"

type FilterChipOption = { value: string; label: string }

type FilterChipsProps = {
  options: FilterChipOption[]
  value: string
  onChange: (value: string) => void
  /** Label chip pertama, bernilai `""` (tanpa filter). */
  allLabel: string
  /** Nama grup untuk pembaca layar (mis. label field filter). */
  label?: string
  className?: string
}

/**
 * Grup chip filter satu-pilihan. Setiap chip adalah tombol biasa dengan
 * `aria-pressed`, jadi Tab/Enter/Spasi bekerja tanpa penanganan papan ketik
 * khusus. Warna hanya lewat token.
 */
function FilterChips({
  options,
  value,
  onChange,
  allLabel,
  label,
  className,
}: FilterChipsProps) {
  const chips: FilterChipOption[] = [{ value: "", label: allLabel }, ...options]
  return (
    <div
      role="group"
      aria-label={label}
      data-slot="filter-chips"
      className={cn("flex flex-wrap items-center gap-2", className)}
    >
      {chips.map((chip) => {
        const active = chip.value === value
        return (
          <button
            key={chip.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(chip.value)}
            className={cn(
              "inline-flex h-8 items-center rounded-full border px-3 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:bg-muted"
            )}
          >
            {chip.label}
          </button>
        )
      })}
    </div>
  )
}

export { FilterChips }
export type { FilterChipOption, FilterChipsProps }
