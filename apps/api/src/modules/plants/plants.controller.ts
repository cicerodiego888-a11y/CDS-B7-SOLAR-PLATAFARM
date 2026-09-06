import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Permissions } from '../auth/permissions.decorator';
import { CreatePlantDto, PlantStatusDto, UpdatePlantDto } from '../common/dto';
import { PlantsService } from './plants.service';

@Controller('plants')
export class PlantsController {
  constructor(private service: PlantsService) {}

  @Permissions('PLANTS_VIEW')
  @Get()
  findAll() { return this.service.findAll(); }

  @Permissions('PLANTS_VIEW')
  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Permissions('PLANTS_CREATE')
  @Post()
  create(@Body() dto: CreatePlantDto) { return this.service.create(dto); }

  @Permissions('PLANTS_UPDATE')
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: PlantStatusDto) { return this.service.updateStatus(id, dto); }

  @Permissions('PLANTS_UPDATE')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePlantDto) { return this.service.update(id, dto); }
}
