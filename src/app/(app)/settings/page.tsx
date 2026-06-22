import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getDictionary } from "@/lib/get-dictionary";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: t.settings.title };
}

export default async function SettingsPage() {
  const t = await getDictionary();

  return (
    <>
      <PageHeader title={t.settings.title} description={t.settings.description} />

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">{t.settings.tabGeneral}</TabsTrigger>
          <TabsTrigger value="account">{t.settings.tabAccount}</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>{t.settings.orgTitle}</CardTitle>
              <CardDescription>{t.settings.orgDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="org">{t.settings.orgName}</Label>
                <Input id="org" defaultValue="Acme Inc." className="max-w-sm" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="domain">{t.settings.domain}</Label>
                <Input id="domain" defaultValue="acme.example.com" className="max-w-sm" />
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4">
              <Button>{t.settings.save}</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>{t.settings.profileTitle}</CardTitle>
              <CardDescription>{t.settings.profileDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name">{t.settings.name}</Label>
                <Input id="name" defaultValue="Admin" className="max-w-sm" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">{t.settings.email}</Label>
                <Input id="email" type="email" defaultValue="admin@example.com" className="max-w-sm" />
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4">
              <Button>{t.settings.save}</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
