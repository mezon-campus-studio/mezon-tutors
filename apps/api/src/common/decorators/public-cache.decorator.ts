import { SetMetadata } from '@nestjs/common';

export const PUBLIC_CACHE_KEY = 'public_cache_options';

export interface PublicCacheOptions {
  maxAge?: number;
  sMaxAge?: number;
  staleWhileRevalidate?: number;
  anonymousOnly?: boolean;
}

export const PublicCache = (options: PublicCacheOptions = {}) =>
  SetMetadata(PUBLIC_CACHE_KEY, options);
