export const PERMISSIONS = [
  'DASHBOARD_VIEW',
  'MONITORING_VIEW',
  'PLANTS_VIEW',
  'PLANTS_CREATE',
  'PLANTS_UPDATE',
  'PLANTS_DELETE',
  'INVERTERS_VIEW',
  'INVERTERS_CREATE',
  'INVERTERS_UPDATE',
  'INVERTERS_DELETE',
  'EQUIPMENT_VIEW',
  'EQUIPMENT_CREATE',
  'EQUIPMENT_UPDATE',
  'EQUIPMENT_DELETE',
  'ALERTS_VIEW',
  'ALERTS_RESOLVE',
  'CUSTOMERS_VIEW',
  'CUSTOMERS_CREATE',
  'CUSTOMERS_UPDATE',
  'CUSTOMERS_DELETE',
  'REPORTS_VIEW',
  'SETTINGS_VIEW',
  'USERS_VIEW',
  'USERS_CREATE',
  'USERS_UPDATE',
  'USERS_DELETE',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const PROFILE_CODES = ['ADMINISTRADOR', 'OPERADOR', 'COMERCIAL', 'TECNICO', 'POS_VENDA'] as const;
export type ProfileCode = (typeof PROFILE_CODES)[number];

const VIEW_OPERATIONS: Permission[] = [
  'DASHBOARD_VIEW',
  'MONITORING_VIEW',
  'PLANTS_VIEW',
  'INVERTERS_VIEW',
  'EQUIPMENT_VIEW',
  'ALERTS_VIEW',
  'ALERTS_RESOLVE',
  'CUSTOMERS_VIEW',
  'REPORTS_VIEW',
];

const ROLE_PERMISSIONS: Record<string, readonly Permission[]> = {
  ADMIN: PERMISSIONS,
  ADMINISTRADOR: PERMISSIONS,
  OPERATOR: VIEW_OPERATIONS,
  OPERADOR: VIEW_OPERATIONS,
  TECHNICIAN: ['MONITORING_VIEW', 'PLANTS_VIEW', 'INVERTERS_VIEW', 'EQUIPMENT_VIEW', 'ALERTS_VIEW', 'ALERTS_RESOLVE'],
  TECNICO: ['MONITORING_VIEW', 'PLANTS_VIEW', 'INVERTERS_VIEW', 'EQUIPMENT_VIEW', 'ALERTS_VIEW', 'ALERTS_RESOLVE'],
  COMMERCIAL: ['DASHBOARD_VIEW', 'CUSTOMERS_VIEW', 'CUSTOMERS_CREATE', 'CUSTOMERS_UPDATE', 'PLANTS_VIEW', 'REPORTS_VIEW'],
  COMERCIAL: ['DASHBOARD_VIEW', 'CUSTOMERS_VIEW', 'CUSTOMERS_CREATE', 'CUSTOMERS_UPDATE', 'PLANTS_VIEW', 'REPORTS_VIEW'],
  POS_VENDA: ['DASHBOARD_VIEW', 'CUSTOMERS_VIEW', 'PLANTS_VIEW', 'ALERTS_VIEW', 'REPORTS_VIEW'],
  CUSTOMER: ['DASHBOARD_VIEW', 'MONITORING_VIEW'],
};

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  ADMINISTRADOR: 'Administrador',
  OPERATOR: 'Operador',
  OPERADOR: 'Operador',
  TECHNICIAN: 'Técnico',
  TECNICO: 'Técnico',
  COMMERCIAL: 'Comercial',
  COMERCIAL: 'Comercial',
  POS_VENDA: 'Pós-venda',
  CUSTOMER: 'Cliente',
};

export function normalizeProfile(role: string): ProfileCode | string {
  const map: Record<string, ProfileCode> = {
    ADMIN: 'ADMINISTRADOR',
    ADMINISTRADOR: 'ADMINISTRADOR',
    OPERATOR: 'OPERADOR',
    OPERADOR: 'OPERADOR',
    TECHNICIAN: 'TECNICO',
    TECNICO: 'TECNICO',
    COMMERCIAL: 'COMERCIAL',
    COMERCIAL: 'COMERCIAL',
    POS_VENDA: 'POS_VENDA',
  };
  return map[role] ?? role;
}

export function getRoleLabel(role: string) {
  return ROLE_LABELS[role] ?? role;
}

export function getPermissionsForRole(role: string): Permission[] {
  return [...(ROLE_PERMISSIONS[role] ?? [])];
}

export function hasPermission(role: string, permission: Permission) {
  return getPermissionsForRole(role).includes(permission);
}

export function isAdministrator(role: string) {
  return role === 'ADMIN' || role === 'ADMINISTRADOR';
}
