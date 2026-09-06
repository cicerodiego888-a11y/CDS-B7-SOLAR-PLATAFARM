# Normalização de monitoramento

O adapter do fabricante é o único ponto que conhece nomes de campos da API externa.
O restante da plataforma consome apenas `NormalizedMonitoringData` (`MonitoringConnector`).

## Conversão conceitual

```
External power            → currentPowerKw / powerKw     (kW)
External total energy     → energyTotalKwh               (kWh)
External daily energy     → energyTodayKwh               (kWh)
External status           → ONLINE / OFFLINE / WARNING / ERROR / UNKNOWN
External timestamp        → collectedAt                  (Date UTC)
External frequency        → frequency                    (opcional)
External DC power         → dcPowerKw                    (kW, opcional)
External AC power         → acPowerKw                    (kW, opcional)
```

Unidades internas:

- potência: kW
- energia: kWh
- potência nominal instalada: kWp

Nunca converter kW em kWh só para preencher histórico.

## Responsabilidades

| Camada | Faz | Não faz |
| --- | --- | --- |
| Adapter / Client | Autentica (quando o contrato existir), coleta, normaliza, oculta segredo | Inventar endpoint ou timestamp |
| IntegrationEngine | Resolve o adapter pelo catálogo | Conhecer campos do fabricante |
| IntegrationCollectionService | Orquestra binding, lock e resultado | Persistir se `BLOCKED` / não persistível |
| ReadingValidator | Recusa timestamp ausente/inválido/futuro e números inválidos | Inventar `Date.now()` |
| MonitoringPersistenceService | Grava `MonitoringReading` idempotente | Aceitar fixture como dado real |
| BullMQ | Retry de falha transitória | Decidir BLOCKED |
| Motor de Alertas | Avalia domínio normalizado | Tratar `BLOCKED` como offline |
| Dashboard / Central | Lê `MonitoringReading` e alertas | Conhecer API do fabricante |

## Timestamp

- Ausente ou inválido: leitura rejeitada.
- Futuro além da tolerância do validador: rejeitada.
- Timezone: o adapter converte para instante UTC em `collectedAt`.
- Duplicado: idempotência em `MonitoringPersistenceService`.
- Sem timestamp do fabricante: **não** usar o relógio da API.

## Fixtures internas

Fixtures existem só para testes unitários/contratuais.
Não alimentam Dashboard, Central de Operação, `MonitoringReading` real nem alerta real.
