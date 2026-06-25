import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';

type ApiPayload<T> = {
  message?: string;
  data?: T;
  pagination?: Record<string, unknown>;
};

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  ApiPayload<T>,
  Record<string, unknown>
> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler<ApiPayload<T>>,
  ): Observable<Record<string, unknown>> {
    return next.handle().pipe(
      map((payload) => ({
        success: true,
        message: payload?.message ?? 'Request completed successfully',
        data: payload?.data ?? null,
        ...(payload?.pagination ? { pagination: payload.pagination } : {}),
      })),
    );
  }
}
