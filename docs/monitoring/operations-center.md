# Central de Operação

Rota: `/operacao`  
API: `GET /api/operations/overview`  
Permissão: `MONITORING_VIEW` (existente)

A Central é uma **camada de leitura**. Não possui motor próprio de coleta, alerta ou geração.

## Dashboard × Central

| Dashboard | Central |
| --- | --- |
| Visão executiva | Visão operacional |
| KPIs e gráfico | Usinas, inversores, alertas, ações |
| Resumo | O que exige ação agora |

## Fontes

- Usinas / inversores / clientes: cadastro
- Geração: `MonitoringHistoryService.compute` → `aggregateEnergyHistory`
- Última leitura: `latestReadings` (`MonitoringReading`)
- Alertas: `AlertsService.listActive` (`OPEN` + `ACKNOWLEDGED`)
- Coletabilidade: `MonitoringAlertService.resolveCollectability`
- Saúde de infraestrutura: `HealthService` (`api`, `database`, `redis`; `integrations.*` é informativo e `BLOCKED` não falha a infraestrutura)
- Disponibilidade / cobertura / saúde operacional: `MonitoringAvailabilityService` (mesmo cálculo das páginas de usina e inversor)

## Status da usina

Não altera `PlantStatus`.

1. `INACTIVE` → `UNKNOWN` (manutenção)
2. `OFFLINE` cadastral → `OFFLINE`
3. `WARNING` cadastral → `WARNING`
4. Sem inversores **coletáveis** (BLOCKED / NOT_CONFIGURED) → `ONLINE` se a usina está `ACTIVE`  
   Integração bloqueada **não** é equipamento offline.
5. Todos os coletáveis offline/sem comunicação → `OFFLINE`
6. Parte com alerta/falha → `WARNING`
7. Caso contrário → `ONLINE`

## Inversores com atenção

Somente `COLLECTABLE` com `OFFLINE`, `ERROR` ou `WARNING`.

AUXSOL BLOCKED sem leitura **não** entra na lista.

## Geração

Mesma regra da página da usina e do Dashboard para o período selecionado.

Sem leitura: `hasGeneration=false` → “Sem dados”. Não exibe 0 kWh inventado.

## Última leitura

Timestamp real de `MonitoringReading`. Sem registro: “Nunca sincronizado”.

## Filtros e busca

Período (hoje, ontem, 7 dias, 30 dias, este mês), status operacional, cliente e busca por nome da usina, cliente ou inversor.

A API aplica os filtros no conjunto autorizado. O volume atual cabe numa consulta agregada; não há varredura de todo o histórico.

## Autorização

JWT + `MONITORING_VIEW`. Papel `CUSTOMER` restringe por `customerId`. Reconhecer/resolver reutilizam `POST /api/alerts/:id/acknowledge` e `PATCH /api/alerts/:id/resolve`.

## Atualização

Botão **Atualizar** e o mesmo intervalo do Dashboard (`DASHBOARD_POLL_MS`, 60s).

## Limitações

Sem dados AUXSOL persistidos, geração e última leitura ficam vazias. Disponibilidade aparece como N/D, cobertura 0% e saúde “Integração bloqueada” / “Sem dados”. A Central continua mostrando o cadastro real.

Sem Gestão de Energia, previsão ou notificações.

A Central **não** contém `if manufacturer === AUXSOL`. Toda normalização ocorre antes de `MonitoringReading`.
