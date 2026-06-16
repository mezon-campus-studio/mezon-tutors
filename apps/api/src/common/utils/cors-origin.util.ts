function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/$/, '');
}

function expandWwwVariants(origin: string): string[] {
  try {
    const url = new URL(origin);
    const host = url.hostname;
    const variants = [origin];

    if (host.startsWith('www.')) {
      const withoutWww = `${url.protocol}//${host.slice(4)}${url.port ? `:${url.port}` : ''}`;
      variants.push(normalizeOrigin(withoutWww));
    } else if (!host.includes('localhost') && host.split('.').length >= 2) {
      const withWww = `${url.protocol}//www.${host}${url.port ? `:${url.port}` : ''}`;
      variants.push(normalizeOrigin(withWww));
    }

    return variants;
  } catch {
    return [origin];
  }
}

export function buildAllowedCorsOrigins(
  corsOrigins: string | undefined,
  frontendUrl: string
): string[] {
  const frontendOrigin = normalizeOrigin(frontendUrl);
  const frontendVariants = expandWwwVariants(frontendOrigin);
  const fromEnv =
    corsOrigins
      ?.split(',')
      .flatMap((o) => expandWwwVariants(normalizeOrigin(o)))
      .filter(Boolean) ?? [];

  if (fromEnv.length > 0) {
    return [...new Set([...fromEnv, ...frontendVariants])];
  }

  return [...new Set(frontendVariants)];
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
