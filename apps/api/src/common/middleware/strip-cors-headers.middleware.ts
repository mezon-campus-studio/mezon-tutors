import type { NextFunction, Request, Response } from 'express';

const CORS_RESPONSE_HEADERS = new Set([
  'access-control-allow-origin',
  'access-control-allow-credentials',
  'access-control-allow-methods',
  'access-control-allow-headers',
  'access-control-expose-headers',
  'access-control-max-age',
]);

function isCorsHeader(name: string): boolean {
  return CORS_RESPONSE_HEADERS.has(name.toLowerCase());
}

export function stripCorsResponseHeadersMiddleware(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  const originalSetHeader = res.setHeader.bind(res);
  res.setHeader = (name: string, value: number | string | readonly string[]) => {
    if (isCorsHeader(name)) {
      return res;
    }
    return originalSetHeader(name, value);
  };

  next();
}
