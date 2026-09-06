# Histórico de geração

Fonte única: `MonitoringReading`. Dashboard, usina e inversor usam `aggregateEnergyHistory`.

Não há cache Redis. Não há dados fictícios.

## Timezone

`MONITORING_TIMEZONE` (padrão `America/Sao_Paulo`).

Os períodos (hoje, ontem, mês) e os buckets HOUR/DAY/MONTH usam o relógio operacional, não UTC cru. Exemplo: 23:30 em São Paulo continua no mesmo dia, mesmo que o instante UTC já seja o dia seguinte.

## Endpoints

Todos exigem JWT.

| Método | Caminho | Permissão |
| --- | --- | --- |
| GET | `/api/monitoring/overview?period=` | `MONITORING_VIEW` ou `DASHBOARD_VIEW` |
| GET | `/api/monitoring/history` | `MONITORING_VIEW` |
| GET | `/api/monitoring/plants/:plantId/history` | `MONITORING_VIEW` |
| GET | `/api/monitoring/inverters/:inverterId/history` | `MONITORING_VIEW` |

Filtros de history: `plantId`, `inverterId`, `period`, `startDate`, `endDate`, `granularity`.

Papel `CUSTOMER` só vê usinas do próprio `customerId`. Sem acesso: **403**. Usina/inversor inexistente: **404**. Intervalo inválido: **422**.

## Períodos

`today` · `yesterday` · `last7days` · `last30days` · `thisMonth` · `previousMonth` · `custom`

Intervalo máximo: 366 dias.

## Granularidade

`HOUR` · `DAY` · `MONTH`

Padrão: hoje/ontem → HOUR; intervalos longos → MONTH; demais → DAY.

A agregação ocorre no backend. O frontend recebe séries já agrupadas.

## Unidades

- Potência instantânea: **kW**
- Energia gerada no período: **kWh**
- Potência instalada da usina: **kWp**

Potência instantânea **nunca** é somada como energia.

## Energia acumulada

Se existir `energyTotalKwh`:

1. ordenar por inversor e `collectedAt`
2. usar o ponto imediatamente anterior ao intervalo (quando houver)
3. somar apenas incrementos `atual - anterior`
4. se `atual < anterior`: reset de contador — não soma negativo; o novo valor vira base

`100 → 110 → 120` = **20 kWh**

`100 → 110 → 105` = **10 kWh** + reset registrado

Se não houver total, usa-se `energyTodayKwh`:

- vários pontos: o mesmo incremento (queda = reset do contador diário)
- um único ponto no período: snapshot do dia (produção diária do fabricante)

Leituras inválidas (negativas, não numéricas) são ignoradas.

Duplicatas com o mesmo acumulado não geram energia.

## Comparação

Período atual × período anterior de mesma duração. Sem base: nenhum percentual.

## Performance da usina

Indicadores: geração do período, kWp instalado, quantidade de inversores, online/offline pela última leitura, alertas ativos, variação.

Não há “performance %” nem disponibilidade contínua: faltam geração esperada e série de estados. Documentado nas notas da API.

## Consistência

`MonitoringService.overview` chama o mesmo `MonitoringHistoryService.compute` usado pelos endpoints de history.

## Limitações

- Sem integração real de fabricante neste Sprint
- Sem irradiância, previsão ou eficiência física
- Sem cálculo comercial
- Disponibilidade operacional fica para evolução futura
