"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Boxes } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/providers/i18n-provider";
import { siteConfig } from "@/config/site";
import { setAuthTokenProvider } from "@/lib/api/auth";
import { setSession, getToken } from "@/lib/session";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

type LoginResponse = { access_token: string; user: { permissions: string[] } };

export function LoginForm() {
  const router = useRouter();
  const { t } = useI18n();
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const fd = new FormData(event.currentTarget);
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: fd.get("email"), password: fd.get("password") }),
      });
      if (!res.ok) {
        setError("Email atau password salah.");
        return;
      }
      const data = (await res.json()) as LoginResponse;
      setSession(data.access_token, data.user.permissions ?? []);
      setAuthTokenProvider(() => getToken());
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="items-center text-center">
        <div className="mb-2 flex aspect-square size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Boxes className="size-5" />
        </div>
        <CardTitle className="text-xl">
          {t.login.signInTo} {siteConfig.name}
        </CardTitle>
        <CardDescription>{t.login.subtitle}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="email">{t.login.email}</Label>
            <Input id="email" name="email" type="email" placeholder={t.login.emailPlaceholder} autoComplete="email" required />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="password">{t.login.password}</Label>
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "..." : t.login.submit}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
