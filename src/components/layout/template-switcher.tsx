"use client";

import { Palette } from "lucide-react";

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
import { useI18n } from "@/components/providers/i18n-provider";
import { useTemplate } from "@/components/providers/template-provider";
import { TEMPLATES, type TemplateId } from "@/config/templates";
import { resolveLabel } from "@/locales";

/** Pemilih template ringkas di header. Terang/gelap tetap milik ModeToggle. */
export function TemplateSwitcher() {
  const { template, setTemplate } = useTemplate();
  const { t } = useI18n();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" />}
        aria-label={t.template.label}
      >
        <Palette className="size-[1.2rem]" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t.template.label}</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={template}
          onValueChange={(value) => setTemplate(value as TemplateId)}
        >
          {TEMPLATES.map((tpl) => (
            <DropdownMenuRadioItem key={tpl.id} value={tpl.id}>
              {resolveLabel(t, tpl.labelKey)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
