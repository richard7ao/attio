/**
 * Thin fetch wrapper.
 *
 * In dev, `VITE_API_BASE_URL` is unset -> requests use the relative `/api`
 * path, which the Vite dev-server proxy forwards to localhost:3001.
 *
 * In prod (Vercel), set `VITE_API_BASE_URL` to the absolute API origin
 * (e.g. a cloudflared tunnel URL) so the SPA calls the real backend.
 */
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}/api${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}
