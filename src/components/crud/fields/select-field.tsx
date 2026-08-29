"use client";
import * as React from "react";
import { useController } from "react-hook-form";
import { useI18n } from "@/components/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type { FieldProps } from "./index";

/**
 * Select statis: opsi datang dari `meta.options` (label sudah final, tak
 * perlu re-i18n). `field.onChange` selalu dipanggil dengan `String(o.value)`
 * — native `<select>` yang digantikan komponen ini SELALU mengirim string
 * lewat `e.target.value`, jadi tipe itu dilestarikan biar config resource
 * ber-value numerik tak diam-diam berubah tipe tersimpannya di form.
 */
export function SelectField({ name, meta }: FieldProps) {
  const { t } = useI18n();
  const { field, fieldState } = useController({ name });
  const [open, setOpen] = React.useState(false);
  const options = meta.options ?? [];
  const value = field.value === undefined || field.value === null ? "" : String(field.value);
  const selected = options.find((o) => String(o.value) === value);
  // Satu jalur tutup terpusat: `onOpenChange` menangkap Escape/klik-luar,
  // sedangkan memilih opsi menutup popover lewat `setOpen(false)` LANGSUNG
  // di `onSelect` -- itu TIDAK memicu `onOpenChange` (prop `open` yang
  // berubah dari kode sendiri tak dianggap Popover sebagai permintaan
  // eksternal). Tanpa `close()` bersama, `field.onBlur()` tak pernah
  // terpanggil saat user memilih opsi -- `touchedFields` diam-diam tak
  // pernah terisi lewat jalur itu (dibuktikan probe empiris).
  const close = () => {
    setOpen(false);
    field.onBlur();
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next: boolean) => {
        if (next) setOpen(true);
        else close();
      }}
    >
      <PopoverTrigger
        render={
          <Button
            ref={field.ref}
            variant="outline"
            className="w-full justify-start font-normal"
            aria-invalid={fieldState.invalid}
          />
        }
      >
        {selected?.label ?? t.common.selectPlaceholder}
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder={t.common.searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{t.common.noResults}</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem
                  key={String(o.value)}
                  value={o.label}
                  onSelect={() => {
                    field.onChange(String(o.value));
                    close();
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
  );
}
