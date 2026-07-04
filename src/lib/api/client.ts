import createClient from "openapi-fetch";

import { getAuthToken } from "@/lib/api/auth";
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

// Middleware auth (seam D7): sisipkan header Authorization bila ada token,
// dan redirect ke /login saat 401 — hanya di browser, aman untuk SSR/prefetch.
apiClient.use({
  async onRequest({ request }) {
    const token = await getAuthToken();
    if (token) request.headers.set("Authorization", `Bearer ${token}`);
    return request;
  },
  onResponse({ response }) {
    if (response.status === 401 && typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return response;
  },
});
