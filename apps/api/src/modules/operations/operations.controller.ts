import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/auth.types';
import { Permissions } from '../auth/permissions.decorator';
import { OperationsService } from './operations.service';

@Controller('operations')
export class OperationsController {
  constructor(private readonly service: OperationsService) {}

  @Permissions('MONITORING_VIEW')
  @Get('overview')
  overview(
    @CurrentUser() user: JwtPayload,
    @Query('period') period?: string,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
    @Query('search') search?: string,
  ) {
    return this.service.overview(user, { period, status, customerId, search });
  }
}
