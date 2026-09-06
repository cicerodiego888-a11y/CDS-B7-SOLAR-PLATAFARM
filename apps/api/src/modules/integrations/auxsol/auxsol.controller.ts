import { Controller, Param, Post } from '@nestjs/common';
import { Permissions } from '../../auth/permissions.decorator';
import { AuxsolIntegrationService } from './auxsol.service';

@Controller('integrations/auxsol')
export class AuxsolController {
  constructor(private readonly service: AuxsolIntegrationService) {}

  @Permissions('SETTINGS_VIEW')
  @Post('test')
  test() {
    return this.service.testConnection();
  }

  @Permissions('SETTINGS_VIEW')
  @Post('sync/:inverterId')
  sync(@Param('inverterId') inverterId: string) {
    return this.service.syncInverter(inverterId);
  }
}
