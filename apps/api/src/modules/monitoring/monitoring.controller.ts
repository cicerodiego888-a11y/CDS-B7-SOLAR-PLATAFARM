import { Controller, Get, Param, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/auth.types';
import { Permissions } from '../auth/permissions.decorator';
import { DashboardPeriod } from './monitoring.aggregation';
import { MonitoringAvailabilityService } from './monitoring.availability.service';
import { MonitoringHistoryService } from './monitoring.history.service';
import { MonitoringService } from './monitoring.service';
import { MonitoringDiagnosisService } from './monitoring-diagnosis.service';

const DASHBOARD_PERIODS: DashboardPeriod[] = ['today', 'yesterday', 'last7days', 'last30days', 'thisMonth', 'previousMonth'];

@Controller('monitoring')
export class MonitoringController {
  constructor(
    private readonly service: MonitoringService,
    private readonly history: MonitoringHistoryService,
    private readonly availability: MonitoringAvailabilityService,
    private readonly diagnosis: MonitoringDiagnosisService,
  ) {}

  @Permissions('MONITORING_VIEW')
  @Get('diagnostics/overview')
  diagnosisOverview(
    @CurrentUser() user: JwtPayload,
    @Query('severity') severity?: string,
    @Query('code') code?: string,
    @Query('customerId') customerId?: string,
    @Query('plantId') plantId?: string,
    @Query('manufacturerId') manufacturerId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.diagnosis.overview(user, { severity, code, customerId, plantId, manufacturerId, search, page, pageSize });
  }

  @Permissions('MONITORING_VIEW')
  @Get('diagnostics/inverters/:inverterId')
  inverterDiagnosis(@Param('inverterId') inverterId: string, @CurrentUser() user: JwtPayload) {
    return this.diagnosis.inverter(inverterId, user);
  }

  @Permissions('MONITORING_VIEW')
  @Get('diagnostics/plants/:plantId')
  plantDiagnosis(@Param('plantId') plantId: string, @CurrentUser() user: JwtPayload) {
    return this.diagnosis.plant(plantId, user);
  }

  @Permissions('MONITORING_VIEW', 'DASHBOARD_VIEW')
  @Get('overview')
  overview(@Query('period') period: string | undefined, @CurrentUser() user: JwtPayload) {
    const selected = DASHBOARD_PERIODS.includes(period as DashboardPeriod) ? period as DashboardPeriod : 'today';
    return this.service.overview(selected, user);
  }

  @Permissions('MONITORING_VIEW')
  @Get('history')
  historyList(
    @CurrentUser() user: JwtPayload,
    @Query('plantId') plantId?: string,
    @Query('inverterId') inverterId?: string,
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('granularity') granularity?: string,
  ) {
    return this.history.history({ plantId, inverterId, period, startDate, endDate, granularity }, user);
  }

  @Permissions('MONITORING_VIEW')
  @Get('plants/:plantId/history')
  plantHistory(
    @Param('plantId') plantId: string,
    @CurrentUser() user: JwtPayload,
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('granularity') granularity?: string,
  ) {
    return this.service.plant(plantId, user, { period, startDate, endDate, granularity });
  }

  @Permissions('MONITORING_VIEW')
  @Get('inverters/:inverterId/history')
  inverterHistory(
    @Param('inverterId') inverterId: string,
    @CurrentUser() user: JwtPayload,
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('granularity') granularity?: string,
  ) {
    return this.service.inverter(inverterId, user, { period, startDate, endDate, granularity });
  }

  @Permissions('MONITORING_VIEW')
  @Get('plants/:id')
  plant(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.plant(id, user, { period: 'today' });
  }

  @Permissions('MONITORING_VIEW')
  @Get('availability')
  availabilityList(
    @CurrentUser() user: JwtPayload,
    @Query('plantId') plantId?: string,
    @Query('inverterId') inverterId?: string,
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.availability.query({ plantId, inverterId, period, startDate, endDate }, user);
  }

  @Permissions('MONITORING_VIEW')
  @Get('inverters/:inverterId/availability')
  inverterAvailability(
    @Param('inverterId') inverterId: string,
    @CurrentUser() user: JwtPayload,
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.availability.forInverter(inverterId, { period, startDate, endDate }, user);
  }

  @Permissions('MONITORING_VIEW')
  @Get('plants/:plantId/availability')
  plantAvailability(
    @Param('plantId') plantId: string,
    @CurrentUser() user: JwtPayload,
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.availability.forPlant(plantId, { period, startDate, endDate }, user);
  }
}
