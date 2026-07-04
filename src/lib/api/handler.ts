// Sengaja TIDAK `import "server-only"` — modul ini harus tetap bisa di-unit-test
// lewat Vitest (yang jalan di Node, bukan React Server Component boundary).
import type { NextRequest } from "next/server";
import { ZodError, z } from "zod";

import { en } from "@/locales/en";

/** Bentuk error per-field, mis. hasil `z.flattenError(err).fieldErrors`. */
export type FieldErrors = Record<string, string[]>;

/** Key pesan error yang valid — diturunkan dari kamus `en.errors` (sumber tipe). */
export type ErrorKey = keyof typeof en.errors;

/** Amplop (envelope) respons error yang konsisten di semua Route Handler. */
export interface ErrorEnvelope {
  code: number;
  status: "error";
  message: string;
  data: FieldErrors | null;
}

/**
 * Error terkontrol untuk dilempar (`throw`) dari Route Handler.
 * `withErrorEnvelope` menangkapnya dan mengubahnya jadi `ErrorEnvelope`.
 */
export class ApiError extends Error {
  code: number;
  messageKey?: ErrorKey;
  override?: string;
  data: FieldErrors | null;

  constructor(
    code: number,
    options?: { messageKey?: ErrorKey; override?: string; data?: FieldErrors | null }
  ) {
    super(options?.override ?? options?.messageKey ?? `ApiError ${code}`);
    this.code = code;
    this.messageKey = options?.messageKey;
    this.override = options?.override;
    this.data = options?.data ?? null;
  }
}

/** 400 — permintaan tidak valid (di luar validasi Zod). */
export function badRequest(message?: string): ApiError {
  return new ApiError(400, message ? { override: message } : { messageKey: "badRequest" });
}

/** 401 — belum terautentikasi. */
export function unauthorized(message?: string): ApiError {
  return new ApiError(401, message ? { override: message } : { messageKey: "unauthorized" });
}

/** 403 — terautentikasi tapi tidak punya akses. */
export function forbidden(message?: string): ApiError {
  return new ApiError(403, message ? { override: message } : { messageKey: "forbidden" });
}

/** 404 — resource tidak ditemukan. */
export function notFound(message?: string): ApiError {
  return new ApiError(404, message ? { override: message } : { messageKey: "notFound" });
}

/** 422 — validasi gagal, membawa `fields` (per-field error messages). */
export function validationError(fields: FieldErrors, message?: string): ApiError {
  return new ApiError(422, {
    ...(message ? { override: message } : { messageKey: "validation" }),
    data: fields,
  });
}

/**
 * Kamus pesan error aktif. Dinamis (bergantung locale request) lewat
 * `getDictionary()`; fallback ke `en.errors` bila import gagal (mis. saat
 * dipanggil di luar konteks server, seperti unit test).
 */
async function errorDict(): Promise<typeof en.errors> {
  try {
    const { getDictionary } = await import("@/lib/get-dictionary");
    const dict = await getDictionary();
    return dict.errors;
  } catch {
    return en.errors;
  }
}

function envelope(code: number, message: string, data: FieldErrors | null): Response {
  const body: ErrorEnvelope = { code, status: "error", message, data };
  return Response.json(body, { status: code });
}

/** Tipe Route Handler yang dibungkus `withErrorEnvelope`. `ctx` opsional agar
 * route tanpa konteks (mis. koleksi `items`/`users`) tetap bisa dipanggil
 * dengan satu argumen — ini perbaikan untuk bug tsc "Expected 2 arguments". */
export type RouteHandler<C> = (req: NextRequest, ctx?: C) => Promise<Response> | Response;

/**
 * Bungkus Route Handler agar semua error yang di-`throw` (Zod, `ApiError`,
 * atau apa pun) dipetakan ke `ErrorEnvelope` yang konsisten. Respons sukses
 * diteruskan apa adanya (TIDAK dibungkus).
 */
export function withErrorEnvelope<C>(fn: RouteHandler<C>): RouteHandler<C> {
  return async (req: NextRequest, ctx?: C): Promise<Response> => {
    try {
      return await fn(req, ctx);
    } catch (err) {
      const dict = await errorDict();

      if (err instanceof ZodError) {
        return envelope(422, dict.validation, z.flattenError(err).fieldErrors);
      }

      if (err instanceof ApiError) {
        const message = err.override ?? (err.messageKey ? dict[err.messageKey] : err.message);
        return envelope(err.code, message, err.data);
      }

      // Error tak terduga — jangan pernah bocorkan detail/stack ke klien.
      console.error(err);
      return envelope(500, dict.internal, null);
    }
  };
}
