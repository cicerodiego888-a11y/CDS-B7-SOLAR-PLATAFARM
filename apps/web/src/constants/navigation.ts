export const APP_NAME = 'B7 Solar';
export const APP_PRODUCT = 'B7 Solar Platform';

export const NAV_ITEMS = [
  { href: '/', label: 'Painel', permission: 'DASHBOARD_VIEW' },
  { href: '/monitoramento', label: 'Monitoramento', permission: 'MONITORING_VIEW' },
  { href: '/operacao', label: 'Operação', permission: 'MONITORING_VIEW' },
  { href: '/usinas', label: 'Usinas', permission: 'PLANTS_VIEW' },
  { href: '/equipamentos', label: 'Equipamentos', permission: 'EQUIPMENT_VIEW' },
  { href: '/inversores', label: 'Inversores', permission: 'INVERTERS_VIEW' },
  { href: '/alertas', label: 'Alertas', permission: 'ALERTS_VIEW' },
  { href: '/clientes', label: 'Clientes', permission: 'CUSTOMERS_VIEW' },
  { href: '/relatorios', label: 'Relatórios', permission: 'REPORTS_VIEW' },
  { href: '/configuracoes', label: 'Configurações', permission: 'SETTINGS_VIEW' },
] as const;
