"use client";

import { Layers } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useScope } from "@/components/providers/scope-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { resolveLabel } from "@/locales";
import { scopeDimensions } from "@/config/scope";

/** Picker scope global (mis. workspace). Fork mengisi `scopeDimensions`. */
export function ScopeSwitcher() {
  const { scope, setScope } = useScope();
  const { t } = useI18n();
  if (scopeDimensions.length === 0) return null;
  return (
    <>
      {scopeDimensions.map((dim) => {
        const label = resolveLabel(t, dim.labelKey);
        const current = String(scope[dim.key] ?? "");
        const opts = dim.options ?? [];
        return (
          <DropdownMenu key={dim.key}>
            <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
              <Layers className="size-4" />
              {opts.find((o) => o.value === current)?.label ?? label}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-40">
              <DropdownMenuGroup>
                <DropdownMenuLabel>{label}</DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                value={current}
                onValueChange={(v) => setScope({ [dim.key]: v })}
              >
                {opts.map((o) => (
                  <DropdownMenuRadioItem key={o.value} value={o.value}>
                    {o.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      })}
    </>
  );
}
