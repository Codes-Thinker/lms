/**
 * Resolve allowed browser origins for HTTP + Socket.IO CORS.
 * Mobile clients often send no Origin — those are allowed.
 *
 * Set CORS_ORIGIN to a comma-separated list, e.g.
 *   https://admin.example.com,http://localhost:3000
 * Escape hatch: CORS_ORIGIN=* (not recommended in production).
 */
export function parseAllowedOrigins(): string[] | true {
  const raw = (process.env.CORS_ORIGIN ?? "").trim();
  if (raw === "*") return true;

  const fromEnv = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const extras = [
    process.env.APP_URL,
    process.env.API_URL,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
  ]
    .map((s) => (s ?? "").trim().replace(/\/$/, ""))
    .filter(Boolean);

  return [...new Set([...fromEnv, ...extras])];
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
  if (allowed.includes(origin)) {
    callback(null, true);
    return;
  }
  callback(new Error(`CORS blocked for origin: ${origin}`), false);
}
