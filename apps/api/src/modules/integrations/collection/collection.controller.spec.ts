import { Reflector } from '@nestjs/core';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/permissions.guard';
import { PERMISSIONS_KEY } from '../../auth/permissions.decorator';
import { JwtService } from '@nestjs/jwt';

function contextOf(headers: Record<string, string>, user?: unknown) {
  const request = { headers, user };
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('Proteção do endpoint de coleta', () => {
  const jwt = new JwtService({ secret: 'test-secret' });
  const reflector = { getAllAndOverride: jest.fn() };

  it('exige JWT', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const guard = new JwtAuthGuard(jwt, reflector as unknown as Reflector);
    expect(() => guard.canActivate(contextOf({}))).toThrow(UnauthorizedException);
  });

  it('exige SETTINGS_VIEW', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => (key === PERMISSIONS_KEY ? ['SETTINGS_VIEW'] : undefined));
    const guard = new PermissionsGuard(reflector as unknown as Reflector);
    expect(() => guard.canActivate(contextOf({}, { role: 'OPERADOR' }))).toThrow(ForbiddenException);
    expect(guard.canActivate(contextOf({}, { role: 'ADMIN' }))).toBe(true);
  });
});
