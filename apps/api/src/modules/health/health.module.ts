import { Controller, Get, Module, ServiceUnavailableException } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { IntegrationsModule } from '../integrations/integrations.module';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Public()
  @Get()
  getHealth() {
    return this.health.status();
  }

  @Public()
  @Get('live')
  live() {
    return { status: 'ok', service: 'b7-solar-api', timestamp: new Date().toISOString() };
  }

  @Public()
  @Get('ready')
  async ready() {
    const health = await this.health.status();
    if (health.database !== 'ok' || health.redis !== 'ok') {
      throw new ServiceUnavailableException({
        status: 'not_ready',
        database: health.database,
        redis: health.redis,
      });
    }
    return { ...health, status: 'ready' };
  }
}

@Module({
  imports: [IntegrationsModule],
  controllers: [HealthController],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}
