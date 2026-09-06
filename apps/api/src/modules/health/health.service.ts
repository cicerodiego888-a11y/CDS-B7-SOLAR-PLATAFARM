import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { createDefaultIntegrationEngine } from '../integrations/integration.engine';
import { RedisConnectionService } from '../integrations/queue/redis.connection';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisConnectionService,
  ) {}

  async status() {
    const database = await this.prisma.$queryRaw`SELECT 1`.then(() => 'ok' as const).catch(() => 'down' as const);
    const redis = (await this.redis.ping()) ? 'ok' as const : 'down' as const;
    const engine = createDefaultIntegrationEngine();
    const integrations = Object.fromEntries(
      engine.listProviders().map((code) => [code, engine.resolve(code)?.runtimeState().mode ?? 'blocked']),
    );
    return {
      status: database === 'ok' && redis === 'ok' ? 'ok' : 'degraded',
      service: 'b7-solar-api',
      api: 'ok',
      database,
      redis,
      integrations,
      timestamp: new Date().toISOString(),
    };
  }
}
