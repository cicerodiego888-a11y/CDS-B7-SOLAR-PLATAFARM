import { Controller, Get } from '@nestjs/common';
import { Permissions } from '../auth/permissions.decorator';
import { ManufacturersService } from './manufacturers.service';

@Controller()
export class ManufacturersController {
  constructor(private readonly service: ManufacturersService) {}

  @Permissions('INVERTERS_VIEW', 'SETTINGS_VIEW')
  @Get('manufacturers')
  list() {
    return this.service.list();
  }

  @Permissions('SETTINGS_VIEW')
  @Get('integrations/engine')
  engine() {
    return this.service.engineOverview();
  }
}
