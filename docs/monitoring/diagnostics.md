# Diagnóstico operacional

## Objetivo

O diagnóstico operacional consolida leituras, alertas, disponibilidade, cobertura e estado da integração para explicar o que está acontecendo com um inversor ou uma usina.

Incidente operacional nesta versão é um read model derivado dos dados existentes e não uma entidade persistida. Não há tabela `Incident`, `IncidentEvent` ou `Diagnosis`, nem migration nesta sprint.

## Regras

O diagnóstico é determinístico e prioriza alertas ativos por severidade. `INVERTER_OFFLINE`, `INVERTER_ERROR` e `NO_RECENT_READING` são críticos; `INVERTER_WARNING` e `LOW_COVERAGE` são atenção. Integração não configurada ou bloqueada gera atenção, nunca um alerta offline por si só. A regra `0 kW + ONLINE != OFFLINE` é preservada.

Sem evidência suficiente, o código é `NO_DATA`. Uma leitura online normal não cria incidente.

## Evidências, duração e impacto

O read model expõe somente dados existentes: alerta, horários, última leitura, status normalizado, disponibilidade, cobertura, sincronização, integração, fabricante, modelo, serial, potência nominal e mensagens/códigos presentes no `rawPayload`.

Quando há alerta, `since` usa `Alert.createdAt`. A duração é calculada até o momento da consulta e limitada a zero para timestamps futuros. Sem timestamp não há duração. O impacto informa inversores afetados e potência nominal disponível; potência nominal não é perda de energia.

## Timeline

A timeline é montada em memória com a última leitura e os `AlertEvent` existentes. Seus tipos são `READ`, `ALERT_OPENED`, `ALERT_ACKNOWLEDGED` e `ALERT_RESOLVED`, ordenados do mais recente para o mais antigo. Nenhum evento é criado pelo diagnóstico.

## Endpoints e acesso

- `GET /api/monitoring/diagnostics/inverters/:inverterId`
- `GET /api/monitoring/diagnostics/plants/:plantId`
- `GET /api/monitoring/diagnostics/overview`

Todos exigem `MONITORING_VIEW` e usam `MonitoringAccessService`; usuários `CUSTOMER` permanecem limitados ao próprio cliente.

O overview aceita filtros por `severity`, `code`, `customerId`, `plantId`, `manufacturerId` e `search`. Também aceita `page` e `pageSize` quando a paginação for necessária. A ordenação centralizada prioriza `CRITICAL`, depois `WARNING` e `INFO`; em empate usa potência nominal maior e ocorrência mais antiga quando disponíveis.

## Ações operacionais

Reconhecer e resolver não alteram o read model diretamente. A Central chama os endpoints oficiais do alerta original: `POST /api/alerts/:id/acknowledge` e `PATCH /api/alerts/:id/resolve`, ambos protegidos por `ALERTS_RESOLVE`. `ACKNOWLEDGED` continua ativo; somente `RESOLVED` deixa de aparecer como ocorrência ativa. O histórico continua sendo mantido por `AlertEvent`.

## Limitações

Disponibilidade e cobertura usam o período existente de sete dias. A ausência de leitura só é classificada como `NO_RECENT_READING` quando o Alert Engine já produziu esse alerta; sem ele, o diagnóstico informa `NO_DATA`. Não há cálculo de perda em kWh nem integração real de fabricantes.

Não há infraestrutura E2E configurada neste workspace (não existe configuração Playwright, fixture de autenticação ou script E2E); os testes E2E HTTP permanecem pendência para quando essa infraestrutura for adicionada.

AUXSOL continua bloqueada enquanto não houver contrato e credenciais oficiais.