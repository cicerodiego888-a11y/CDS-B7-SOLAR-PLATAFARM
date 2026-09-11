# Deployment do Monitoramento Web V1

## Pré-requisitos

- Node.js compatível com o workspace e pnpm 10;
- PostgreSQL acessível por `DATABASE_URL`;
- Redis acessível por `REDIS_HOST`, `REDIS_PORT` e `REDIS_PASSWORD`;
- `JWT_SECRET` forte e secrets fora do repositório;
- `CORS_ORIGINS` explícito para os domínios permitidos;
- backup PostgreSQL definido antes do primeiro deploy.

## Build e validação

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm test
pnpm build
pnpm --filter @b7/api exec prisma validate
pnpm --filter @b7/api exec prisma generate
```

## Banco

Migrations devem ser aplicadas explicitamente no ambiente alvo com `prisma migrate deploy`. Nunca usar `prisma migrate reset` em desenvolvimento ou produção. O deploy deve parar se a migration falhar.

## Redis e filas

Redis é dependência de readiness, BullMQ e coordenação distribuída de coleta. O lock usa a chave `collect-lock:{inverterId}`, TTL configurável e token de proprietário. Se Redis estiver indisponível, coleta falha controladamente; não há fallback silencioso para múltiplas réplicas.

## Health e readiness

- `/api/health/live`: processo respondendo;
- `/api/health`: diagnóstico de API, banco, Redis e integrações;
- `/api/health/ready`: banco e Redis disponíveis.

Fabricantes bloqueados não são dependência de readiness.

## HTTPS e proxy

HTTPS/TLS deve ser terminado no reverse proxy ou plataforma de deploy escolhida. Esta sprint não configura certificado nem altera servidor externo. O proxy deve encaminhar `X-Request-Id`, `Authorization` e somente origens CORS aprovadas.

## Secrets

Não colocar `DATABASE_URL`, `JWT_SECRET`, credenciais Redis ou secrets de fabricante em Git, bundle Web, logs ou `.env.example`. Em produção, a aplicação falha ao inicializar sem `JWT_SECRET` forte.

## Rollback

1. Interromper o rollout se health/readiness falhar.
2. Preservar o banco e os volumes.
3. Reverter a imagem/build da aplicação.
4. Não reverter migrations destrutivamente.
5. Investigar logs usando `X-Request-Id`.

## Backup e restore

O PostgreSQL precisa de backup automatizado, retenção definida e teste periódico de restauração. Não há backup externo nem restore automatizado implementado nesta sprint. O teste E2E de backup/restauração depende do Docker Desktop ativo e deve usar banco separado.

## E2E isolado

```bash
pnpm e2e:up
pnpm e2e:migrate
pnpm e2e:seed
pnpm e2e:run
pnpm e2e:down
```

O Compose E2E usa PostgreSQL em `55432`, Redis em `56379`, banco `b7_solar_e2e` e volumes próprios. Nunca aponta para o banco ou Redis de desenvolvimento.

## Observabilidade

A aplicação fornece logs de coleta com provider, inverter, status, duração e código técnico redigido; `X-Request-Id`; health/readiness; snapshot de fila; eventos de alerta; e estado de sincronização/binding. Integração com Sentry, Datadog, Grafana ou OpenTelemetry permanece uma dependência de infraestrutura futura, não configurada automaticamente.
