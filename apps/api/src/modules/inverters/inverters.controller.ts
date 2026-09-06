import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Permissions } from '../auth/permissions.decorator';
import { CreateInverterDto, StatusDto, UpdateInverterDto } from '../common/dto';
import { InvertersService } from './inverters.service';

@Controller('inverters')
export class InvertersController {
  constructor(private service: InvertersService) {}

  @Permissions('INVERTERS_VIEW')
  @Get()
  findAll(
    @Query('plantId') plantId?: string,
    @Query('manufacturerId') manufacturerId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findAll({ plantId, manufacturerId, status, search });
  }

  @Permissions('INVERTERS_VIEW')
  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Permissions('INVERTERS_CREATE')
  @Post()
  create(@Body() dto: CreateInverterDto) { return this.service.create(dto); }

  @Permissions('INVERTERS_UPDATE')
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: StatusDto) { return this.service.updateStatus(id, dto); }

  @Permissions('INVERTERS_UPDATE')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateInverterDto) { return this.service.update(id, dto); }
}
