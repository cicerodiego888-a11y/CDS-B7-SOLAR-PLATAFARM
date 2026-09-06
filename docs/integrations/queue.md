# Fila de coleta — Redis + BullMQ

A coleta automática usa Redis e BullMQ para acionar o **mesmo** Motor de Coleta da Sprint 06.

Não existe um segundo motor. Manual, agendado e retry chamam `IntegrationCollectionService`.

## Arquitetura

```
Scheduler / HTTP
        ↓
IntegrationQueueService
        ↓
BullMQ (COLLECT_INVERTER)
        ↓
IntegrationQueueProcessor
        ↓
IntegrationCollectionService
        ↓
IntegrationEngine → Adapter → validação → persistência
```

O processor e o scheduler **não** conhecem fabricante.

## Redis

Serviço Docker `redis` em `docker-compose.yml`.

```
REDIS_HOST=localhost
REDIS_PORT=6379
```

Sem senha no ambiente local.

Subir:

```
docker compose up -d postgres redis
```

## BullMQ

- Fila: `b7-integrations`
- Job: `COLLECT_INVERTER`
- Payload: `{ inverterId, reason?: "SCHEDULED" | "MANUAL" | "RETRY" }`
- `reason` não altera a regra de coleta.

- Job: `EVALUATE_MONITORING_ALERTS`
- Payload: `{ reason?: "SCHEDULED" }`
- `jobId = evaluate-monitoring-alerts`
- O processor chama `AlertsService.evaluateAbsence()` (Motor de Alertas). Não duplica regras.

## Retry

- 3 tentativas
- backoff exponencial (2s, 4s, 8s)

Não há retry infinito.

Erros **não** retriáveis (conclusão controlada):

- `INTEGRATION_BLOCKED`
- `INTEGRATION_NOT_CONFIGURED`
- `INTEGRATION_NOT_SUPPORTED`
- inversor inexistente

`COLLECTION_FAILED` e falhas transitórias entram no retry.

## Job duplicado

`jobId = collect-inverter:{inverterId}`

Se já existe job waiting/active/delayed, o scheduler não cria outro.

## Concorrência

Inversores diferentes podem ser coletados em paralelo (`MONITORING_COLLECTION_CONCURRENCY`, padrão 5).

O mesmo inversor:

- um jobId por vez na fila;
- `InProcessCollectionLock` no Motor de Coleta.

O lock em memória continua válido para **uma instância** do processo. A fila reduz duplicatas entre ciclos.

## Scheduler

Intervalo: `MONITORING_COLLECTION_INTERVAL_SECONDS` (padrão 300).

Desligar: `MONITORING_COLLECTION_ENABLED=false`

Elegíveis:

- inversor não `INACTIVE`;
- possui `IntegrationBinding` do fabricante.

O scheduler **não** decide BLOCKED. Isso fica no Motor de Coleta.

No mesmo ciclo, enfileira `EVALUATE_MONITORING_ALERTS` para `NO_RECENT_READING` nos inversores coletáveis. Integração `BLOCKED` / `NOT_CONFIGURED` não gera falso positivo.

Ver `docs/monitoring/alerts.md`.

## AUXSOL BLOCKED

Job pode ser criado. O motor devolve `INTEGRATION_BLOCKED`. Nenhuma leitura é persistida. O job termina sem virar falha de infraestrutura.

## Diagnóstico

`GET /api/integrations/queue` (JWT + `SETTINGS_VIEW`)

Estados: waiting, active, completed, failed, delayed.

Health:

```
GET /api/health
api / database / redis
integrations.AUXSOL = blocked (informativo)
```

`AUXSOL BLOCKED` não degrada o health da infraestrutura. `status` continua `ok` se API, PostgreSQL e Redis estiverem saudáveis.

## Troubleshooting

Redis down:

- health `redis=down`, `status=degraded`
- scheduler não enfileira
- coleta **manual** HTTP continua no Motor de Coleta

Não há endpoints, URLs ou credenciais de fabricante inventados.
