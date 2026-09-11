# Baseline técnico V2 — B7 Solar Plataforma de Gestão

Documento gerado na Sprint 17 (higienização + baseline).
Registra o estado **real** do código na árvore raiz. Não descreve domínios futuros como implementados.

## IDENTIDADE

Nome: **B7 Solar Plataforma de Gestão**

Versão de baseline: **V2 (fundação O&M / Monitoramento)**

## FONTE DE VERDADE

Árvore **raiz** do repositório Git:

`C:/Users/cicer/Desktop/B7 Solar/B7-Solar-Platform-exe`

- `b7-solar-platform-exe/` — cópia/snapshot antigo. **NÃO É FONTE DE VERDADE; manter fora do fluxo de desenvolvimento.**
- `B7-SOLAR.zip` — artefato de transporte/arquivo. Não é fonte de desenvolvimento.

O `eslint.config.mjs` raiz já ignora `b7-solar-platform-exe/**`.

## APPS

| App | Path | Estado |
|-----|------|--------|
| API | `apps/api` | NestJS implementado |
| Web | `apps/web` | Next.js implementado |
| Mobile | `apps/mobile` | Expo **scaffold only** (sem telas/código de app) |

## PACKAGES

| Package | Path | Estado |
|---------|------|--------|
| `@b7/types` | `packages/types` | Código presente; **ainda não wired** nos apps |
| `@b7/ui` | `packages/ui` | Tokens mínimos; **ainda não wired** |
| `@b7/config` | `packages/config` | Constantes mínimas; **ainda não wired** |
| `@b7/integrations` | `packages/integrations` | Engine/planned adapters; **ainda não wired** (API tem cópia própria) |

Wiring de packages fica para sprint posterior. Não migrar imports nesta baseline.

## BACKEND

NestJS + Prisma + PostgreSQL + Redis + BullMQ.

Módulos Nest **reais** (código TypeScript ativo): Auth, Health, Customers, Plants, Inverters, Equipment, Monitoring, Alerts, Integrations, Operations, RateLimit.

Pastas com README sem implementação TypeScript (DOCUMENTADO, MAS NÃO CONFIRMADO NO CÓDIGO):
`ai`, `crm`, `energy`, `files`, `homologation`, `notifications`, `performance`, `permissions`, `post-sales`, `reports`, `roles`, `units`.

## FRONTEND

Next.js 15 + React 19 (App Router).
UI operacional: dashboard, monitoramento, operação, usinas, inversores, equipamentos, alertas, clientes.
Relatórios: página placeholder / empty-state.

## MOBILE

Expo scaffold. Sem `.ts`/`.tsx` de aplicação.
NÃO ENCONTRADO NO CÓDIGO ATUAL: telas, auth, API client, navegação funcional.

## DOMÍNIO ATUAL (Prisma)

Modelos confirmados no schema:

- User
- Customer
- Plant
- Inverter
- Equipment
- MonitoringReading
- Alert
- AlertEvent
- InverterManufacturer
- Integration
- IntegrationBinding

Migrations existentes: 7 (sem migration nova na Sprint 17).

## MONITORAMENTO

Pipeline preservado (patrimônio arquitetural):

Customer → Plant → Inverter/Equipment → MonitoringReading → Alert/AlertEvent → IntegrationBinding → IntegrationEngine → Redis/BullMQ

Inclui overview, histórico, disponibilidade, diagnóstico, motor de alertas e central de operação.

## INTEGRAÇÕES

- **AUXSOL**: adapter live
- **SOLPLANET, SAJ, HUAWEI, DEYE, CHINT, SUNGROW**: planned / blocked (`PlannedManufacturerAdapter`)

## INFRA

| Componente | Estado no projeto |
|------------|-------------------|
| PostgreSQL | `docker-compose.yml` / `docker-compose.e2e.yml` |
| Redis | idem |
| BullMQ | fila de coleta na API |
| Docker | compose local/e2e; sem Dockerfile de app |
| Health | `/api/health`, `/live`, `/ready` |

## SEGURANÇA

- JWT (`JwtAuthGuard` global)
- `PermissionsGuard` + catálogo de roles/permissions
- `RateLimitGuard` (login / alertas / collect)
- `HttpExceptionFilter`
- `ValidationPipe` (whitelist)
- **Identity & Authorization V2 (Sprint 18):** `UserMembership` + `AuthorizationService` (Role ≠ Scope)
  - Detalhes: [identity-authorization.md](./identity-authorization.md)

## Identity & Authorization V2

```
User
├── legacy customerId
└── Membership (UserMembership)
      ├── role
      ├── customer scope
      ├── plant scope
      └── status
```

- Roles novos: `INVESTIDOR`, `CONSUMIDOR` (sem portal)
- JWT permanece pequeno; escopo resolvido server-side
- Staff interno continua unrestricted
- MonitoringAccessService delega ao AuthorizationService

## QUALIDADE (Sprint 17 — pós-correção)

Resultados medidos na execução da sprint (não inventados):

| Verificação | Resultado |
|-------------|-----------|
| `pnpm lint` | OK |
| API tests (`pnpm --filter @b7/api test`) | OK (41 suites / 243 tests) |
| Web tests (`pnpm --filter @b7/web test`) | OK (11 tests) |
| API typecheck (`tsc --noEmit`) | OK |
| Web typecheck (`tsc --noEmit`) | OK (após correção Sprint 17) |
| API build | OK |
| Web build | OK |
| Prisma validate | OK |

Correção Sprint 17: `apps/web/tsconfig.json` — `allowImportingTsExtensions: true` (compatível com `noEmit` e com o runner `node --experimental-strip-types` dos specs que importam com sufixo `.ts`).

## DOMÍNIOS FUTUROS (NÃO IMPLEMENTADOS)

NÃO ENCONTRADO NO CÓDIGO ATUAL / não implementado nesta sprint:

- Gestão de Energia, Créditos, Rateios, Compensação, Balanço mensal
- Faturamento, Cobrança
- Distribuidora / UC / OC como entidades
- Titular, Associação, Consórcio, Consumidor (entidade de negócio Lumi)
- Portal Investidor, Portal Consumidor
- CRM, WhatsApp, Mobile funcional, IA

## PENDÊNCIAS CONFIRMADAS

- E2E completo depende de Docker ativo (`e2e:up` / `e2e:run`)
- Migration `20260908230000_user_membership_identity` criada; aplicar no banco local quando Docker/DB estiver disponível (`prisma migrate deploy` / `migrate dev`)
- Packages ainda não wired nos apps
- Árvore nested `b7-solar-platform-exe/` precisa decisão operacional de limpeza
- Desambiguação completa Customer/Plant — sprint posterior
- Escopo por UC — futuro (não nesta fundação)
- Warning Node nos testes Web: `MODULE_TYPELESS_PACKAGE_JSON`
- Warning Prisma: `package.json#prisma` deprecated para Prisma 7
- Infraestrutura externa de produção / backup-restore: não validada
