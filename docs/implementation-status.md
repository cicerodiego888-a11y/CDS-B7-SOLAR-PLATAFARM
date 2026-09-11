# Status da implementação

Documento factual alinhado ao código da árvore raiz.
Para baseline V2 detalhado, ver [architecture/baseline-v2.md](./architecture/baseline-v2.md).

## Identidade do produto

**B7 Solar Plataforma de Gestão** (evolução arquitetural V2 em andamento).

## Implementado e confirmado no código

- Monorepo (pnpm + turbo): `apps/api`, `apps/web`, `apps/mobile`, `packages/*`
- API NestJS + Prisma + PostgreSQL
- Auth JWT, guards de permissão, rate limit (login/alertas/collect)
- Health / live / ready
- CRUD: clientes, usinas, inversores, equipamentos
- Monitoramento: overview, histórico, disponibilidade, diagnóstico
- Alertas + motor de regras + AlertEvent
- Integrações: IntegrationEngine, IntegrationBinding, coleta Redis/BullMQ
- Fabricante live: **AUXSOL**
- Fabricantes planned/blocked: SOLPLANET, SAJ, HUAWEI, DEYE, CHINT, SUNGROW
- Web Next.js: dashboard, monitoramento, operação, usinas, inversores, equipamentos, alertas, clientes
- Seed Prisma + suíte de testes unitários API/Web + scripts E2E
- Identity & Authorization V2: `UserMembership`, roles `INVESTIDOR`/`CONSUMIDOR`, `AuthorizationService` (sem portais)

## Parcialmente implementado

- Relatórios (página Web placeholder / empty-state)
- Endereço de Customer no schema (`address`/`city`/`state`) sem uso completo no DTO/service de create/update
- Packages `@b7/*` existem, mas **ainda não wired** nos apps
- Mobile Expo: **scaffold only**

## DOCUMENTADO, MAS NÃO CONFIRMADO NO CÓDIGO

Pastas de módulo com README e sem implementação TypeScript de domínio:

- `apps/api/src/modules/ai`
- `apps/api/src/modules/crm`
- `apps/api/src/modules/energy`
- `apps/api/src/modules/files`
- `apps/api/src/modules/homologation`
- `apps/api/src/modules/notifications`
- `apps/api/src/modules/performance`
- `apps/api/src/modules/permissions` / `roles` (permissões reais estão em `auth/`)
- `apps/api/src/modules/post-sales`
- `apps/api/src/modules/reports`
- `apps/api/src/modules/units`
- Integrações README: whatsapp, payments, social, distributors, manufacturers extras fora do catálogo oficial

## NÃO ENCONTRADO NO CÓDIGO ATUAL

- Gestão de Energia / créditos / rateios / compensação / balanço mensal
- Faturamento / cobrança
- Distribuidora, UC/OC, titular, associação, consórcio, consumidor (modelo Lumi) como entidades
- Portal Investidor / Portal Consumidor
- Mobile funcional
- IA operacional

## Próximas frentes (planejamento — não implementadas aqui)

1. Evolução controlada de Customer/Plant sem contaminar Monitoramento
2. Gestão de Energia (domínio novo)
3. Faturamento / Cobrança (domínio novo)
4. Portais, CRM, WhatsApp, Mobile, IA — fases posteriores
5. Wiring de `packages/*` (decisão arquitetural futura)
6. Limpeza operacional da cópia nested `b7-solar-platform-exe/`
7. Aplicar migration de membership no ambiente quando DB estiver disponível
