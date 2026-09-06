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

export type JwtPayload = {
  sub: string;
  email: string;
  role: string;
};
