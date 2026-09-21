"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { ResourceForm } from "@/components/crud/resource-form";
import { getResource } from "@/config/resources/index";
import { ensureResourcesRegistered } from "@/config/resources/register";

export default function Page({ params }: { params: Promise<{ resource: string; id: string }> }) {
  ensureResourcesRegistered();
  const { resource, id } = use(params);
  const def = getResource(resource);
  if (!def) notFound();
  const Detail = def.components?.detail;
  return Detail ? <Detail def={def} id={id} /> : <ResourceForm def={def} id={id} mode="detail" />;
}
