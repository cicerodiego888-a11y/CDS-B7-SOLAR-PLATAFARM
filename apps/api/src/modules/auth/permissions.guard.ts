import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtPayload } from './auth.types';
import { PERMISSIONS_KEY } from './permissions.decorator';
import { hasPermission, Permission } from './permissions.catalog';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const required = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;

    const user = context.switchToHttp().getRequest().user as JwtPayload | undefined;
    if (!user?.role || !required.some((permission) => hasPermission(user.role, permission))) {
      throw new ForbiddenException('Acesso negado');
    }
    return true;
  }
}
