import { Permission } from './permissions.catalog';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  profile: string;
  profileLabel: string;
  permissions: Permission[];
};

/** Payload JWT — permanece pequeno (sem plants/UCs/memberships). */
export type JwtPayload = {
  sub: string;
  email: string;
  role: string;
};

/**
 * Escopo de dados resolvido server-side.
 * Role (JWT) ≠ Scope (memberships + legado).
 */
export type AccessScope = {
  userId: string;
  primaryRole: string;
  /** Staff interno: sem filtro de tenant (comportamento legado). */
  unrestricted: boolean;
  /** Customers conhecidos (legado + memberships + derivados de plant). */
  customerIds: string[];
  /** Grants que cobrem todas as usinas do customer (legado ou membership sem plantId). */
  customerWideIds: string[];
  /** Grants explícitos de usina. */
  plantIds: string[];
};
