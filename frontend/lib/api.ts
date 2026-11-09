export const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface ApiError extends Error {
  fieldErrors?: Record<string, string>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong";
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof Error && "fieldErrors" in error;
}

export async function call<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(API + path, {
    ...init, cache: "no-store", headers: { "Content-Type": "application/json", ...(init.headers || {}) },
  });
  if (!res.ok) {
    let body: unknown;
    try { body = await res.json(); } catch {}
    const detail = isRecord(body) ? body.detail : undefined;
    const message = typeof detail === "string"
      ? detail
      : `Request failed (${res.status} ${res.statusText})`;
    const err = new Error(message) as ApiError;
    if (isRecord(detail) && isRecord(detail.errors)) {
      err.fieldErrors = Object.fromEntries(
        Object.entries(detail.errors).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
      );
    }
    throw err;
  }
  return res.status === 204 ? (undefined as T) : res.json();
}
export const send = (method: string, body?: unknown): RequestInit => ({
  method,
  body: body === undefined ? undefined : JSON.stringify(body),
});
