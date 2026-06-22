import Link from "next/link";

import { siteConfig } from "@/config/site";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="flex flex-col items-center justify-between gap-2 border-t px-4 py-4 text-sm text-muted-foreground sm:flex-row md:px-6">
      <p>
        © {year} {siteConfig.name}. Semua hak dilindungi.
      </p>
      <Link
        href="https://github.com/zihar/adminly"
        target="_blank"
        rel="noreferrer"
        className="underline-offset-4 hover:text-foreground hover:underline"
      >
        GitHub
      </Link>
    </footer>
  );
}
