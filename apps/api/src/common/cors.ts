/**
 * Resolve allowed browser origins for HTTP + Socket.IO CORS.
 * Mobile clients often send no Origin — those are allowed.
 *
 * Set CORS_ORIGIN to a comma-separated list, e.g.
 *   https://lms-nu-sepia.vercel.app,http://localhost:3000
 * Escape hatch: CORS_ORIGIN=* (not recommended in production).
 */
export function parseAllowedOrigins(): string[] | true {
  const raw = (process.env.CORS_ORIGIN ?? "").trim();
  if (raw === "*") return true;

  const fromEnv = raw
    .split(",")
    .map((s) => s.trim().replace(/\/$/, ""))
    .filter(Boolean);

  const extras = [
    process.env.APP_URL,
    process.env.API_URL,
    "https://lms-nu-sepia.vercel.app",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
  ]
    .map((s) => (s ?? "").trim().replace(/\/$/, ""))
    .filter(Boolean);

  return [...new Set([...fromEnv, ...extras])];
}

/** Vercel preview / production *.vercel.app admin hosts. */
export function isTrustedVercelOrigin(origin: string): boolean {
  try {
    const { protocol, hostname } = new URL(origin);
    if (protocol !== "https:") return false;
    return (
      hostname === "vercel.app" ||
      hostname.endsWith(".vercel.app")
    );
  } catch {
    return false;
  }
}

/** Nest / Express style origin callback. */
export function corsOriginDelegate(
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void
) {
  const allowed = parseAllowedOrigins();
  if (allowed === true) {
    callback(null, true);
    return;
  }
  // Native apps / same-origin / server-to-server: no Origin header.
  if (!origin) {
    callback(null, true);
    return;
  }
  if (allowed.includes(origin) || isTrustedVercelOrigin(origin)) {
    callback(null, true);
    return;
  }
  // Never throw — throwing becomes HTTP 500 and browsers show "Failed to fetch".
  callback(null, false);
}
