import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Permissions } from '../auth/permissions.decorator';
import { CreateConsumerDto, StatusDto, UpdateConsumerDto } from '../common/dto';
import { ConsumersService } from './consumers.service';

@Controller('consumers')
export class ConsumersController {
  constructor(private service: ConsumersService) {}

  @Permissions('CONSUMERS_VIEW')
  @Get()
  findAll(
    @Query('name') name?: string,
    @Query('document') document?: string,
    @Query('status') status?: string,
  ) {
    return this.service.findAll({ name, document, status });
  }

  @Permissions('CONSUMERS_VIEW')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Permissions('CONSUMERS_CREATE')
  @Post()
  create(@Body() dto: CreateConsumerDto) {
    return this.service.create(dto);
  }

  @Permissions('CONSUMERS_UPDATE')
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: StatusDto) {
    return this.service.updateStatus(id, dto);
  }

  @Permissions('CONSUMERS_UPDATE')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateConsumerDto) {
    return this.service.update(id, dto);
  }
}
