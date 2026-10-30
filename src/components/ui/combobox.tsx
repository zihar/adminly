"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

type ComboboxOption = { value: string | number; label: string }

type ComboboxProps = {
  options: ComboboxOption[]
  value: string
  /** Selalu menerima `String(option.value)`; opsi `clearLabel` mengirim `""`. */
  onChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyLabel?: string
  /** Bila ada, opsi pertama bernilai `""` berlabel ini (mis. filter "Semua"). */
  clearLabel?: string
  invalid?: boolean
  disabled?: boolean
  className?: string
  onBlur?: () => void
  ref?: React.Ref<HTMLButtonElement>
}

/**
 * Pilihan tunggal yang bisa dicari (Popover + cmdk). Diekstrak dari
 * `SelectField` supaya form dan filter tabel memakai satu komponen.
 *
 * `onChange` selalu mengirim string: `<select>` bawaan yang digantikannya
 * selalu mengirim string lewat `e.target.value`, jadi tipe itu dilestarikan
 * agar config resource ber-value numerik tak diam-diam berubah tipe.
 */
function Combobox({
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  clearLabel,
  invalid,
  disabled,
  className,
  onBlur,
  ref,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const items: ComboboxOption[] =
    clearLabel === undefined
      ? options
      : [{ value: "", label: clearLabel }, ...options]
  const selected = items.find((o) => String(o.value) === value)
  // Satu jalur tutup terpusat: `onOpenChange` menangkap Escape/klik-luar,
  // sedangkan memilih opsi menutup popover lewat `setOpen(false)` LANGSUNG
  // di `onSelect` -- itu TIDAK memicu `onOpenChange` (prop `open` yang
  // berubah dari kode sendiri tak dianggap Popover sebagai permintaan
  // eksternal). Tanpa `close()` bersama, `onBlur` tak pernah terpanggil saat
  // user memilih opsi -- `touchedFields` form diam-diam tak pernah terisi
  // lewat jalur itu (dibuktikan probe empiris).
  const close = () => {
    setOpen(false)
    onBlur?.()
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next: boolean) => {
        if (next && !disabled) setOpen(true)
        else close()
      }}
    >
      <PopoverTrigger
        render={
          <Button
            ref={ref}
            variant="outline"
            className={cn("w-full justify-start font-normal", className)}
            aria-invalid={invalid}
            disabled={disabled}
          />
        }
      >
        {selected?.label ?? placeholder}
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyLabel}</CommandEmpty>
            <CommandGroup>
              {items.map((o) => (
                <CommandItem
                  key={String(o.value)}
                  value={o.label}
                  onSelect={() => {
                    onChange(String(o.value))
                    close()
                  }}
                >
                  {o.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export { Combobox }
export type { ComboboxOption, ComboboxProps }
