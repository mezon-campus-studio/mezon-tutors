function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/$/, '');
}

export function buildAllowedCorsOrigins(
  corsOrigins: string | undefined,
  frontendUrl: string
): string[] {
  const frontendOrigin = normalizeOrigin(frontendUrl);
  const fromEnv =
    corsOrigins
      ?.split(',')
      .map((o) => normalizeOrigin(o))
      .filter(Boolean) ?? [];

  if (fromEnv.length > 0) {
    return [...new Set([...fromEnv, frontendOrigin])];
  }

  return [frontendOrigin];
}

export function createCorsOriginDelegate(allowedOrigins: string[]) {
  const allowed = new Set(allowedOrigins);

  return (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean | string) => void
  ) => {
    // No Origin header (server-to-server). Do not reflect "*" — that breaks credentialed browser requests.
    if (!origin) {
      callback(null, false);
      return;
    }

    const normalized = normalizeOrigin(origin);
    if (allowed.has(normalized)) {
      callback(null, origin);
      return;
    }

    callback(null, false);
  };
}
