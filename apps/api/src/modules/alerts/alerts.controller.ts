import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/auth.types';
import { Permissions } from '../auth/permissions.decorator';
import { AlertsService } from './alerts.service';

@Controller('alerts')
export class AlertsController {
  constructor(private readonly service: AlertsService) {}

  @Permissions('ALERTS_VIEW')
  @Get()
  list(
    @Query('status') status?: string,
    @Query('severity') severity?: string,
    @Query('plantId') plantId?: string,
    @Query('inverterId') inverterId?: string,
  ) {
    return this.service.list({ status, severity, plantId, inverterId });
  }

  @Permissions('ALERTS_VIEW')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Permissions('ALERTS_RESOLVE')
  @Post(':id/acknowledge')
  acknowledge(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.acknowledge(id, user.sub);
  }

  @Permissions('ALERTS_RESOLVE')
  @Patch(':id/resolve')
  resolve(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Body() _body?: unknown) {
    return this.service.resolve(id, user.sub);
  }
}
