export const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function call<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(API + path, {
    ...init, cache: "no-store", headers: { "Content-Type": "application/json", ...(init.headers || {}) },
  });
  if (!res.ok) {
    let body: any = {};
    try { body = await res.json(); } catch {}
    const err: any = new Error(typeof body.detail === "string" ? body.detail : "Something went wrong");
    if (body.detail && body.detail.errors) err.fieldErrors = body.detail.errors;
    throw err;
  }
  return res.status === 204 ? (undefined as T) : res.json();
}
export const send = (method: string, body?: any): RequestInit => ({ method, body: body ? JSON.stringify(body) : undefined });
