import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/login-form";
import { getDictionary } from "@/lib/get-dictionary";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: t.login.metaTitle };
}

export default function LoginPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/30 p-4">
      <LoginForm />
    </main>
  );
}
