import { CanActivate, ExecutionContext, HttpException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { RedisConnectionService } from '../integrations/queue/redis.connection';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private readonly redis: RedisConnectionService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{ method: string; originalUrl?: string; ip?: string }>();
    const route = request.originalUrl?.split('?')[0] ?? '';
    const target = this.target(route, request.method);
    if (!target) return true;
    if (!this.redis.isReady()) {
      if (process.env.NODE_ENV === 'production') throw new ServiceUnavailableException('Rate limiting indisponível.');
      return true;
    }
    const identity = request.ip || 'unknown';
    const result = await this.redis.consumeRateLimit(`rate-limit:${target.name}:${identity}`, target.limit, target.windowMs);
    if (!result) throw new ServiceUnavailableException('Rate limiting indisponível.');
    if (!result.allowed) throw new HttpException('Muitas tentativas. Aguarde antes de tentar novamente.', 429);
    return true;
  }

  private target(route: string, method: string) {
    if (method === 'POST' && route.endsWith('/auth/login')) return { name: 'login', limit: this.envNumber('RATE_LIMIT_LOGIN_MAX', 10), windowMs: this.envNumber('RATE_LIMIT_LOGIN_WINDOW_MS', 60_000) };
    if ((method === 'POST' && /\/alerts\/[^/]+\/acknowledge$/.test(route)) || (method === 'PATCH' && /\/alerts\/[^/]+\/resolve$/.test(route))) {
      return { name: 'alert-action', limit: this.envNumber('RATE_LIMIT_ALERT_MAX', 60), windowMs: this.envNumber('RATE_LIMIT_ALERT_WINDOW_MS', 60_000) };
    }
    if (method === 'POST' && /\/integrations\/collect\/[^/]+$/.test(route)) return { name: 'collection', limit: this.envNumber('RATE_LIMIT_COLLECTION_MAX', 30), windowMs: this.envNumber('RATE_LIMIT_COLLECTION_WINDOW_MS', 60_000) };
    return null;
  }

  private envNumber(name: string, fallback: number) {
    const value = Number(process.env[name]);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }
}