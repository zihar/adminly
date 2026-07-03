import createClient from "openapi-fetch";

import type { paths } from "@/lib/api/schema";

// Base URL client. Di browser pakai relatif "/api" (Route Handler lokal).
// Di server (RSC prefetch) fetch butuh URL absolut → fallback ke localhost.
// Set NEXT_PUBLIC_API_BASE_URL untuk mengarah ke backend sungguhan.
function resolveBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }
  if (typeof window !== "undefined") {
    return "/api";
  }
  return `http://localhost:${process.env.PORT ?? "3000"}/api`;
}

export const apiClient = createClient<paths>({ baseUrl: resolveBaseUrl() });
