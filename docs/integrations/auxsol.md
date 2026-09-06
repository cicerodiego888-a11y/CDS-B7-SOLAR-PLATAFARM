# Integração AUXSOL

## Estado desta sprint

Adapter AUXSOL implementado e preparado; comunicação real aguardando contrato oficial/credencial de integração.

Nenhuma URL, endpoint, header, token ou payload oficial foi inventado.

## Fabricante

- Código interno: `AUXSOL`
- Nome: Auxsol
- Status do catálogo: `READY` (adapter registrado; coleta oficial ainda não ativa)

## Mecanismo de integração

Não definido — aguardando documentação/credencial oficial.

A camada `AuxsolClient` fala com um transporte explícito:

- `blocked`: padrão quando não há URL oficial nem modo de fixture.
- `mock`: somente com `AUXSOL_MOCK_MODE=true` (proibido em produção, salvo override explícito).
- `live`: somente se `AUXSOL_API_BASE_URL` for preenchida com a URL oficial. Mesmo assim, nenhum caminho HTTP é chamado até existirem rotas documentadas.

## Autenticação

Não definido — aguardando documentação/credencial oficial.

Credenciais, quando existirem, devem ficar no backend via `EnvSecretProvider` e `AUXSOL_SECRET_REF` (nome da variável, nunca o valor no código ou no frontend).

## Endpoints oficiais utilizados

Não definido — aguardando documentação/credencial oficial.

Nenhuma rota externa é chamada nesta sprint.

## Identificadores

- Interno B7: `Inverter.id`
- Fabricante: `manufacturer.code === AUXSOL`
- Série: `Inverter.serialNumber`
- Externo: `IntegrationBinding.externalId` (genérico; não existe `auxsolDeviceId` no Inverter)

## Payloads

Não definido — aguardando documentação/credencial oficial.

As fixtures em `apps/api/src/modules/integrations/auxsol/auxsol.fixtures.ts` são internas da B7 e estão marcadas com `notOfficialContract: true`.

## Campos e unidades (somente fixtures internas)

As conversões abaixo valem **apenas** para as fixtures B7, que documentam W e Wh:

- `powerW` → `powerKw` (W → kW, divisão por 1000)
- `todayEnergyWh` → `energyTodayKwh` (Wh → kWh)
- `totalEnergyWh` → `energyTotalKwh` (Wh → kWh)
- tensão: V
- corrente: A
- frequência: Hz
- temperatura: °C, se fornecida; caso contrário permanece ausente

Unidades oficiais AUXSOL: não definido — aguardando documentação/credencial oficial.

## Status

Mapeamento interno ocorre só no adapter:

- `running` / `online` → `ONLINE`
- `offline` → `OFFLINE`
- `warning` → `WARNING`
- `fault` / `error` → `ERROR`
- demais / ausente → `UNKNOWN`

Códigos oficiais AUXSOL: não definido — aguardando documentação/credencial oficial.

## Erros

- Contrato ausente: comunicação bloqueada, sem request inventado.
- Autenticação: sem retry.
- Timeout, HTTP 429 e 5xx: retry limitado.
- Fabricante diferente de AUXSOL: `Este inversor não pertence ao fabricante AUXSOL.`

## Persistência

A persistência histórica passou a ser feita pelo Motor de Coleta genérico (`IntegrationCollectionService`).

Leituras reais só podem ser gravadas em `MonitoringReading` quando o modo for `live` e `AUXSOL_PERSIST_READINGS=true`.

O modo de fixture **não** grava dados no dashboard.

## Limitações

- Sem contrato oficial de API.
- Sem credencial de integração.
- Sem descoberta real de plantas/dispositivos.
- Sem sincronização automática em massa.
- Sem scraping, login de navegador ou captura de sessão.

## Variáveis de ambiente

- `AUXSOL_API_BASE_URL` — vazio até a URL oficial
- `AUXSOL_API_TIMEOUT_MS` — padrão 10000
- `AUXSOL_HTTP_MAX_RETRIES` — padrão 2
- `AUXSOL_MOCK_MODE` — `true` apenas em desenvolvimento
- `AUXSOL_ALLOW_MOCK_IN_PRODUCTION` — deve permanecer `false`
- `AUXSOL_PERSIST_READINGS` — persistência só em modo live
- `AUXSOL_SECRET_REF` — nome da variável de segredo, não o segredo
