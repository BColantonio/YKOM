/**
 * Supabase sometimes returns non-Error shapes (e.g. fetch Response metadata) where `.message` is missing.
 */
export function formatAuthError(err: unknown): string {
  if (err == null) return 'Unknown error';
  if (typeof err === 'string') return err;
  if (typeof err === 'object' && err !== null) {
    const o = err as Record<string, unknown>;
    if (typeof o.message === 'string' && o.message.length > 0) return o.message;
    if (typeof o.msg === 'string' && o.msg.length > 0) return o.msg;
    if (typeof o.status === 'number') {
      if (o.status === 503) {
        return 'HTTP 503 — Supabase Auth is temporarily unavailable. Wait a minute and try again, or check status.supabase.com.';
      }
      if (o.status === 429) return 'HTTP 429 — Too many requests. Try again shortly.';
      if (o.status >= 500) return `HTTP ${o.status} — server error. Try again later.`;
      return `HTTP ${o.status}`;
    }
  }
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}
