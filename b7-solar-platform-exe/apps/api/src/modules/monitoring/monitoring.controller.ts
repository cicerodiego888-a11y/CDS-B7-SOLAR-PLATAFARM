import { Controller, Get, Param } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';

@Controller('monitoring')
export class MonitoringController {
  constructor(private readonly service: MonitoringService) {}

  @Get('overview')
  overview() { return this.service.overview(); }

  @Get('plants/:id')
  plant(@Param('id') id: string) { return this.service.plant(id); }
}
