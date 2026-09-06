import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { extractBearer, JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';
import { IS_PUBLIC_KEY } from './public.decorator';
import { PERMISSIONS_KEY } from './permissions.decorator';

function contextOf(headers: Record<string, string>, user?: unknown) {
  const request = { headers, user };
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('Guards de autenticação e autorização', () => {
  const jwt = new JwtService({ secret: 'test-secret' });
  const reflector = {
    getAllAndOverride: jest.fn(),
  };

  it('libera rota pública sem token', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => key === IS_PUBLIC_KEY);
    const guard = new JwtAuthGuard(jwt, reflector as unknown as Reflector);
    expect(guard.canActivate(contextOf({}))).toBe(true);
  });

  it('bloqueia rota protegida sem token', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const guard = new JwtAuthGuard(jwt, reflector as unknown as Reflector);
    expect(() => guard.canActivate(contextOf({}))).toThrow(UnauthorizedException);
  });

  it('aceita token válido', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const token = await jwt.signAsync({ sub: 'user-1', email: 'admin@b7solar.local', role: 'ADMIN' });
    const guard = new JwtAuthGuard(jwt, reflector as unknown as Reflector);
    expect(guard.canActivate(contextOf({ authorization: `Bearer ${token}` }))).toBe(true);
    expect(extractBearer(`Bearer ${token}`)).toBe(token);
  });

  it('nega permissão ao operador em recurso de usuários', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => (key === PERMISSIONS_KEY ? ['USERS_DELETE'] : undefined));
    const guard = new PermissionsGuard(reflector as unknown as Reflector);
    expect(() => guard.canActivate(contextOf({}, { role: 'OPERADOR' }))).toThrow(ForbiddenException);
  });

  it('permite administrador com qualquer permissão', () => {
    reflector.getAllAndOverride.mockImplementation((key: string) => (key === PERMISSIONS_KEY ? ['USERS_DELETE'] : undefined));
    const guard = new PermissionsGuard(reflector as unknown as Reflector);
    expect(guard.canActivate(contextOf({}, { role: 'ADMIN' }))).toBe(true);
    expect(guard.canActivate(contextOf({}, { role: 'ADMINISTRADOR' }))).toBe(true);
  });
});
