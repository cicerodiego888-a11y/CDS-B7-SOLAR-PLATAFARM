# Motor de Coleta

Serviço genérico para executar uma coleta, validar dados normalizados e persistir histórico em `MonitoringReading`.

O coletor **não** conhece fabricante. O Motor de Integrações resolve o adapter pelo `IntegrationBinding.provider`.

## Fluxo

HTTP `POST /api/integrations/collect/:inverterId`
→ `IntegrationCollectionService`
→ `IntegrationEngine.resolve(provider)`
→ adapter `collect()`
→ validação
→ `MonitoringPersistenceService` (somente se `runtimeState().persistable`)
→ `MonitoringReading`
→ `MonitoringAlertService.evaluateAfterCollection()` (somente leitura válida e persistível)

O mesmo serviço é acionado por:

- `MANUAL` — `POST /api/integrations/collect/:inverterId` e `POST /api/integrations/auxsol/sync/:inverterId`
- `SCHEDULED` — scheduler + BullMQ
- `RETRY` — nova tentativa controlada do job

Ver `docs/integrations/queue.md`.

## Persistência

- Reutiliza `MonitoringReading`.
- Origem genérica: `sourceProvider`.
- Idempotência: `idempotencyKey` = `provider:inverterId:externalReadingId` ou `provider:inverterId:timestampISO`.
- Também evita duplicar o mesmo `inverterId + sourceProvider + collectedAt`.
- Leituras com timestamps diferentes são persistidas em sequência (histórico).

Fixture/mock **não** é persistível. `AUXSOL_MOCK_MODE=true` exercita o adapter, mas não grava no dashboard.

## lastSyncAt

Atualizado somente quando a coleta é persistível (modo live com persistência habilitada) e a operação termina sem erro.

Não é atualizado em blocked, mock, autenticação falha ou timeout.

## Concorrência

`InProcessCollectionLock` impede duas coletas do mesmo inversor no mesmo processo.

**Limitação:** proteção válida para uma instância do processo. Não cobre múltiplas instâncias da API. Redis poderá ser usado depois.

## Coleta automática

Acionada por Redis + BullMQ. O scheduler só enfileira inversores elegíveis; a autoridade da coleta continua neste serviço.

## Alertas

O Motor de Coleta não contém regras de alerta. Após persistir uma leitura válida, chama o Motor de Alertas.

Leitura inválida, mock e `blocked` não geram alerta operacional.

Ver `docs/monitoring/alerts.md`.

## AUXSOL

Nenhum endpoint externo AUXSOL foi inventado. O modo padrão continua `blocked`.

`BLOCKED` e `NOT_CONFIGURED` não persistem `MonitoringReading` e não disparam alerta de equipamento offline.

Ver `docs/integrations/normalization.md` e `docs/integrations/manufacturer-contract.md`.
