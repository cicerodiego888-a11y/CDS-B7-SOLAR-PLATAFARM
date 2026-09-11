import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Permissions } from '../auth/permissions.decorator';
import { CreateDistributorDto, StatusDto, UpdateDistributorDto } from '../common/dto';
import { DistributorsService } from './distributors.service';

@Controller('distributors')
export class DistributorsController {
  constructor(private service: DistributorsService) {}

  @Permissions('DISTRIBUTORS_VIEW')
  @Get()
  findAll(
    @Query('name') name?: string,
    @Query('code') code?: string,
    @Query('status') status?: string,
  ) {
    return this.service.findAll({ name, code, status });
  }

  @Permissions('DISTRIBUTORS_VIEW')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Permissions('DISTRIBUTORS_CREATE')
  @Post()
  create(@Body() dto: CreateDistributorDto) {
    return this.service.create(dto);
  }

  @Permissions('DISTRIBUTORS_UPDATE')
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: StatusDto) {
    return this.service.updateStatus(id, dto);
  }

  @Permissions('DISTRIBUTORS_UPDATE')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDistributorDto) {
    return this.service.update(id, dto);
  }
}
