import { TOKEN_COOKIE, PERMS_COOKIE, parsePermissions } from "@/config/rbac";

// Sesi F2 (client): token JWT + permissions disimpan di cookie (dibaca server
// via next/headers/proxy & client via document.cookie). Non-httpOnly karena
// apiClient client-side perlu token; enforcement asli tetap di backend.
function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
}

export function getToken(): string | null {
  return readCookie(TOKEN_COOKIE);
}

export function getSessionPermissions(): string[] {
  return parsePermissions(readCookie(PERMS_COOKIE));
}

export function setSession(token: string, permissions: string[]): void {
  const opts = "; path=/; max-age=28800; samesite=lax"; // 8 jam (selaras expiresIn JWT)
  document.cookie = `${TOKEN_COOKIE}=${encodeURIComponent(token)}${opts}`;
  document.cookie = `${PERMS_COOKIE}=${encodeURIComponent(JSON.stringify(permissions))}${opts}`;
}

export function clearSession(): void {
  document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0`;
  document.cookie = `${PERMS_COOKIE}=; path=/; max-age=0`;
}
