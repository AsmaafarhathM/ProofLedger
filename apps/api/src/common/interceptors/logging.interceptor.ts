import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>();
    const { method, url, ip } = req;
    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        const res = ctx.getResponse();
        const statusCode = res.statusCode;
        const delay = Date.now() - now;
        const user = (req as any).user ? (req as any).user.email || (req as any).user.id : 'anonymous';

        this.logger.log(
          `[${method}] ${url} - ${statusCode} (${delay}ms) [User: ${user}] [IP: ${ip}]`,
        );
      }),
    );
  }

  private sanitize(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;
    const copy = Array.isArray(obj) ? [...obj] : { ...obj };
    const sensitiveKeys = ['password', 'token', 'authorization', 'secret', 'file', 'content'];

    for (const key of Object.keys(copy)) {
      if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
        copy[key] = '[REDACTED]';
      } else if (typeof copy[key] === 'object') {
        copy[key] = this.sanitize(copy[key]);
      }
    }
    return copy;
  }
}
