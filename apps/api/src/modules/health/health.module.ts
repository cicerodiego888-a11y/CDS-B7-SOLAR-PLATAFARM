import { Controller, Get, Module } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { IntegrationsModule } from '../integrations/integrations.module';
import { HealthService } from './health.service';

@Controller('health')
class HealthController {
  constructor(private readonly health: HealthService) {}

  @Public()
  @Get()
  getHealth() {
    return this.health.status();
  }
}

@Module({
  imports: [IntegrationsModule],
  controllers: [HealthController],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}
