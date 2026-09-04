import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import "./globals.css";
import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { I18nProvider } from "@/components/providers/i18n-provider";
import { TemplateProvider } from "@/components/providers/template-provider";
import { Toaster } from "@/components/ui/sonner";
import { LOCALE_COOKIE, parseLocale } from "@/config/i18n";
import {
  TEMPLATE_COOKIE,
  parseTemplate,
  templateById,
} from "@/config/templates";

const geistSans = Geist({
  // Dulu "--font-sans". Dipindah supaya `--font-sans` di @theme inline bebas
  // menunjuk `--font-app`, token yang boleh diganti tiap template.
  variable: "--font-geist",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Adminly",
    template: "%s · Adminly",
  },
  description:
    "Generic internal-tool dashboard starter — fork it for each new project.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const locale = parseLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  const template = parseTemplate(cookieStore.get(TEMPLATE_COOKIE)?.value);
  const templateDef = templateById(template);

  return (
    <html
      lang={locale}
      data-template={templateDef.id}
      data-density={templateDef.density}
      data-surface={templateDef.surface}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full">
        <QueryProvider>
          <I18nProvider initialLocale={locale}>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <TemplateProvider initialTemplate={template}>
                <NuqsAdapter>{children}</NuqsAdapter>
                <Toaster richColors position="top-right" />
              </TemplateProvider>
            </ThemeProvider>
          </I18nProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
