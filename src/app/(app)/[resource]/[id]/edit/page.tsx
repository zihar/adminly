"use client";

import { use } from "react";
import { notFound, useRouter } from "next/navigation";

import { ResourceForm } from "@/components/crud/resource-form";
import { PageHeader } from "@/components/layout/page-header";
import { useI18n } from "@/components/providers/i18n-provider";
import { getResource } from "@/config/resources/index";
import { ensureResourcesRegistered } from "@/config/resources/register";
import { resolveLabel } from "@/locales";

export default function Page({
  params,
}: {
  params: Promise<{ resource: string; id: string }>;
}) {
  ensureResourcesRegistered();
  const { resource, id } = use(params);
  const router = useRouter();
  const { t } = useI18n();
  const def = getResource(resource);
  if (!def) notFound();

  const title = `${t.common.edit} ${resolveLabel(t, `${def.name}.title`)}`;

  return (
    <div className="space-y-4">
      <PageHeader title={title} />
      <ResourceForm def={def} id={id} onDone={() => router.push(`/${resource}`)} />
    </div>
  );
}
