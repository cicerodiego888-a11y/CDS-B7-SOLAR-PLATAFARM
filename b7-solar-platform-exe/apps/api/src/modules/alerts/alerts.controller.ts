import { Controller, Get, Param, Patch } from '@nestjs/common';
import { AlertsService } from './alerts.service';

@Controller('alerts')
export class AlertsController {
  constructor(private readonly service: AlertsService) {}

  @Get()
  list() { return this.service.list(); }

  @Patch(':id/resolve')
  resolve(@Param('id') id: string) { return this.service.resolve(id); }
}
