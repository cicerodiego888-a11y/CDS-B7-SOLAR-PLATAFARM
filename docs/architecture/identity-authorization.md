# Identity & Authorization V2

Fundação de identidade e autorização da **B7 Solar Plataforma de Gestão**.

Implementado na Sprint 18. Não descreve portais, UC, faturamento ou Gestão de Energia.

## Princípio

```
Role  ≠  Scope

Role  → o que o usuário pode fazer (permissions)
Scope → em quais dados pode fazer (memberships + legado)
```

## Modelo

```
User
│
├── role (JWT / PermissionsGuard)     ← papel primário
├── customerId (legado, opcional)     ← compatibilidade CUSTOMER
│
└── Membership[] (UserMembership)
      │
      ├── role
      ├── customer scope (customerId opcional)
      ├── plant scope (plantId opcional)
      ├── scopeKey (unicidade)
      └── status (ACTIVE | INACTIVE)
```

## Roles

Existentes (preservados, inclusive aliases):

- ADMIN / ADMINISTRADOR
- OPERATOR / OPERADOR
- TECHNICIAN / TECNICO
- COMMERCIAL / COMERCIAL
- POS_VENDA
- CUSTOMER

Novos (apenas identidade/autorização — sem portal):

- INVESTIDOR
- CONSUMIDOR

## UserMembership

- Um usuário pode ter vários vínculos.
- Cada vínculo exige `customerId` e/ou `plantId`.
- Unicidade: `(userId, role, scopeKey)` onde `scopeKey = c:{customerId|-}\|p:{plantId|-}`.
- Soft-delete via `status = INACTIVE` (DELETE HTTP também inativa).
- Gestão administrativa: apenas permissões `USERS_MEMBERSHIPS_*` / `USERS_*` (admin).

## JWT

Inalterado e pequeno:

- `sub`, `email`, `role`
- Sem lista de plants/UCs/memberships no token
- Escopo resolvido server-side em `AuthorizationService`

## AuthorizationService

Resolve `AccessScope`:

- Staff interno → `unrestricted: true` (comportamento legado)
- CUSTOMER → `User.customerId` como grant customer-wide
- INVESTIDOR / CONSUMIDOR → memberships ACTIVE (+ legado se houver)

Regras de plant:

- grant `plantId` → só aquela usina
- grant `customerId` (sem plant) → todas as usinas do customer
- membership INACTIVE → não entra no escopo

## MonitoringAccessService

Delega a `AuthorizationService`.

Listagens de monitoramento/operação usam `buildPlantWhere`.

## Endpoints

```
GET    /api/users/:userId/memberships
POST   /api/users/:userId/memberships
PATCH  /api/users/:userId/memberships/:membershipId
DELETE /api/users/:userId/memberships/:membershipId   (soft = INACTIVE)
```

## Limitações atuais

- Sem entidade Consumer / Investor de negócio
- Sem UC / Organization formal
- Sem Portal Investidor / Consumidor
- `User.customerId` permanece por compatibilidade
- Sem backfill automático de memberships para usuários existentes
