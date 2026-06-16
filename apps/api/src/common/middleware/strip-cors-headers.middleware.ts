import type { NextFunction, Request, Response } from 'express';

const CORS_RESPONSE_HEADERS = new Set([
  'access-control-allow-origin',
  'access-control-allow-credentials',
  'access-control-allow-methods',
  'access-control-allow-headers',
  'access-control-expose-headers',
  'access-control-max-age',
]);

export function stripCorsResponseHeadersMiddleware(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  const originalSetHeader = res.setHeader.bind(res);
  res.setHeader = (name: string, value: number | string | readonly string[]) => {
    if (CORS_RESPONSE_HEADERS.has(name.toLowerCase())) {
      return res;
    }
    return originalSetHeader(name, value);
  };

  next();
}
