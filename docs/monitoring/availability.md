# Disponibilidade e saúde operacional

A disponibilidade é calculada sobre `MonitoringReading` existente.
Não há tabela de availability e nenhum segundo motor de monitoramento.

## Conceito

Disponibilidade =
tempo comprovadamente operacional (ONLINE + WARNING) /
tempo com evidência operacional (ONLINE + WARNING + OFFLINE + ERROR)

Cobertura =
tempo observado /
duração do período

Disponibilidade **não** é existência de cadastro nem existência de binding.

## Tempo observável

Cada leitura segura o estado normalizado apenas até

`MONITORING_AVAILABILITY_MAX_GAP_SECONDS`

Padrão: **900 segundos**.

Esse valor é política da plataforma (tolerância sobre o scheduler de 300 s).
Não é intervalo oficial da AUXSOL.

Se o intervalo entre leituras (ou até o fim do período) exceder o gap:

- os primeiros 900 s permanecem no último estado observado;
- o restante é `UNOBSERVED`.

Antes da primeira leitura do período o tempo é `UNOBSERVED`.

## Status

Quando a leitura traz `normalizedStatus` (persistido em `rawPayload`), esse estado é usado.

Não se infere OFFLINE porque a potência é 0 kW.

`communicationOk = false` sem status explícito conta como ERROR de comunicação, não como “sem leitura”.

## Sem dados

Sem evidência no período:

- disponibilidade = `null` → **N/D**
- cobertura = **0%**
- saúde = `NO_DATA`

Nunca devolver 0% de disponibilidade como se o equipamento tivesse ficado 100% indisponível.

## BLOCKED / NOT_CONFIGURED

Integração `BLOCKED` ou `NOT_CONFIGURED`:

- disponibilidade = N/D
- cobertura = 0%
- saúde = Sem dados / Integração bloqueada / Não configurado

Isso **não** é OFFLINE.

## Saúde

| Saúde | Quando |
| --- | --- |
| HEALTHY | evidência suficiente, cobertura ≥ 50%, sem warning/offline/error |
| ATTENTION | warning, cobertura baixa ou parte da usina sem dados |
| CRITICAL | offline/error observado ou alerta `INVERTER_OFFLINE` / `INVERTER_ERROR` |
| NO_DATA | sem evidência, BLOCKED ou NOT_CONFIGURED |

`NO_RECENT_READING` continua só no Motor de Alertas. Não gera outra regra de disponibilidade.

## Agregação da usina

Soma de tempos dos inversores **elegíveis**.
Não é média simples de percentuais.

Excluídos: BLOCKED, NOT_CONFIGURED, NOT_SUPPORTED, INACTIVE.

## Timezone

`MONITORING_TIMEZONE=America/Sao_Paulo`

O backend calcula o período. O navegador não redefine o recorte.

## Endpoints

- `GET /api/monitoring/availability`
- `GET /api/monitoring/inverters/:inverterId/availability`
- `GET /api/monitoring/plants/:plantId/availability`

Permissão: `MONITORING_VIEW`. JWT obrigatório.

## Limitações

Enquanto AUXSOL estiver BLOCKED e não houver leituras persistidas, todos os indicadores ficam N/D / 0% / Sem dados.
O status operacional histórico depende de `normalizedStatus` gravado no `rawPayload` da leitura. Não foi criada coluna nova.
