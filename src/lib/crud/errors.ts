import type { ListParams, ErrorEnvelope } from "@/lib/crud/types";

export class CrudError extends Error {
  httpStatus: number;
  fieldErrors?: Record<string, string[]>;
  constructor(httpStatus: number, message: string, fieldErrors?: Record<string, string[]>) {
    super(message);
    this.name = "CrudError";
    this.httpStatus = httpStatus;
    this.fieldErrors = fieldErrors;
  }
}

const GENERIC = "Terjadi kesalahan pada server. Coba lagi.";

/** Normalkan error backend/HTTP → CrudError; tak pernah bocorkan detail server pada 5xx. */
export function normalizeError(httpStatus: number, body: unknown): CrudError {
  const env = (body ?? {}) as ErrorEnvelope;
  if (httpStatus === 422) {
    return new CrudError(422, env.message || "Validasi gagal", env.data ?? undefined);
  }
  if (httpStatus >= 500) {
    return new CrudError(httpStatus, GENERIC);
  }
  return new CrudError(httpStatus, env.message || GENERIC);
}

/** Susun querystring list dari ListParams (skip nilai kosong/undefined/null). */
export function buildListSearchParams(params: ListParams): URLSearchParams {
  const sp = new URLSearchParams();
  const put = (k: string, v: unknown) => {
    if (v === undefined || v === null || v === "") return;
    sp.set(k, String(v));
  };
  put("page", params.page);
  put("per_page", params.perPage);
  put("sort", params.sort);
  put("order", params.order);
  put("q", params.q);
  for (const [k, v] of Object.entries(params.filters ?? {})) put(`filter[${k}]`, v);
  for (const [k, v] of Object.entries(params.scope ?? {})) put(`scope[${k}]`, v);
  return sp;
}
