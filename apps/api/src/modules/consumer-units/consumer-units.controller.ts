import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Permissions } from '../auth/permissions.decorator';
import { CreateConsumerUnitDto, StatusDto, UpdateConsumerUnitDto } from '../common/dto';
import { ConsumerUnitsService } from './consumer-units.service';

@Controller('consumer-units')
export class ConsumerUnitsController {
  constructor(private service: ConsumerUnitsService) {}

  @Permissions('CONSUMER_UNITS_VIEW')
  @Get()
  findAll(
    @Query('number') number?: string,
    @Query('distributorId') distributorId?: string,
    @Query('consumerId') consumerId?: string,
    @Query('status') status?: string,
  ) {
    return this.service.findAll({ number, distributorId, consumerId, status });
  }

  @Permissions('CONSUMER_UNITS_VIEW')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Permissions('CONSUMER_UNITS_CREATE')
  @Post()
  create(@Body() dto: CreateConsumerUnitDto) {
    return this.service.create(dto);
  }

  @Permissions('CONSUMER_UNITS_UPDATE')
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: StatusDto) {
    return this.service.updateStatus(id, dto);
  }

  @Permissions('CONSUMER_UNITS_UPDATE')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateConsumerUnitDto) {
    return this.service.update(id, dto);
  }
}
