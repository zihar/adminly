"use client";

import { notFound } from "next/navigation";

import { ResourceTable } from "@/components/crud/resource-table";
import { getResource } from "@/config/resources/index";
import { ensureResourcesRegistered } from "@/config/resources/register";

/**
 * Jembatan Server → Client untuk `ResourcePage`.
 *
 * `ResourceDef` berisi fungsi (hook `useList`, dst.) & instance Zod
 * (`form.schema`) yang TIDAK bisa diserialize lewat boundary RSC — meneruskan
 * `def` sebagai prop dari Server Component ke `ResourceTable` ("use client")
 * gagal saat build/runtime ("Functions cannot be passed directly to Client
 * Components..."). Komponen ini hanya menerima `resource` (string, aman
 * diserialize) lalu me-resolve `def` di sisi client — pola sama seperti yang
 * dipakai `[resource]/create/page.tsx` & `[resource]/[id]/edit/page.tsx`.
 */
export function ResourceTableBoundary({ resource }: { resource: string }) {
  ensureResourcesRegistered();
  const def = getResource(resource);
  if (!def) notFound();
  return <ResourceTable def={def} />;
}
