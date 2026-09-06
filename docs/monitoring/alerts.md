# Motor de Alertas

O Motor de Alertas avalia o domínio normalizado da B7 Solar. Ele **não** conhece fabricante e **não** acessa AUXSOL, DEYE ou qualquer API externa.

## Arquitetura

```
MonitoringReading / estado normalizado
        ↓
MonitoringAlertService (Alert Engine)
        ↓
MonitoringAlertRule.evaluate(context)
        ↓
AlertDecision → OPEN / update / RESOLVED
```

Após coleta válida:

```
IntegrationCollectionService
  → validate()
  → persist()
  → evaluateAfterCollection()
```

Ausência de leitura (independente da coleta):

```
Scheduler → EVALUATE_MONITORING_ALERTS → evaluateAbsenceForEligible()
```

## Regras

Códigos centralizados em `ALERT_RULE`:

| Código | Condição | Severidade (enum atual) |
| --- | --- | --- |
| `INVERTER_OFFLINE` | status `OFFLINE` em leitura válida | `CRITICAL` (HIGH mapeado) |
| `INVERTER_WARNING` | status `WARNING` | `WARNING` |
| `INVERTER_ERROR` | status `ERROR` | `CRITICAL` |
| `NO_RECENT_READING` | sem leitura recente, só se coletável | `CRITICAL` (HIGH mapeado) |
| `GENERATION_ANOMALY` | estrutura futura | `WARNING` |

`GENERATION_ANOMALY` fica desabilitada. Não há comparação com `currentPower = 0`. Futuro: histórico, horário, irradiância, potência instalada e comportamento esperado.

Janela de ausência:

```
MONITORING_NO_READING_THRESHOLD_SECONDS=900
```

## Estados

O modelo `Alert` já usava e foi preservado:

- `OPEN`
- `ACKNOWLEDGED` — alguém tomou conhecimento; **não** resolve
- `RESOLVED`

## Deduplicação

`fingerprint = ruleCode:inverterId`

Mesma condição contínua = o mesmo alerta ativo (`OPEN` ou `ACKNOWLEDGED`).

Depois de `RESOLVED`, uma nova ocorrência cria um novo alerta.

## Idempotência

`evaluateAfterCollection` / `evaluateAbsence` podem rodar mais de uma vez. Localizam o alerta ativo pelo fingerprint antes de criar.

## Resolução

- Automática: condição some → `resolvedBy=SYSTEM`, `resolutionType=AUTOMATIC`
- Manual: `PATCH /api/alerts/:id/resolve` → usuário autenticado, `MANUAL`

Reconhecimento: `POST /api/alerts/:id/acknowledge` registra `acknowledgedAt` e `acknowledgedBy`.

Não apaga histórico. Eventos: `ALERT_CREATED`, `ALERT_ACKNOWLEDGED`, `ALERT_RESOLVED`.

## BLOCKED / NOT_CONFIGURED

Integração bloqueada (ex.: AUXSOL padrão) ou sem binding **não** gera `INVERTER_OFFLINE` nem `NO_RECENT_READING`.

O Motor de Alertas não conhece campos da API do fabricante. Ele só avalia `MonitoringReading` e a coletabilidade resolvida pelo adapter (`BLOCKED` / `NOT_CONFIGURED` / `COLLECTABLE`).

Isso evita confundir “não conseguimos coletar” com “o inversor está offline”.

Leitura inválida também não gera alerta operacional.

## Integração BullMQ

Job `EVALUATE_MONITORING_ALERTS`, `jobId=evaluate-monitoring-alerts`.

O processor só orquestra. As regras ficam no motor.

## Endpoints

Todos exigem JWT + permissão:

- `GET /api/alerts`
- `GET /api/alerts/:id`
- `POST /api/alerts/:id/acknowledge` (`ALERTS_RESOLVE`)
- `PATCH /api/alerts/:id/resolve` (`ALERTS_RESOLVE`)

Filtros: `status`, `severity`, `plantId`, `inverterId`.

## Notificações

Não implementadas (WhatsApp, SMS, e-mail, push). Os eventos de alerta ficam prontos para um futuro despacho.

## Observabilidade

Logs com `scope: ALERT`. Nunca registram senha, token, secret ou credencial.
