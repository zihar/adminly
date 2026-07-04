/**
 * Konfigurasi "global scope" generik (pure — aman di server/client/proxy).
 * Fork mengisi `scopeDimensions` sesuai domainnya (mis. Edelweiss: tahun
 * ajaran/semester/term/unit). adminly kirim contoh generik `workspace`.
 */
export type ScopeDimension = {
  key: string;
  labelKey: string;                 // kunci i18n untuk label picker
  optionsFrom?: string;             // resource sumber opsi (via useOptions)
  options?: { value: string; label: string }[]; // opsi statis
};

export const scopeDimensions: ScopeDimension[] = [
  {
    key: "workspace",
    labelKey: "scope.workspace",
    options: [
      { value: "w1", label: "Workspace 1" },
      { value: "w2", label: "Workspace 2" },
    ],
  },
];

export const SCOPE_COOKIE = "adminly_scope";

/** Validasi cookie scope → map key→value aman (hanya key dimensi dikenal). */
export function parseScope(
  value: string | undefined | null,
): Record<string, string> {
  if (!value) return {};
  let raw: unknown;
  try {
    raw = JSON.parse(value);
  } catch {
    return {};
  }
  if (!raw || typeof raw !== "object") return {};
  const known = new Set(scopeDimensions.map((d) => d.key));
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (known.has(k) && v !== undefined && v !== null && v !== "") {
      out[k] = String(v);
    }
  }
  return out;
}
