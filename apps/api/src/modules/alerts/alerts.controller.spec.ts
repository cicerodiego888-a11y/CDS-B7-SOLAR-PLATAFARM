import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { PERMISSIONS_KEY } from '../auth/permissions.decorator';

function contextOf(headers: Record<string, string>, user?: unknown) {
  const request = { headers, user };
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('Proteção dos endpoints de alertas', () => {
  const jwt = new JwtService({ secret: 'test-secret' });
  const reflector = { getAllAndOverride: jest.fn() };

  it('GET /alerts exige JWT (401)', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const guard = new JwtAuthGuard(jwt, reflector as unknown as Reflector);
    expect(() => guard.canActivate(contextOf({}))).toThrow(UnauthorizedException);
  });

  it('GET /alerts/:id exige ALERTS_VIEW (403 sem permissão)', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => (key === PERMISSIONS_KEY ? ['ALERTS_VIEW'] : undefined));
    const guard = new PermissionsGuard(reflector as unknown as Reflector);
    expect(() => guard.canActivate(contextOf({}, { role: 'COMERCIAL' }))).toThrow(ForbiddenException);
    expect(guard.canActivate(contextOf({}, { role: 'POS_VENDA' }))).toBe(true);
  });

  it('POST acknowledge e PATCH resolve exigem ALERTS_RESOLVE', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => (key === PERMISSIONS_KEY ? ['ALERTS_RESOLVE'] : undefined));
    const guard = new PermissionsGuard(reflector as unknown as Reflector);
    expect(() => guard.canActivate(contextOf({}, { role: 'POS_VENDA' }))).toThrow(ForbiddenException);
    expect(guard.canActivate(contextOf({}, { role: 'TECNICO' }))).toBe(true);
  });
});
