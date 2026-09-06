import { getPermissionsForRole, getRoleLabel, hasPermission, normalizeProfile } from './permissions.catalog';

describe('Catálogo de perfis e permissões', () => {
  it('normaliza perfis legado e novos', () => {
    expect(normalizeProfile('ADMIN')).toBe('ADMINISTRADOR');
    expect(normalizeProfile('OPERATOR')).toBe('OPERADOR');
    expect(getRoleLabel('POS_VENDA')).toBe('Pós-venda');
    expect(getRoleLabel('TECNICO')).toBe('Técnico');
  });

  it('concede acesso completo ao administrador', () => {
    expect(hasPermission('ADMIN', 'USERS_DELETE')).toBe(true);
    expect(hasPermission('ADMINISTRADOR', 'PLANTS_CREATE')).toBe(true);
  });

  it('restringe operador sem gestão de usuários', () => {
    expect(hasPermission('OPERADOR', 'DASHBOARD_VIEW')).toBe(true);
    expect(hasPermission('OPERADOR', 'USERS_DELETE')).toBe(false);
    expect(getPermissionsForRole('COMERCIAL')).toContain('CUSTOMERS_VIEW');
  });
});
