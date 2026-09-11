import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { UserRole } from '@prisma/client';
import { Permissions } from './permissions.decorator';
import { MembershipsService } from './authorization.service';

const MEMBERSHIP_ROLES = [
  'INVESTIDOR',
  'CONSUMIDOR',
  'CUSTOMER',
  'OPERADOR',
  'OPERATOR',
  'COMERCIAL',
  'COMMERCIAL',
  'TECNICO',
  'TECHNICIAN',
  'POS_VENDA',
  'ADMINISTRADOR',
  'ADMIN',
] as const;

class CreateMembershipDto {
  @IsIn(MEMBERSHIP_ROLES)
  role!: UserRole;

  @IsOptional() @IsString()
  customerId?: string;

  @IsOptional() @IsString()
  plantId?: string;
}

class MembershipStatusDto {
  @IsIn(['ACTIVE', 'INACTIVE'])
  status!: 'ACTIVE' | 'INACTIVE';
}

@Controller('users')
export class MembershipsController {
  constructor(private readonly memberships: MembershipsService) {}

  @Permissions('USERS_MEMBERSHIPS_VIEW', 'USERS_VIEW')
  @Get(':userId/memberships')
  list(@Param('userId') userId: string) {
    return this.memberships.listByUser(userId);
  }

  @Permissions('USERS_MEMBERSHIPS_CREATE', 'USERS_UPDATE')
  @Post(':userId/memberships')
  create(@Param('userId') userId: string, @Body() dto: CreateMembershipDto) {
    return this.memberships.create(userId, dto);
  }

  @Permissions('USERS_MEMBERSHIPS_UPDATE', 'USERS_UPDATE')
  @Patch(':userId/memberships/:membershipId')
  updateStatus(
    @Param('userId') userId: string,
    @Param('membershipId') membershipId: string,
    @Body() dto: MembershipStatusDto,
  ) {
    return this.memberships.updateStatus(userId, membershipId, dto.status);
  }

  @Permissions('USERS_MEMBERSHIPS_DELETE', 'USERS_UPDATE')
  @Delete(':userId/memberships/:membershipId')
  deactivate(@Param('userId') userId: string, @Param('membershipId') membershipId: string) {
    return this.memberships.deactivate(userId, membershipId);
  }
}
