import { ResourcePage } from "@/components/crud/resource-page";
import { ensureResourcesRegistered } from "@/config/resources/register";

export default async function Page({
  params,
}: {
  params: Promise<{ resource: string }>;
}) {
  ensureResourcesRegistered();
  const { resource } = await params;
  return <ResourcePage resource={resource} />;
}
