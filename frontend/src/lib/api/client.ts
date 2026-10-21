/**
 * Thin fetch wrapper for the Tirek API.
 * - Session cookie auth (HTTP-only), CSRF token echoed in X-CSRFToken on mutations.
 * - Idempotency-Key on every mutation so retries on bad mobile networks are safe.
 * The server is the only source of truth for permissions; the UI just mirrors them.
 */

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    public detail: unknown,
  ) {
    super(typeof detail === "string" ? detail : `API error ${status}`);
  }
}

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  return document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${name}=`))
    ?.split("=")[1];
}

async function ensureCsrf(): Promise<string | undefined> {
  let token = readCookie("csrftoken");
  if (!token) {
    await fetch(`${API_BASE}/v1/auth/csrf/`, { credentials: "include" });
    token = readCookie("csrftoken");
  }
  return token;
}

type Options = Omit<RequestInit, "body"> & { body?: unknown; idempotencyKey?: string };

export async function api<T>(path: string, opts: Options = {}): Promise<T> {
  const method = (opts.method ?? "GET").toUpperCase();
  const headers = new Headers(opts.headers);
  const isForm = opts.body instanceof FormData;

  if (opts.body !== undefined && !isForm) headers.set("Content-Type", "application/json");
  if (method !== "GET" && method !== "HEAD") {
    const csrf = await ensureCsrf();
    if (csrf) headers.set("X-CSRFToken", csrf);
    headers.set("Idempotency-Key", opts.idempotencyKey ?? crypto.randomUUID());
  }

  const url = `${API_BASE}/v1/${path.replace(/^\//, "")}`;
  const res = await fetch(url, {
    ...opts,
    method,
    headers,
    credentials: "include",
    body: isForm ? (opts.body as FormData) : opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = data?.error ?? {};
    throw new ApiError(res.status, err.code ?? "error", err.detail ?? err.message ?? data);
  }
  return data as T;
}

export type Paginated<T> = { count: number; next: string | null; previous: string | null; results: T[] };
