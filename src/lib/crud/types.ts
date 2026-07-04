export type ID = string | number;

export type ListParams = {
  page: number;
  perPage: number;
  sort?: string;
  order?: "asc" | "desc";
  q?: string;
  filters?: Record<string, unknown>;
  scope?: Record<string, unknown>;
};

export type OptionParams = { q?: string; parent?: Record<string, ID> };

export type ListResult<T> = { rows: T[]; total: number; page: number; perPage: number };

export type Option = { value: ID; label: string };

/** Envelope list dari backend: { data, meta }. */
export type ListEnvelope<T> = { data: T[]; meta: { total: number; page: number; per_page: number } };

/** Envelope error opsional dari backend. */
export type ErrorEnvelope = { code?: number; status?: string; message?: string; data?: Record<string, string[]> | null };
