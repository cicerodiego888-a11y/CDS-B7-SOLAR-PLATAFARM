# AUDITORIA DOMÍNIO 4 — DISTRIBUIDORA + UC

**Tipo:** auditoria + especificação conceitual (sem implementação)  
**Sprint:** D3/D4 — Distribuidora + Unidade Consumidora  
**Data-base:** 2026-09-10  
**Fonte de verdade do código:** árvore raiz `B7-Solar-Platform-exe`  
**Cópia nested `b7-solar-platform-exe/`:** NÃO é fonte de verdade (baseline-v2)  
**Alterações nesta sprint:** NENHUMA (código, Prisma, banco, migrations, APIs, frontend, testes)

**Referências consultadas:**

| Documento | Papel |
|-----------|--------|
| `baseline-v2.md` | Baseline O&M / modelos reais |
| `overview.md` / `README.md` | Núcleo Monitoramento |
| `domain-spec-v2.1.md` | Spec conceitual V2.1 |
| `domain-decisions-v2.2.md` | Matriz D1–D15 |
| `domain-uc-d3.md` | Modelo conceitual UC (Lei 14.300 / REN) |
| `plant-consumer-unit-legacy-audit.md` | Auditoria `Plant.consumerUnit` |
| `identity-authorization.md` | Role ≠ Scope |
| Prisma `schema.prisma` + migrations | Estado real do banco |
| Código API/Web/seeds/tests | Uso real |

---

## 1. Veredito Executivo

O domínio **Distribuidora + UC** **não existe como entidades** no código nem no Prisma. O que existe hoje são **stubs textuais** em `Plant`:

- `Plant.distributor: String?` — rótulo “Concessionária”
- `Plant.consumerUnit: String?` — rótulo “Unidade consumidora” / “UC”

O núcleo **Monitoramento/O&M** está implementado e **não depende** desses campos. AUXSOL/Live e telemetria operam em `Plant → Inverter → MonitoringReading`.

A documentação oficial (`domain-uc-d3.md` + decisões congeladas desta sprint) já converge para:

| Conceito | Proposta |
|----------|----------|
| UC | Entidade própria futura (`ConsumerUnit`) |
| Consumer | Entidade própria futura ≠ Customer ≠ User |
| Distributor | Entidade própria futura ≠ string em Plant |
| Plant ↔ UC | Independentes; vínculo energético via **Rateio versionado** (N:N) |
| Consumer ↔ UC | 1 UC → 1 titular; 1 Consumer → N UCs |
| `Plant.consumerUnit` | **Legado preservado**; não migrar automaticamente |

**Bloqueio de implementação:** várias decisões ainda exigem **PO** e/ou **VALIDAÇÃO REGULATÓRIA**. Cadastro Energético Mínimo (Distributor + UC + Consumer + Rateio) **não deve ser implementado** até o PO aprovar esta especificação e fechar as pendências críticas (seção 22 / 26).

**Critério desta sprint (aceite):** relatório completo; **zero** alteração de código/schema/banco.

---

## 2. Estado Atual do Código

### 2.1 Grafo operacional real

```
Customer
  └── Plant
        ├── Inverter / Equipment
        ├── MonitoringReading
        ├── Alert / AlertEvent
        ├── IntegrationBinding → IntegrationEngine → Redis/BullMQ
        └── UserMembership (scope plant)

User
  ├── role (incl. CONSUMIDOR / INVESTIDOR — só autorização)
  ├── customerId? (legado)
  └── UserMembership[] → customerId? | plantId?
```

### 2.2 O que existe vs. stub

| Item | Estado | Classificação |
|------|--------|---------------|
| CRUD Plant com `distributor` / `consumerUnit` | Ativo (API + Web) | **ATIVO / LEGADO textual** |
| Role `CONSUMIDOR` | Permissions + Authorization | **ATIVO (autorização)** — não é entidade Consumer |
| Pastas `energy/`, `units/`, `integrations/distributors/` | Só README | **STUB / DOCUMENTAÇÃO** |
| `homologation/distributors` | Só README | **STUB** |
| Billing / Charge / Invoice / Rateio / Credit | Ausente | **NÃO UTILIZADO / NÃO EXISTE** |
| Entidades Consumer, ConsumerUnit, Distributor | Ausente | **NÃO EXISTE** |

### 2.3 Ocorrências relevantes (árvore raiz)

| Área | Arquivo | Uso | Classificação |
|------|---------|-----|---------------|
| Schema | `apps/api/prisma/schema.prisma` | `distributor`, `consumerUnit` em Plant | **ATIVO/LEGADO** |
| Migration | `20260904014107_initial_schema` | Colunas TEXT | **LEGADO** |
| DTO | `common/dto.ts` | Create obrigatório; Update opcional | **ATIVO** |
| Service | `plants.service.ts` | create/update trim | **ATIVO** |
| Spec | `plants.service.spec.ts` | Fixture `'123'` / `'ENEL'` | **TESTE** |
| Seed | `seed.ts` | `'000000000'` / `'ENEL'` | **TESTE/SEED** |
| Web lista | `usinas/page.tsx` | Coluna + form + busca | **ATIVO** |
| Web detalhe | `usinas/[id]/page.tsx` | “UC …” + Concessionária | **ATIVO** |
| Auth | `permissions.catalog.ts` | Role CONSUMIDOR | **ATIVO** |
| Auth | `authorization.service.ts` | Scope Customer/Plant | **ATIVO** |
| Docs | `domain-*`, auditoria legado | Spec | **DOCUMENTAÇÃO** |
| Monitoring / AUXSOL / Alerts | — | Sem referência a UC/distributor | **NÃO UTILIZADO** nestes campos |

### 2.4 Divergências DOC × CÓDIGO

| Afirmação em docs | Código real | Status |
|-------------------|-------------|--------|
| `Plant.consumerUnit` é stub ≠ entidade UC | Confirmado | **Alinhado** |
| Customer endereço parcial | Schema tem `address/city/state`; módulo customers **não** referencia esses campos no CRUD auditado | **Alinhado (parcial)** |
| Multi-tenant com `tenantId` | **Campo `tenantId` NÃO EXISTE** no Prisma; “tenant” = comentário em `AccessScope.unrestricted` + Customer como conta | **Divergência de vocabulário** (docs de sprint falam `tenantId`; código usa Customer scope) |
| V2.2: Consumer↔UC “confiança baixa / PO” | `domain-uc-d3.md` + decisões congeladas: 1 UC→1 titular (alto); 1 Consumer→N UCs (médio–alto) | **Evolução documental** — D3 posterior a V2.2 |
| V2.1: “UC geradora/OC” ambíguo | `domain-uc-d3.md`: OC = Orçamento de Conexão ≠ UC | **Correção conceitual em D3** — V2.1 permanece desatualizado neste ponto |
| baseline: 7 migrations | Há **8** migrations (incl. `20260908230000_user_membership_identity`) | **Divergência menor** (baseline desatualizado) |

---

## 3. Estado Atual do Prisma

### 3.1 Modelos existentes (relevantes)

| Modelo | Papel atual |
|--------|-------------|
| `User` | Identidade de login + role + `customerId?` |
| `Customer` | Conta operacional; dono de `Plant[]`; scope de membership |
| `UserMembership` | Role + scope Customer e/ou Plant |
| `Plant` | Ativo O&M; âncora de monitoramento |
| `Inverter` / `Equipment` | Equipamentos da usina |
| `MonitoringReading` | Telemetria (kW / kWh) |
| `Alert` / `AlertEvent` | Alertas O&M |
| `Integration` / `IntegrationBinding` | Integrações de fabricante (ex.: AUXSOL) |
| `InverterManufacturer` | Catálogo fabricantes |

### 3.2 Campos relacionados a UC / Distribuidora / Consumer

| Modelo | Campo | Tipo | Nullable | Default | Unique | Index | FK | Migration |
|--------|-------|------|----------|---------|--------|-------|-----|-----------|
| Plant | `distributor` | String? / TEXT | Sim | Nenhum | Não | Não | Não | `20260904014107_initial_schema` |
| Plant | `consumerUnit` | String? / TEXT | Sim | Nenhum | Não | Não | Não | idem |
| Customer | `document` | String? | Sim | Nenhum | Sim | Não | Não | initial |
| Customer | `address` / `city` / `state` | String? | Sim | Nenhum | Não | Não | Não | initial |
| Plant | `address` / lat / lng | String?/Decimal? | Sim | Nenhum | Não | Não | Não | initial |
| User | `role` incl. `CONSUMIDOR` | enum | — | OPERATOR | — | — | — | profiles + membership |
| — | Consumer / Distributor / UC | — | — | — | — | — | — | **NÃO EXISTE** |

**Nenhuma** migration posterior alterou `distributor` ou `consumerUnit`.

### 3.3 Inconsistência aplicação × schema

- Banco: `consumerUnit` e `distributor` **nullable**
- `CreatePlantDto`: ambos **obrigatórios** (`@IsNotEmpty`)
- Na prática, UI/API preenchida grava string (após `.trim()`)

---

## 4. Entidades Existentes

### Matriz “quem é quem” (hoje)

| Entidade | Representa hoje | É pessoa? | É empresa? | É unidade física? | É identidade de acesso? | É entidade comercial? |
|----------|-----------------|-----------|------------|-------------------|-------------------------|-----------------------|
| **User** | Login + role | Pode ser | Pode ser (conta) | Não | **Sim** | Não |
| **Customer** | Conta operacional dona de usinas | Pode (PF) | Pode (PJ) | Não | Âncora de scope | Conta operacional (não Consumer) |
| **Plant** | Usina / ativo O&M de geração | Não | Não | **Sim** (ativo) | Scope via membership | Âncora operacional; titularidade jurídica **não modelada** |
| **Inverter / Equipment** | Equipamento | Não | Não | Sim | Não | Não |
| **UserMembership** | Vínculo role+scope | Não | Não | Não | **Sim** (autorização) | Não |
| **IntegrationBinding** | Ligação fabricante↔inversor | Não | Não | Não | Não | Não |
| **MonitoringReading** | Telemetria | Não | Não | Não | Não | Não |
| **Alert** | Evento O&M | Não | Não | Não | Não | Não |

**Não existem hoje:** Consumer, ConsumerUnit (UC), Distributor, Rateio, Credit, Billing.

---

## 5. Entidades Futuras

| Entidade futura | Domínio | Representa | Não confundir com |
|-----------------|---------|------------|-------------------|
| **Consumer** | Energy Management / cadastro energético | Titular/consumidor de negócio alinhado ao conceito regulatório de consumidor | Customer, User, role CONSUMIDOR |
| **ConsumerUnit (UC)** | Energy Management | Instalação com ponto de conexão, medição, um titular, perante distribuidora | Plant, Customer, User, `Plant.consumerUnit` string |
| **Distributor** | Cadastro energético / faturas | Concessionária de energia | `Plant.distributor` string; adapter de integração |
| **Rateio / EnergyAllocation** (fora desta sprint) | Energy Management | Alocação versionada Plant ↔ UC | Crédito; regra comercial B7 |
| **Consumer-generator** | — | **Não criar entidade** — papel do titular de UC com MMGD | — |
| **Organization** | — | **Não criar agora** sem decisão PO | — |
| **Association/Consortium** | — | **Não implementar agora** | — |

### Definição conceitual de UC (B7)

Com base em `domain-uc-d3.md` + REN 1.000 (referência documental do projeto):

| Dimensão | Conteúdo |
|----------|----------|
| **Identidade** | Unidade perante a distribuidora (ponto de conexão + medição individualizada) |
| **Titular** | Um único Consumer (titularidade regulatória) |
| **Consumer** | 1 Consumer → N UCs (mesmo titular, várias unidades) |
| **Plant** | Independente; vínculo energético via Rateio (não FK obrigatória 1:1) |
| **Distributor** | UC pertence a uma distribuidora (identificadores no escopo da distribuidora) |
| **ID regulatório** | Número/código da UC na distribuidora (+ possíveis IDs auxiliares — ver §10) |
| **Endereço** | Próprio da UC (imóvel/contíguos) — ver §11 |
| **Status** | Camadas distintas — ver §12 |
| **Histórico** | Necessário para titularidade, distribuidora, identificadores e participação em rateio |

**Separação de conceitos:**

| Camada | UC significa |
|--------|--------------|
| Regulatório | Instalação + medição + um consumidor (REN) |
| Operacional B7 | Entidade de Gestão de Energia (consumo/compensação/crédito/fatura distribuidora) |
| Comercial B7 | Pode ser beneficiária de produto B7; **≠** Charge/Payment |

---

## 6. Customer × Consumer × User

### Matriz proposta (futuro)

| Entidade | Representa | É pessoa? | É empresa? | É unidade física? | É identidade de acesso? | É entidade comercial? |
|----------|------------|-----------|------------|-------------------|-------------------------|-----------------------|
| **User** | Login no sistema | Sim (humano) | Não | Não | **Sim** | Não |
| **Customer** | Conta operacional B7 (dona de Plant hoje) | Pode | Pode | Não | Scope atual | Conta operacional |
| **Consumer** | Titular/consumidor energético (negócio) | Pode (PF) | Pode (PJ) | Não | Não (acesso via User) | Sim (relação energética) |
| **Plant** | Central geradora / ativo O&M | Não | Não | **Sim** | Scope | Âncora operacional |
| **UC** | Unidade consumidora | Não | Não | **Sim** (instalação) | Não (acesso via membership futuro) | Âncora energética |
| **Distributor** | Concessionária | Não | **Sim** (PJ) | Não (rede) | Não | Contraparte regulatória |

### Separações obrigatórias

```
User (acesso)
  ≠ Customer (conta operacional / dona de Plant)
  ≠ Consumer (titular energético)
  ≠ UC (instalação)
  ≠ Plant (usina O&M)
```

| Vínculo | Status proposto |
|---------|-----------------|
| User ↔ Consumer | Via membership/portal futuro; **não** 1:1 obrigatório automático |
| Customer ↔ Consumer | **Podem coexistir sem vínculo** (D3.13) — Customer não é Consumer |
| Customer ↔ Plant | Existe hoje (`Plant.customerId`) — preservar |
| Consumer ↔ UC | Titularidade 1:N — ver §7 |

**PENDENTE DE DECISÃO DO PO:** se algum produto B7 exige “beneficiário comercial ≠ titular regulatório”.

---

## 7. Consumer × UC

### Cardinalidades propostas

| Relação | Cardinalidade | Confiança | Base |
|---------|---------------|-----------|------|
| 1 UC → 1 titular (Consumer) | **1 : 1** (titularidade) | **Alta** | REN: UC pertence a um único consumidor; decisões congeladas |
| 1 Consumer → N UCs | **1 : N** | **Média–Alta** | Autoconsumo remoto; decisão congelada #30 |
| N Consumers → 1 UC | **Não adotar** | Alta (contra) | Incompatível com definição REN, salvo figura especial não modelada |

### Separar quatro dimensões

| Dimensão | Significado | Quem carrega |
|----------|-------------|--------------|
| **Titularidade** | Quem assume obrigações perante a distribuidora | Consumer ↔ UC |
| **Acesso ao sistema** | Quem faz login e vê dados | User + Membership |
| **Benefício energético** | UC participante do SCEE / rateio | UC ↔ Rateio ↔ Plant |
| **Relacionamento comercial** | Contrato/produto B7 | Customer / contratos futuros — **≠** titularidade automática |

**Não assumir** `1 Customer → N Consumers` nem `1 Consumer → 1 Customer` sem decisão PO.

---

## 8. Plant × UC

### Hipótese auditada

```
Plant (Usina)
   ↕
Rateio (versionado, histórico)   ← NÃO implementar nesta sprint
   ↕
UC(s)
```

### Avaliação por modalidade

| Modalidade | Plant × UC | Status |
|------------|------------|--------|
| Autoconsumo local | Tipicamente 1 Plant ↔ 1 UC (mesma UC com MMGD) | Conceito documentado |
| Autoconsumo remoto | 1 Plant → N UCs (mesmo titular; mesma distribuidora) | Conceito documentado |
| Geração compartilhada | 1 Plant → N UCs (titulares diversos; estrutura jurídica) | **VALIDAÇÃO REGULATÓRIA** + Association **adiada** |
| Múltiplas UCs (empreendimento) | Várias UCs + UC de áreas comuns | **PENDENTE DE VALIDAÇÃO** |
| 1 UC → N Plants | Possível via rateios de várias usinas | Hipótese; **PENDENTE DE DECISÃO DO PO** se produto B7 exige |
| UC sem participar de rateio | UC cadastral pura (só fatura/consumo) | Deve ser suportável |
| Plant sem UC | Monitoramento-only | Já ocorre hoje (só string legado) |

### Recomendação (proposta, não aprovada)

- **Plant e UC são independentes** (D3.6).
- Relação energética **N:N mediada por Rateio versionado** (D3.7) — confiança **média–alta**.
- Modelar “UC com MMGD” (conexão da geração) **além** das participantes no MVP: **PENDENTE DE DECISÃO DO PO** (`domain-uc-d3.md` P2).

**Não colocar** percentual de rateio, crédito ou compensação como atributos embutidos em `Plant`.

---

## 9. UC × Distributor

### Proposta conceitual

```
Distributor (1)
     │
     │ atende (vigente)
     ▼
ConsumerUnit (N)
```

| Pergunta | Resposta proposta | Confiança |
|----------|-------------------|-----------|
| UC pertence a uma distribuidora? | **Sim** (FK vigente) | Alta (operacional/regulatório típico) |
| Pode mudar de distribuidora? | Possível em cenários excepcionais (troca de área/concessão) | **PENDENTE** — se histórico necessário |
| Histórico de distribuidora? | Recomendado se mudança for realista; senão vigência simples | **PENDENTE DE DECISÃO DO PO** (D3.9) |
| Número da UC pertence à distribuidora? | **Sim** — unicidade tipicamente **no escopo da distribuidora** | Alta |
| IDs adicionais? | Instalação, medidor, código cliente — ver §10 | Parcial / PENDENTE |
| Identidade da UC no B7 | `id` interno + (`distributorId` + `unitNumber`) como chave de negócio candidata | Proposta |

### Separação obrigatória

```
DADOS CADASTRAIS DA DISTRIBUIDORA
  ≠
CONFIGURAÇÃO DE INTEGRAÇÃO (adapter, secretRef, portal, polling)
```

Não criar entidade de integração de distribuidora nesta especificação (alinhar futuro ao padrão IntegrationBinding/Engine).

---

## 10. Identificadores da UC

| Nome | Significado | Origem | Unicidade | Escopo | Histórico | Observações |
|------|-------------|--------|-----------|--------|-----------|-------------|
| `id` (B7) | PK interna | B7 | Global | Sistema | N/A | Sempre |
| Número / código da UC | Identificação perante distribuidora | Distribuidora / cadastro | Tipicamente única **por distribuidora** | Distributor | Desejável se reemissão | Candidato principal; **não** = `Plant.consumerUnit` automaticamente |
| Código do cliente na distribuidora | Conta do consumidor no portal/faturamento | Distribuidora | Por distribuidora | Distributor + Consumer | **PENDENTE** | ≠ número da UC |
| Número de instalação | Termo usado por algumas concessionárias | Distribuidora | **PENDENTE** | Distributor | **PENDENTE** | Pode coincidir ou não com “UC” |
| Número de medição / medidor | Ponto de medição | Distribuidora | **PENDENTE** | UC | **PENDENTE** | Pode mudar com troca de medidor |
| Identificador externo genérico | Integração / importação | Adapter | Por provider | Integração | Sim | Separar de cadastro |
| `Plant.consumerUnit` (legado) | Texto livre na usina | Operação B7 / UI | Sem unique | Plant | Não | **Ambíguo** — não usar como ID oficial da entidade UC |

**IMPORTANTE:** não assumir que “instalação”, “UC”, “código cliente” e “medidor” são a mesma coisa. Onde faltar evidência: **PENDENTE**.

---

## 11. Endereço

| Entidade | Tem endereço hoje? | Papel futuro |
|----------|--------------------|--------------|
| Customer | Schema sim (`address/city/state`); CRUD incompleto | Contato/conta — **não** substitui endereço da UC |
| Plant | `address` + lat/lng | Localização do ativo de geração |
| UC | Não existe | **Deve ter endereço próprio** (definição REN: imóvel/contíguos) |

| Pergunta | Resposta proposta |
|----------|-------------------|
| UC possui endereço próprio? | **Sim** (recomendado) |
| Pode diferir do endereço da Plant? | **Sim** (autoconsumo remoto / compartilhada) |
| Pode diferir do Customer? | **Sim** |
| Snapshot histórico? | Recomendado se endereço afetar faturamento/auditoria — **PENDENTE DE DECISÃO DO PO** |

---

## 12. Status

**Não criar enum nesta sprint.** Camadas conceituais justificáveis:

| Camada | Exemplos conceituais | Domínio |
|--------|----------------------|---------|
| Cadastral | ACTIVE / INACTIVE no B7 | Cadastro |
| Conexão | Conectada / em homologação / desligada | Regulatório/operacional — **VALIDAÇÃO REGULATÓRIA** |
| Energético | Participante SCEE / com MMGD / só consumo | Energy Management |
| Comercial | Contrato B7 ativo / suspenso | Billing futuro — não misturar com conexão |
| Integração | Sync OK / erro / sem integração | Integração distribuidora (futuro) |

`PlantStatus` (ACTIVE/INACTIVE/WARNING/OFFLINE) permanece **somente O&M** — não reutilizar como status de UC.

---

## 13. Plant.consumerUnit — Auditoria

Reconfirmação da auditoria legada (`plant-consumer-unit-legacy-audit.md`):

| Aspecto | Conclusão |
|---------|-----------|
| Onde é usado | CRUD Plant (API/DTO/service), Web usinas lista/detalhe/busca, seed, spec |
| Quem lê | PlantsService findAll/findOne; frontend |
| Quem grava | create/update PlantsService; seed |
| Significado atual | Texto cadastral rotulado “UC” — **ambíguo** (geradora? beneficiária? instalação?) |
| Dependências | Formulários e dados existentes; **nenhuma** em monitoring/auth/integração |
| Risco de remoção | **Alto** (quebra UI/API/dados) |
| Fallback para entidade UC? | **Não recomendado** como fonte automática |
| Tratamento | **Continuar somente como legado** até decisão formal de migração |

**Proibido nesta e nas próximas sprints sem PO:** remover, renomear, virar FK, backfill automático, fundar Rateio/Crédito nesse campo.

`Plant.distributor` segue o mesmo padrão legado (string ≠ entidade Distributor).

---

## 14. Multi-tenancy

### Estado atual

- **Não há** coluna `tenantId` no Prisma.
- Isolamento prático:
  - Staff (`unrestricted: true`) vê tudo
  - Demais roles: escopo por `Customer` e/ou `Plant` via `User.customerId` + `UserMembership`
- `Customer` funciona como **conta operacional**, não como Organization/Tenant formal.

### Proposta futura (sem implementar Organization)

| Entidade | Tenancy proposto |
|----------|------------------|
| Plant | Continua sob `Customer` (dono operacional) |
| Distributor | Cadastro global do operador B7 **ou** por Customer — **PENDENTE DE DECISÃO DO PO** (catálogo compartilhado vs. por conta) |
| Consumer | Provável vínculo a Customer **ou** contexto B7 — **PENDENTE** (podem coexistir sem vínculo — D3.13) |
| UC | Seguir o mesmo contexto do Consumer + Distributor; nunca “solta” entre contas sem regra |

**Não criar Organization nesta sprint.**

---

## 15. Autorização

### Hoje

```
User → role (JWT) + UserMembership(scope: Customer | Plant)
AuthorizationService → AccessScope → buildPlantWhere
MonitoringAccessService → delega AuthorizationService
```

Role `CONSUMIDOR`: permissões de portal (`DASHBOARD_VIEW`, `MONITORING_VIEW`) + scope por membership — **não** implica entidade Consumer.

### Evolução futura (somente especificação)

```
User → Membership → role + scope(Customer | Plant | UC? | Consumer?)
```

| Item | Status |
|------|--------|
| Scope por UC | Possível extensão (V2.1 D15) — **após** entidade UC |
| Risco | Misturar titularidade UC com login; JWT inchado (já evitado) |
| Ação nesta sprint | **Nenhuma** — não alterar AuthorizationService nem permissions |

---

## 16. Compatibilidade com Monitoring

### Regra desejada

```
Monitoring     → Plant / Inverter / Equipment / Reading / Alert / Binding
Energy Mgmt    → Plant / UC / Consumer / Rateio / Crédito (futuro)
```

### Evidência

| Dependência UC → Monitoring? | Resultado |
|------------------------------|-----------|
| MonitoringReading usa UC? | **Não** |
| Alert usa UC? | **Não** |
| IntegrationBinding usa UC? | **Não** |
| Inverter/Equipment usam UC? | **Não** |
| Campos `consumerUnit`/`distributor` no pipeline? | **Não** |

**Conclusão:** futura UC **não deve** ter FK obrigatória para readings/alerts. Plant permanece âncora O&M. Nenhuma contradição estrutural encontrada no código atual.

---

## 17. Compatibilidade com Energy Management

Energy Management futuro deve consumir:

| Conceito | Fonte candidata |
|----------|-----------------|
| Geração observada | Agregações de `MonitoringReading` (input) — sem misturar com crédito |
| Consumo | Fatura/distribuidora / medição UC — **não** telemetria de inversor |
| Compensação / crédito | Ledger energético futuro — **VALIDAÇÃO REGULATÓRIA** |
| Alocação | Rateio Plant↔UC |
| Titularidade | Consumer↔UC |
| Concessionária | Distributor↔UC |

Pastas `apps/api/src/modules/energy/` e `units/` = README only.

---

## 18. Compatibilidade com Rateio

Dados conceituais que a UC precisará expor ao Rateio futuro:

| Dado | Papel |
|------|-------|
| `ucId` | Destino (e eventualmente origem se UC com MMGD) |
| `plantId` | Origem da geração alocada |
| Percentual / ordem / prioridade | Regra de alocação |
| Vigência (início/fim) | Versionamento |
| Histórico | Refazer rateio / auditoria (Lei 14.300 art. 12 §4º — referência doc) |
| Papel da UC | Com MMGD / participante / só cadastral |

**Não criar Rateio nesta sprint.**

UC sem rateio deve permanecer válida (cenário 9 / UC só consumo).

---

## 19. Compatibilidade com Billing

Informações de UC provavelmente necessárias **no futuro** (sem implementar Billing):

| Uso futuro | Dado de UC / relacionados |
|------------|---------------------------|
| Fatura da distribuidora | `ucId`, Distributor, identificadores, ciclo, endereço |
| Consumo / compensação / créditos / saldo mensal | Apuração por UC (Energy Management) |
| Remuneração / cobrança B7 | Regras comerciais sobre balanço — **≠** fatura distribuidora |
| Titular para cobrança | Consumer (e/ou Customer) — **PENDENTE** modelo comercial |

**Não criar** Charge, Payment, DistributorInvoice nesta sprint.

---

## 20. Cenários

| # | Cenário | Entidades | Cardinalidade | Suportado hoje? | Depende decisão futura? | Risco |
|---|---------|-----------|---------------|-----------------|-------------------------|-------|
| 1 | Usina + UC própria | Plant, UC, Consumer, Distributor | 1 Plant ↔ 1 UC (via rateio N=1) | Só string legado | Sim (entidades) | Médio — confundir string com UC |
| 2 | Usina + várias UCs beneficiárias | Plant, Rateio, N UC | 1 Plant → N UC | Não | Sim (Rateio) | Alto se modelar 1:1 rígido |
| 3 | UC recebe de uma usina | UC, Rateio, Plant | 1 UC ← 1 Plant | Não | Sim | Médio |
| 4 | UC recebe de várias usinas | UC, Rateio, N Plant | 1 UC ← N Plant | Não | **PO** se produto exige | Médio–Alto |
| 5 | Consumer com várias UCs | Consumer, N UC | 1:N | Não | Decisão congelada favorece sim | Baixo se modelado |
| 6 | Customer sem ser Consumer | Customer, Plant | — | **Sim** (já é o caso) | Manter separação | Alto se fundir conceitos |
| 7 | Consumer sem Customer | Consumer, UC | — | N/A | **PO** (D3.13) | Médio (tenancy) |
| 8 | Plant sem UC cadastrada | Plant | — | **Sim** (O&M) | Aceitar no MVP energético? **PO** | Baixo O&M; médio Energy |
| 9 | UC sem Plant | UC, Consumer, Distributor | — | N/A | Sim — UC cadastral pura | Médio se exigir Plant FK |
| 10 | UC muda de distribuidora | UC, Distributor, histórico? | 1 vigente | N/A | **PO** + regulatório | Médio |

---

## 21. Modelo Conceitual Proposto

**Status: PROPOSTA PARA APROVAÇÃO DO PRODUCT OWNER** — não é decisão final.

```
                    User (acesso)
                       │
                 UserMembership
                 (Customer|Plant|UC? futuro)

Customer (conta operacional)
   │
   └── Plant (O&M / central geradora operacional)
          │
          ├── Monitoring / Inverter / Alert / Binding   ← domínio protegido
          ├── distributor String / consumerUnit String ← LEGADO
          │
          └── participação energética
                 │
               Rateio (futuro, versionado, histórico)
                 │
                 ▼
            ConsumerUnit (UC)
                 │
                 ├── Distributor (vigente)
                 │
                 └── titularidade
                        │
                        ▼
                     Consumer
```

Princípios:

1. Monitoring não atravessa UC.
2. Rateio medeia Plant ↔ UC (N:N).
3. Consumer ≠ Customer ≠ User.
4. Distributor dados ≠ integração.
5. Crédito/compensação/fatura/cobrança B7 ficam em camadas posteriores.

---

## 22. Decisões D3/D4

| ID | Decisão | Recomendação | Confiança | Precisa PO? |
|----|---------|--------------|-----------|-------------|
| D3.1 | UC é entidade própria? | **Sim** | Alta | Confirmar |
| D3.2 | Consumer é entidade própria? | **Sim** (≠ Customer/User) | Alta | Confirmar |
| D3.3 | Distributor é entidade própria? | **Sim** (≠ string Plant) | Alta | Confirmar |
| D3.4 | 1 UC possui 1 titular? | **Sim** | Alta | Confirmar |
| D3.5 | 1 Consumer pode possuir N UCs? | **Sim** | Média–Alta | Confirmar |
| D3.6 | Plant e UC independentes? | **Sim** | Alta | Confirmar |
| D3.7 | Plant ↔ UC N:N via Rateio? | **Sim** (hipótese de trabalho) | Média–Alta | Confirmar |
| D3.8 | UC possui Distributor? | **Sim** (FK vigente) | Alta | Confirmar |
| D3.9 | Distributor precisa histórico na UC? | Recomendado se mudança for real; senão vigência simples | Baixa–Média | **Sim** |
| D3.10 | `Plant.consumerUnit` permanece legado? | **Sim** — preservar; sem migração automática | Alta | Confirmar estratégia futura |
| D3.11 | UC possui endereço próprio? | **Sim** | Alta | Confirmar |
| D3.12 | UC precisa IDs externos versionáveis? | **Sim** para número UC; demais **PENDENTE** | Média | **Sim** (lista mínima MVP) |
| D3.13 | Customer e Consumer sem vínculo? | **Permitir coexistência sem vínculo obrigatório** | Média | **Sim** |
| D3.14 | Membership futuro com escopo UC? | **Sim, depois da entidade** — não agora | Alta (extensão) | Quando houver UC |
| D3.15 | Quais dependem de validação regulatória? | Modalidades SCEE detalhadas; GD I/II; crédito; geração compartilhada/associação; beneficiário ≠ titular; troca de distribuidora; classe tarifária | — | **Sim + especialista** |

---

## 23. Matriz de Riscos

| Risco | Nível | Mitigação proposta |
|-------|-------|-------------------|
| Confundir Customer com Consumer | **ALTO** | Entidades separadas; docs e naming rígidos |
| Usar `Plant.consumerUnit` como UC | **ALTO** | Legado explícito; sem FK automática |
| Colocar regra de energia dentro de Plant | **ALTO** | Rateio/crédito fora de Plant |
| Relação errada Plant × UC (1:1 rígido) | **ALTO** | N:N via Rateio desde o desenho |
| Não preservar histórico de rateio/titularidade | **ALTO** | Versionar Rateio; titularidade com vigência |
| Misturar Distributor com integração | **MÉDIO** | Cadastro ≠ adapter/secretRef |
| Misturar UC com acesso (User) | **MÉDIO** | Membership scope; Role ≠ entidade |
| Misturar UC com crédito | **ALTO** | Ledger separado |
| Misturar geração (kW/kWh telemetria) com compensação | **ALTO** | Domínios Monitoring ≠ Energy |
| Quebrar monitoramento existente | **ALTO** | Não alterar pipeline O&M / AUXSOL |
| Quebrar multi-tenancy / escopo Customer | **MÉDIO** | Novas entidades com regra de contexto explícita |
| Inventar regra ANEEL no software | **ALTO** | Marcar VALIDAÇÃO REGULATÓRIA |

---

## 24. Impacto Futuro no Prisma

**Nenhuma migration nesta sprint.** Previsão para sprints futuras:

| Mudança provável | Segurança | Dados / backfill | Compatibilidade |
|------------------|-----------|------------------|-----------------|
| Tabela `Distributor` | **Segura** (additive) | Seed catálogo; mapear strings `Plant.distributor` opcional depois | Manter string legado |
| Tabela `Consumer` | **Segura** (additive) | Sem backfill automático de Customer | Sem FK obrigatória Customer |
| Tabela `ConsumerUnit` | **Segura** se additive | **Não** backfill de `Plant.consumerUnit` sem regra PO | String legado permanece |
| FK UC → Distributor | Segura após Distributor | — | — |
| FK UC → Consumer (titular) | Segura | — | — |
| Tabela Rateio / Allocation + histórico | Média complexidade | Sem dados legados | Não tocar Monitoring |
| Remover `Plant.consumerUnit` | **INSEGURA / NÃO FAZER AINDA** | Exige inventário DB + UI | Compatibilidade longa |
| Transformar `consumerUnit` em FK | **INSEGURA agora** | Ambiguidades de significado | Proibido até PO |
| `tenantId` global | **NÃO FAZER** sem decisão Organization | — | — |
| Extensão UserMembership (ucId) | Additive depois | — | Preservar scopeKey |

---

## 25. Pendências Regulatórias

Marcar como **VALIDAÇÃO REGULATÓRIA NECESSÁRIA**:

1. Detalhamento GD I / GD II e postos tarifários no produto B7  
2. Regras de crédito (expiração, prioridade, ordem de uso)  
3. Geração compartilhada e figuras associação/consórcio/cooperativa (entidades adiadas)  
4. Autoconsumo remoto — restrição “mesma distribuidora” no modelo de dados  
5. Casos em que “beneficiário comercial” ≠ titular da UC  
6. Obrigatoriedade de cadastrar “UC com MMGD” além das participantes no MVP  
7. Troca de distribuidora / histórico  
8. Semântica exata de instalação vs. UC vs. medidor **por distribuidora**  
9. Classe/subgrupo tarifário (B1/B2/…) como atributo de UC  

**Não implementar regra jurídica/comercial nesta sprint.**

---

## 26. Próxima Sprint Recomendada

### Não fazer ainda

- Credit Engine, Compensation, MonthlyBalance, Billing, Charge, Payment  
- Association/Consortium, Organization  
- Migrar/apagar `Plant.consumerUnit` / `Plant.distributor`  
- Alterar Monitoring / AUXSOL / Authorization

### Pré-requisitos com o PO (checklist)

1. [ ] Aprovar modelo conceitual §21  
2. [ ] Confirmar D3.1–D3.14 (tabela §22)  
3. [ ] Declarar significado operacional real de `Plant.consumerUnit`  
4. [ ] Decidir se MVP exige “UC com MMGD” obrigatória  
5. [ ] Decidir lista mínima de identificadores da UC  
6. [ ] Decidir se Distributor é catálogo global B7 ou por Customer  
7. [ ] Confirmar se Cenário 4 (1 UC ← N Plants) entra no MVP  

### Sprint seguinte sugerida (após aprovação)

**Cadastro Energético Mínimo (somente após PO):**

1. `Distributor` (cadastro; sem integração)  
2. `Consumer` (cadastro; sem portal)  
3. `ConsumerUnit` (cadastro + FK Distributor + titular Consumer)  
4. Relação Plant ↔ UC via **Rateio versionado** (mínimo)  
5. Preservar legado Plant strings + Monitoring intacto  

Até a aprovação do Product Owner: **não implementar**.

---

## Checklist de aceite desta sprint

- [x] Código não alterado  
- [x] Prisma não alterado  
- [x] Banco não alterado  
- [x] Migrations não criadas  
- [x] Frontend não alterado  
- [x] APIs não alteradas  
- [x] Monitoramento não alterado  
- [x] AUXSOL não alterada  
- [x] Auditoria atual  
- [x] Entidades atuais e futuras  
- [x] Matriz Customer/User/Consumer/Plant/UC/Distributor  
- [x] Cardinalidades Consumer×UC e Plant×UC  
- [x] Relação UC×Distributor  
- [x] Análise Plant.consumerUnit  
- [x] Identificadores, endereço, status  
- [x] Multi-tenancy e autorização futura  
- [x] Compatibilidade Monitoring / Energy / Rateio / Billing  
- [x] Cenários 1–10  
- [x] Decisões D3/D4, riscos, impacto Prisma  
- [x] Pendências regulatórias e próximos passos  

---

*Fim — Auditoria Domínio 4 (D3/D4). Aguardar aprovação do Product Owner.*
