# Integração AUXSOL

## Estado atual (Fase 1 + Fase 2)

- **Fase 1:** autenticação LIVE `POST /auth/token`, cache de token, Bearer, timeout, erros 401/429/5xx.
- **Fase 2:** primeira coleta REAL — realtime por SN + normalizer oficial inicial.

A integração AUXSOL **não** está 100% completa. Demais endpoints do PDF permanecem pendentes.

## Fabricante

- Código interno: `AUXSOL`
- Nome: Auxsol
- Status do catálogo: `READY` (adapter registrado; coleta realtime por SN disponível em modo LIVE)

## Mecanismo de integração

Camada `AuxsolClient` → transport:

- `blocked`: padrão quando não há `AUXSOL_API_BASE_URL`.
- `mock`: `AUXSOL_MOCK_MODE=true` (fixtures internas; sem HTTP).
- `live`: `AUXSOL_API_BASE_URL` + credenciais; HTTP real via `fetch` nativo.

## Autenticação

- `POST /auth/token` com `app_id`, `app_secret`, `lang: zh-CN`
- Bearer `ACCESS_TOKEN` cacheado (`AuxsolTokenManager`, margem padrão 60s)
- Credenciais somente no backend: `AUXSOL_APP_ID`, `AUXSOL_APP_SECRET` (ou `AUXSOL_SECRET_REF`)

## Endpoints oficiais utilizados

| Endpoint | Status |
|----------|--------|
| `POST /auth/token` | Implementado (Fase 1) |
| `GET /analysis/inverterReport/findInverterRealTimeInfoBySn/{sn}` | Implementado (Fase 2) |
| Demais archive/analysis/collector/histórico | **Não implementados** |

Nenhuma Base URL é inventada — configure `AUXSOL_API_BASE_URL` com a URL oficial.

## Identificadores

- Interno B7: `Inverter.id`
- Fabricante: `manufacturer.code === AUXSOL`
- **SN para realtime:** `Inverter.serialNumber` (obrigatório na coleta LIVE)
- Externo genérico: `IntegrationBinding.externalId` (não usado como SN nesta fase)

## Normalizer (Fase 2)

Mapeamento mínimo (valores 1:1 em kW / kWh conforme campos do PDF):

| AUXSOL | B7 |
|--------|-----|
| `energyData.power` | `powerKw` |
| `energyData.y` | `energyTodayKwh` |
| `energyData.ym` | `energyMonthKwh` |
| `energyData.yt` | `energyTotalKwh` |
| `dt` | `collectedAt` (obrigatório; sem `Date.now()`) |
| envelope + data | `rawPayload` (sanitizado) |

Fixtures MOCK legadas (`powerW` / Wh) continuam convertendo W→kW / Wh→kWh apenas no caminho de fixture interna.

## Persistência

Leituras reais só quando modo `live` **e** `AUXSOL_PERSIST_READINGS=true`, via `IntegrationCollectionService` / `MonitoringPersistenceService`.

## Pendências explícitas

- Histórico / curvas
- Plant current data / plant detail
- Collectors
- Bateria / grid / load detalhados
- Regras avançadas de alarmes a partir de `alarmCurrent`
- Rate limiting outbound completo
- Credenciais / Base URL / sandbox reais da AUXSOL
- Confirmação formal de unidades no PDF se divergirem do mapeamento 1:1

## Variáveis de ambiente

- `AUXSOL_API_BASE_URL`
- `AUXSOL_APP_ID`
- `AUXSOL_APP_SECRET`
- `AUXSOL_SECRET_REF` — nome de env alternativa ao secret
- `AUXSOL_API_TIMEOUT_MS` — padrão 10000
- `AUXSOL_HTTP_MAX_RETRIES` — padrão 2
- `AUXSOL_TOKEN_REFRESH_MARGIN_MS` — padrão 60000
- `AUXSOL_MOCK_MODE`
- `AUXSOL_ALLOW_MOCK_IN_PRODUCTION`
- `AUXSOL_PERSIST_READINGS`
