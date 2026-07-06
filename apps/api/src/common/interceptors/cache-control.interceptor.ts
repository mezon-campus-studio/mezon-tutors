import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import type { Request, Response } from 'express';
import {
  PUBLIC_CACHE_KEY,
  PublicCacheOptions,
} from '../decorators/public-cache.decorator';

@Injectable()
export class CacheControlInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const httpCtx = context.switchToHttp();
    const req = httpCtx.getRequest<Request>();
    const res = httpCtx.getResponse<Response>();

    const options = this.reflector.getAllAndOverride<PublicCacheOptions | undefined>(
      PUBLIC_CACHE_KEY,
      [context.getHandler(), context.getClass()],
    );

    res.setHeader('Cache-Control', this.resolveHeader(req, options));

    return next.handle();
  }

  private resolveHeader(req: Request, options?: PublicCacheOptions): string {
    const isCacheableMethod = req.method === 'GET' || req.method === 'HEAD';
    if (!options || !isCacheableMethod) {
      return 'no-store';
    }

    const hasAuthorization = Boolean(req.headers?.authorization);
    if (options.anonymousOnly && hasAuthorization) {
      return 'no-store';
    }

    const parts = ['public', `max-age=${options.maxAge ?? 0}`];
    if (options.sMaxAge != null) {
      parts.push(`s-maxage=${options.sMaxAge}`);
    }
    if (options.staleWhileRevalidate != null) {
      parts.push(`stale-while-revalidate=${options.staleWhileRevalidate}`);
    }
    return parts.join(', ');
  }
}
