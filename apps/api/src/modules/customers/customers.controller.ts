import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Permissions } from '../auth/permissions.decorator';
import { CreateCustomerDto, StatusDto, UpdateCustomerDto } from '../common/dto';
import { CustomersService } from './customers.service';

@Controller('customers')
export class CustomersController {
  constructor(private service: CustomersService) {}

  @Permissions('CUSTOMERS_VIEW')
  @Get()
  findAll() { return this.service.findAll(); }

  @Permissions('CUSTOMERS_VIEW')
  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Permissions('CUSTOMERS_CREATE')
  @Post()
  create(@Body() dto: CreateCustomerDto) { return this.service.create(dto); }

  @Permissions('CUSTOMERS_UPDATE')
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: StatusDto) { return this.service.updateStatus(id, dto); }

  @Permissions('CUSTOMERS_UPDATE')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) { return this.service.update(id, dto); }
}
