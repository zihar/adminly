"use client";

import { ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRbac } from "@/components/providers/rbac-provider";
import { ROLES, type Role } from "@/config/rbac";

/**
 * Switcher role untuk DEMO — mengganti role aktif on-the-fly (disimpan di cookie).
 * Di project nyata, role datang dari sesi user; komponen ini bisa dihapus.
 */
export function RoleSwitcher() {
  const { role, setRole } = useRbac();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
        <ShieldCheck className="size-4" />
        {role}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuLabel>Role (demo)</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={role}
          onValueChange={(value) => setRole(value as Role)}
        >
          {ROLES.map((r) => (
            <DropdownMenuRadioItem key={r} value={r}>
              {r}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
