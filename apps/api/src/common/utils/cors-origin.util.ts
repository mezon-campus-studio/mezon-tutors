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
    if (!origin) {
      callback(null, true);
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
