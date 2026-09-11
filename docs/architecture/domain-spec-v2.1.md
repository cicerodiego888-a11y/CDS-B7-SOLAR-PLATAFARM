# B7 Solar Plataforma de Gestão
# Especificação Funcional e Modelo Conceitual V2.1

**Status do documento:** proposta oficial para revisão do Product Owner  
**Data-base:** pós Sprint 17 (baseline) + Sprint 18 (Identity & Authorization)  
**Escopo:** especificação apenas — **nenhuma entidade, migration, API ou tela foi criada nesta etapa**

---

## 0. Fontes e método

### Fontes confirmadas no repositório

| Fonte | Uso |
|-------|-----|
| Código árvore raiz `B7-Solar-Platform-exe` | Fonte de verdade do que **existe** |
| `apps/api/prisma/schema.prisma` | Modelos reais |
| `docs/architecture/baseline-v2.md` | Baseline técnico V2 |
| `docs/architecture/identity-authorization.md` | Fundação Role ≠ Scope (Sprint 18) |
| `docs/architecture/overview.md` | Núcleo Monitoramento |
| `docs/implementation-status.md` | O que está / não está implementado |
| DTOs/services `Customer` / `Plant` | Campos e responsabilidades atuais |
| `AuthorizationService` / `MonitoringAccessService` | Autorização e escopo atuais |

### Referência funcional externa (não-oficial B7)

- Reunião / análise do sistema **Lumi** (norte funcional discutido com o Product Owner na auditoria arquitetural V2).
- Conceitos observados: usina com titular/associação/consórcio, consumidor/UC, rateio percentual, geração própria, balanço mensal, fatura da distribuidora ≠ cobrança B7, portais investidor/consumidor, inadimplência.

**Arquivo `Apresentação Plataforma Lumi - 2026.pdf`:** **NÃO ENCONTRADO NO REPOSITÓRIO** nesta inspeção. Prints/PDF não estão versionados em `docs/` nem na árvore raiz. Conceitos Lumi abaixo vêm do **contexto de reunião/auditoria** fornecido ao time — tratados **somente como referência funcional**, nunca como arquitetura oficial do B7.

### Método

1. Separar o que **existe no código** do que é **conceito futuro**.
2. Não inventar regra regulatória.
3. Marcar inferências e decisões pendentes explicitamente.
4. Preservar patrimônio: Monitoramento + Identity V2.

---

## 1. Princípio fundamental — separação de domínios

| Domínio | Pergunta que responde | Exemplos |
|---------|----------------------|----------|
| **Monitoramento** | Como a usina/equipamento está operando e quanto está produzindo **agora / no histórico de telemetria**? | `MonitoringReading`, alertas, disponibilidade, AUXSOL |
| **Gestão de Energia** | O que acontece com geração, consumo, alocação, compensação e créditos? | UC, rateio, crédito, balanço energético |
| **Faturas (Distribuidora)** | Quais documentos/dados a distribuidora emitiu? | Fatura UC/usina, aquisição, inconsistência |
| **Faturamento B7** | Quanto deve ser cobrado segundo regras comerciais/energéticas B7? | Demonstrativo, cálculo, regra de remuneração |
| **Cobrança** | Emissão, envio, pagamento, vencimento, inadimplência? | Charge, Payment, Delinquency |
| **CRM / Pós-venda** | Relacionamento, atendimento, jornada comercial? | Leads, tickets (hoje só README) |

**Regra:** não misturar esses domínios em uma única tabela “Plant/Customer faz tudo”.

---

## 2. Estado real do domínio hoje (código)

### 2.1 Grafo confirmado

```
Customer
  └── Plant
        ├── Inverter / Equipment
        ├── MonitoringReading
        ├── Alert / AlertEvent
        └── IntegrationBinding → IntegrationEngine → Redis/BullMQ

User
  ├── role (+ permissions)
  ├── customerId? (legado)
  └── UserMembership[] (Sprint 18)
        ├── customer scope?
        └── plant scope?
```

### 2.2 Stubs perigosos já no schema (não são entidades)

| Campo atual | Local | Interpretação correta |
|-------------|-------|------------------------|
| `Plant.distributor` | `String?` | Stub textual de concessionária — **não** é Distribuidora |
| `Plant.consumerUnit` | `String?` | Stub textual — **não** é UC |
| `Customer` | conta dona de plants | **não** é Consumidor Lumi nem Organização formal |

### 2.3 O que NÃO existe no código

Consumer, Investor (entidade), Distributor, UC, Association, Consortium, Rateio, Credit, Compensation, MonthlyBalance, DistributorInvoice, Billing, Charge, Payment, Delinquency, Organization/Tenant.

Pastas `energy/`, `units/`, `crm/`, `integrations/distributors/` = **DOCUMENTADO, MAS NÃO CONFIRMADO NO CÓDIGO** (README only).

---

## 3. Customer (análise do modelo atual)

### 3.1 O que Customer é hoje

Confirmado no Prisma + `CustomersService`:

- Conta cadastral (`name`, `document` CPF/CNPJ, `email`, `phone`, `status`)
- Dono de `Plant[]`
- Âncora opcional de `User.customerId` (portal legado `CUSTOMER`)
- Alvo de `UserMembership.customerId` (scope organizacional frágil)

Campos `address` / `city` / `state` existem no schema; create/update DTO **não** os grava de forma completa → **PARCIALMENTE IMPLEMENTADO**.

### 3.2 O que Customer NÃO deve absorver

Não usar Customer como:

- Consumidor beneficiário de UC
- Titular jurídico da usina (sem formalização)
- Associação / Consórcio
- Distribuidora
- Investidor
- “Organização multi-tenant completa” sem decisão explícita

### 3.3 Evolução compatível (sem migration nesta etapa)

**Decisão congelada desta especificação:**

- **Não renomear** Customer agora.
- **Não substituir** automaticamente por Organization.
- Manter Customer como **conta comercial / contexto de agrupamento operacional atual** enquanto o domínio de energia nasce ao lado.

**Evolução futura possível (DECISÃO PENDENTE PO):**

- Introduzir `Organization` / Empresa / Tenant **se** houver multi-empresa real, franquia ou holding.
- Ou especializar Customer em papéis explícitos via entidades novas (Consumer, Investor) sem destruir o FK `Plant.customerId` de imediato.

Campos que podem continuar no Customer atual: identificação cadastral básica, status, contato.  
Campos que **não** devem receber novas responsabilidades: rateio, crédito, fatura, UC, regra de remuneração.

---

## 4. Organização / Empresa

**Estado:** NÃO ENCONTRADO NO CÓDIGO ATUAL.

**Conceito futuro (se aprovado):**

Entidade que representa a empresa operadora da plataforma / holding / unidade de negócio B7 Ultraclube, distinta de:

- Customer (conta operacional atual)
- Consumer (beneficiário)
- Investor (proprietário econômico da usina)

**DECISÃO PENDENTE:** necessidade real de Organization vs. evolução do próprio Customer.  
**Inferência (não congelada):** para um único operador B7 no curto prazo, Organization pode ser adiada; para multi-tenant, torna-se necessária.

---

## 5. Usina (`Plant`)

### 5.1 Definição conceitual B7

**Usina** = ativo operacional/energético de geração fotovoltaica, hoje materializado como `Plant`.

### 5.2 O que já existe

| Aspecto | Situação |
|---------|----------|
| Identificação | `name`, `id` |
| Titularidade | indireta via `customerId` (sem papel jurídico) |
| Capacidade | `installedPowerKw` (+ `Inverter.ratedPowerKw` separado — **preservar**) |
| Geração (telemetria) | via `MonitoringReading` |
| Distribuidora | string `distributor` |
| UC | string `consumerUnit` |
| Endereço | `address`, lat/lng |
| Status operacional | `PlantStatus` (ACTIVE/INACTIVE/WARNING/OFFLINE) |
| Equipamentos | Inverter, Equipment |
| Monitoramento | readings, alerts, bindings |

### 5.3 O que a Usina deve ser (V2.1)

Entidade **central do O&M e âncora da Gestão de Energia**, relacionando-se com outros domínios **sem absorvê-los**.

Usina **NÃO** deve conter:

- cobrança / pagamento
- usuário (exceto via membership/scope)
- fatura completa
- consumidor embutido
- saldo de crédito
- CRM

### 5.4 Relacionamentos futuros (conceituais)

```
Usina (Plant)
  ├── Monitoramento (já existe)
  ├── Equipamentos / Inversores (já existe)
  ├── Distribuidora (entidade futura) ← hoje string
  ├── UC geradora / OC (DECISÃO PENDENTE nomenclatura)
  ├── Titular / Associação / Consórcio (DECISÃO PENDENTE)
  ├── Rateios → UCs consumidoras
  ├── Balanço Mensal (origem energética)
  └── Escopo Investidor (UserMembership.plantId / Investor futuro)
```

### 5.5 Campos futuros típicos (não implementar)

Identificação comercial, número/OC, CNPJ do titular, modalidade de compensação, expectativa de geração, classificação, CEP estruturado — **referência Lumi**. Validar nomenclatura jurídica com PO/regulatório.

---

## 6. Unidade Consumidora (UC)

### 6.1 Definição

**UC** = ponto de conexão / unidade junto à distribuidora onde há **consumo** (e eventualmente geração própria), distinta de:

- `Customer`
- `Consumer` (pessoa/contrato)
- `Plant` (usina)

**Estado:** NÃO ENCONTRADO como entidade. Existe apenas `Plant.consumerUnit` (string).

### 6.2 Conceito B7 V2.1

UC é entidade **própria** futura, tipicamente vinculada a:

- Distribuidora
- Titular cadastral na distribuidora (pode coincidir ou não com Consumer)
- Consumer (negócio B7)
- zero ou mais Usinas via Rateio
- Faturas da Distribuidora
- Créditos / Compensação / Balanço Mensal

### 6.3 Atributos conceituais (candidatos)

- número da UC
- distribuidora (FK futura)
- titular (nome/documento — **validação futura**)
- endereço
- classe / subgrupo / tarifa (B1/B2/B3 — **referência Lumi**; **VALIDAÇÃO REGULATÓRIA NECESSÁRIA**)
- modalidade de compensação
- flag geração própria
- status
- dados de login no portal da distribuidora (**credenciais — cuidado de segurança**; não inventar API)

### 6.4 UC geradora vs UC consumidora

**DECISÃO PENDENTE / VALIDAÇÃO REGULATÓRIA:**

- A usina possui UC/OC própria de geração?
- `Plant.consumerUnit` atual refere-se à UC da usina ou a um beneficiário?
- Separar **UG/OC** (geração) de **UC** (consumo beneficiário)?

Não congelar nomenclatura jurídica nesta especificação.

---

## 7. Consumidor (Consumer)

### 7.1 Separações obrigatórias

| Conceito | Significado |
|----------|-------------|
| `User` + role `CONSUMIDOR` | Autorização (Sprint 18) — **já existe como role** |
| `Customer` | Conta operacional atual — **não é Consumer** |
| **Consumer** (futuro) | Entidade de negócio: beneficiário/contratante da energia compartilhada |

```
ROLE ≠ ENTIDADE DE NEGÓCIO ≠ SCOPE
```

### 7.2 Cadeia conceitual

```
Consumer
   ↕
UC
   ↕
Usina (via Rateio)
   ↕
Crédito / Compensação / Balanço
   ↕
Faturamento B7 / Cobrança
```

### 7.3 Cardinalidade

| Pergunta | Status |
|----------|--------|
| Um Consumer → uma UC? | **DECISÃO PENDENTE** |
| Um Consumer → várias UCs? | **DECISÃO PENDENTE** (referência Lumi sugere possível; não confirmado como regra B7) |
| Um Consumer → várias usinas via rateios? | **DECISÃO PENDENTE** |
| User 1:1 Consumer? | Provável N:1 ou 1:1 via membership — **DECISÃO PENDENTE** |

### 7.4 O que NÃO fazer

- `Customer.role = CONSUMIDOR`
- `Customer.type = CONSUMIDOR`
- Tratar login como se fosse o contrato energético

---

## 8. Investidor

### 8.1 Separações

| Conceito | Status |
|----------|--------|
| Role `INVESTIDOR` | Existe (Sprint 18) — autorização |
| Entidade `Investor` | NÃO ENCONTRADA — candidato futuro |

### 8.2 Conceito de negócio (futuro)

Investidor = parte econômica interessada no resultado da(s) usina(s):

```
Investor
  ↓
Usina(s)
  ↓
Geração (Monitoramento como input)
  ↓
Rateios / Balanço / Receita-Resultado (Faturamento — DECISÃO PENDENTE modelo)
```

Portal Investidor = UI sobre **scope** de usinas autorizadas (`UserMembership.plantId` / customerWide), não sobre role sozinha.

**Não implementar portal nesta etapa.**

---

## 9. Distribuidora

### 9.1 Estado atual

`Plant.distributor: String` — insuficiente.

### 9.2 Conceito futuro

Entidade própria:

```
Distributor
├── identificação / código
├── área de atuação (futuro)
├── integrações (adapters — mesmo princípio IntegrationEngine)
├── credenciais / procurações (secretRef — padrão Binding)
├── aquisição de faturas
└── tratativas / inconsistências
```

**PROIBIDO nesta especificação:** inventar endpoints/APIs de distribuidoras.

Integrações futuras: **adapters/providers**, alinhados ao padrão já usado para fabricantes.

Pasta `integrations/distributors/` = README only.

---

## 10. Associação e Consórcio

### 10.1 Referência Lumi

Material de reunião indica estruturas societárias/operacionais (associação, consórcio) ligadas a usinas e consumidores.

### 10.2 Posição B7

**NÃO** assumir que são “tipos de Customer”.

| Conceito | Status |
|----------|--------|
| Association | Futuro candidato — **VALIDAÇÃO DE NEGÓCIO/REGULATÓRIA NECESSÁRIA** |
| Consortium | Futuro candidato — **VALIDAÇÃO DE NEGÓCIO/REGULATÓRIA NECESSÁRIA** |
| Cooperativa | Mencionar só se PO confirmar — **DECISÃO PENDENTE** |

Podem afetar titularidade da usina, rateio e faturamento — **não implementar** até validação.

---

## 11. Relacionamentos de energia (ciclo conceitual)

```
USINA  →  produz geração (kWh no tempo — agregada)
UC     →  possui consumo (kWh no ciclo)
CONSUMIDOR → associado à UC (contrato/negócio)
RATEIO → define alocação usina → UC/consumidor (% ou critério + vigência)
CRÉDITO → saldo energético compensável segundo regras aplicáveis
COMPENSAÇÃO → uso do crédito/energia para abatimento no ciclo
```

### Regras de modelagem

1. **Não** transformar geração telemetria (`MonitoringReading.powerKw` / `energy*`) automaticamente em crédito.
2. **Não** confundir kW (potência) com kWh (energia).
3. **Não** misturar leitura instantânea do inversor com balanço mensal.
4. Monitoramento **fornece input** de geração; Gestão de Energia **interpreta e aloca**.

### Geração própria (referência Lumi)

Consumidores com geração própria podem exigir distinção:

- consumo bruto
- energia injetada
- energia líquida / compensável

**VALIDAÇÃO REGULATÓRIA NECESSÁRIA** para regras oficiais. Arquitetura deve **permitir** campos/eventos distintos — sem implementar agora.

---

## 12. Rateio

### 12.1 Definição

Conceito **próprio** da Gestão de Energia: regra de alocação da energia/crédito da usina para UCs/consumidores.

### 12.2 Atributos conceituais

| Atributo | Motivo |
|----------|--------|
| origem (usina) | obrigatório |
| destino (UC / consumer) | obrigatório |
| percentual ou critério | referência Lumi usa % |
| vigência início/fim | histórico |
| status | ACTIVE/INACTIVE… |
| motivo da alteração | auditoria de negócio |
| regra contratual / protocolo distribuidora | futuro |

### 12.3 Histórico

**Decisão congelada:** rateio **deve** ter versionamento/histórico.  
**Proibido:** sobrescrever silenciosamente percentual antigo.

Exemplo conceitual (Lumi): Usina → A 30%, B 25%, C 20%, D 10%, saldo usina 15%.

---

## 13. Créditos (nomenclatura)

**Não são sinônimos:**

| Termo | Domínio | Significado conceitual |
|-------|---------|------------------------|
| Geração | Monitoramento → input Energia | Energia produzida (agregada) |
| Consumo | Gestão Energia | Energia consumida na UC |
| Energia alocada | Gestão Energia | Parcela atribuída via rateio |
| Energia compensada | Gestão Energia | Parcela efetivamente abatida no ciclo |
| Crédito / saldo | Gestão Energia | Remanescente compensável segundo regras |
| Potência (kW) | Monitoramento | Instantâneo / capacidade — **não é crédito** |

### Ciclo conceitual

```
Geração
  → energia disponível/alocável
  → alocação (rateio)
  → compensação
  → saldo/crédito remanescente
```

Nomenclatura jurídica exata (SCEE, GD I/II, etc.): **VALIDAÇÃO REGULATÓRIA NECESSÁRIA**.

---

## 14. Balanço Mensal

### 14.1 Definição

Fechamento mensal do relacionamento **energético e (depois) econômico** por contexto (tipicamente UC × usina × ciclo).

### 14.2 Conteúdo conceitual

- mês de referência
- usina
- UC
- consumidor
- consumo
- energia compensada
- saldo de crédito
- valores de faturamento/economia (**após** regras comerciais)
- regra de remuneração aplicada (versão/vigência)
- status do fechamento (rascunho / conferido / liberado para cobrança)

### 14.3 Referência Lumi

Balanço fecha cada UC ligada às usinas e deixa valores disponíveis para **conferência antes da cobrança**.

**Não** copiar números da apresentação. **Não** criar dados fake.

---

## 15. Regras (camadas distintas)

| Camada | Pergunta |
|--------|----------|
| Regra energética | Como geração/consumo/crédito se comportam no ciclo? |
| Regra de rateio | Quem recebe qual parcela? |
| Regra comercial | Descontos, produtos, condições de contrato B7 |
| Regra de remuneração | Como se calcula o valor devido ao modelo usina/investidor/B7? |
| Regra de cobrança | Vencimento, meio de pagamento, régua de inadimplência |

Todas devem, no futuro, ter **histórico/vigência**.  
**Não** implementar motor de precificação nesta etapa.

---

## 16. Fatura da Distribuidora

Documento/dados oficiais da concessionária, associados a **Usina e/ou UC**.

```
Aquisição → Processamento → Extração → Validação → Auditoria
  → Inconsistência? → Tratativa
```

Referência Lumi: aquisição automática em portais das distribuidoras (usinas e UCs), com sinalização do que não puder ser obtido.

**Não implementar** integração automática agora. Usar padrão adapter quando chegar a hora.

---

## 17. Faturamento B7 (separado da fatura da distribuidora)

```
Balanço Mensal
  → Regra de remuneração
  → Cálculo
  → Demonstrativo
  → Cobrança B7
```

Demonstrativo/cobrança pode exibir (futuro): energia compensada, economia, tarifa, desconto, vencimento, valor, IDs de consumidor/UC/usina.

**Decisão congelada:** Fatura Distribuidora ≠ Faturamento/Cobrança B7.

---

## 18. Cobrança e inadimplência (domínio posterior)

```
Balanço → Cobrança → Envio → Em aberto → Pago | Vencido
  → Inadimplência → Recuperação
```

Referência Lumi (dashboard futuro): total em atraso, %, recuperado, prazo médio, faixas, priorização de devedores.

Estados conceituais: não cobrado, cobrado, vencido, recebido; meios Pix/boleto; 2ª via; histórico.

**Não implementar** nesta etapa.

---

## 19. Portais (somente conceito)

| Portal | Base de escopo |
|--------|----------------|
| Investidor | Usinas / investimentos autorizados (membership plant/customer) |
| Consumidor | Consumer + UCs autorizadas (membership futuro em UC) |

Sprint 18 já preparou Role + Membership + Scope para Plant/Customer.  
**Escopo por UC:** ainda **não existe** — extensão futura do AuthorizationService (**documentação apenas**; sem alterar código agora).

```
User
  → UserMembership (role + scope)
  → acessa entidades de negócio (Plant hoje; Consumer/UC/Investor no futuro)
```

---

## 20. Matriz de responsabilidade dos domínios

| Conceito | Monitoramento | Gestão Energia | Faturas Dist. | Faturamento B7 | Cobrança | CRM |
|----------|:-------------:|:--------------:|:-------------:|:--------------:|:--------:|:---:|
| MonitoringReading | ● | input | | | | |
| Potência kW / disponibilidade | ● | | | | | |
| Geração agregada (kWh ciclo) | origem | ● | | | | |
| Consumo UC | | ● | (via fatura) | | | |
| Rateio | | ● | | | | |
| Crédito / Compensação | | ● | | | | |
| Balanço Mensal | | ● | | usa | usa | |
| Fatura Distribuidora | | | ● | | | |
| Demonstrativo / cálculo B7 | | | | ● | | |
| Cobrança B7 / Payment | | | | | ● | |
| Inadimplência | | | | | ● | |
| Alertas O&M | ● | | | | | |
| Customer (conta atual) | contexto | contexto | | | | parcial |
| Consumer / UC | | ● | ● | ● | ● | |
| Investidor (negócio) | visão | visão | | visão | | |
| Lead / ticket / pós-venda | | | | | | ● |
| IntegrationBinding / AUXSOL | ● | | | | | |

---

## 21. Entidades — mapa

### 21.1 JÁ EXISTE (confirmado no Prisma)

- User
- Customer
- Plant
- Inverter
- Equipment
- UserMembership
- InverterManufacturer
- Integration
- IntegrationBinding
- MonitoringReading
- Alert
- AlertEvent

### 21.2 FUTURAS (identificadas — **não criar agora**)

| Entidade candidata | Domínio | Prioridade conceitual |
|--------------------|---------|------------------------|
| Distributor | Cadastro / Faturas | Alta |
| ConsumerUnit (UC) | Gestão Energia | Alta |
| Consumer | Gestão Energia | Alta |
| EnergyAllocation / Rateio (+ histórico) | Gestão Energia | Alta |
| CreditLedger / CreditBalance | Gestão Energia | Alta |
| CompensationEvent | Gestão Energia | Alta |
| MonthlyBalance | Gestão Energia | Alta |
| DistributorInvoice | Faturas Dist. | Média-Alta |
| RemunerationRule / CommercialRule (versionadas) | Faturamento | Média |
| BillingDocument / Charge | Faturamento/Cobrança | Média |
| Payment | Cobrança | Média |
| DelinquencyCase | Cobrança | Baixa (depois) |
| Investor (negócio) | Cadastro / Portal | Média |
| Organization / Tenant | Plataforma | **DECISÃO PENDENTE** |
| Association | Cadastro energético | **VALIDAÇÃO REGULATÓRIA** |
| Consortium | Cadastro energético | **VALIDAÇÃO REGULATÓRIA** |
| GenerationUnit / OC | Gestão Energia | **DECISÃO PENDENTE** nomenclatura |

---

## 22. Mapa de relacionamentos (conceitual V2.1)

Ajustado ao código real + evolução proposta (não é schema aprovado para migration):

```
[Organization?]                     ← DECISÃO PENDENTE
   │
   ├── Users (staff / portais)
   │     └── UserMembership → scope Customer | Plant | (UC futuro)
   │
   └── Customer (conta operacional atual — preservar)
         │
         ├── Plants (Usinas) ─────────────────────────────┐
         │     ├── Inverters / Equipment                  │
         │     ├── MonitoringReading / Alerts             │ Monitoramento
         │     └── IntegrationBinding                     │
         │                                                │
         └── (futuro) vínculos comerciais                 │
                                                          ▼
                                              Gestão de Energia
                                              ├── Distributor
                                              ├── Consumer
                                              ├── UC
                                              ├── Rateio (histórico)
                                              ├── Credit / Compensation
                                              └── MonthlyBalance
                                                       │
                                                       ▼
                                              Faturas Dist. + Faturamento B7 + Cobrança
```

---

## 23. Integração com Sprint 18 (sem alterar código)

```
User
  ↓
UserMembership
  ↓
role + scope
  ↓
autoriza acesso a Customer / Plant hoje
  ↓
futuro: Consumer / Investor / UC
```

| Camada | Responsabilidade |
|--------|------------------|
| Role | Capacidade (permissions) |
| Scope | Onde pode atuar |
| Entidade de negócio | O que existe no mundo real modelado |
| User | Identidade de login — **não** substitui Consumer/Investor |
| Customer | Conta atual — **não** absorve todas as entidades futuras |

Extensão futura sugerida (somente documentação): membership com `consumerId` / `ucId` quando essas entidades existirem — **sem mudar AuthorizationService agora**.

---

## 24. Decisões congeladas nesta V2.1

1. Separação obrigatória: Monitoramento ≠ Gestão de Energia ≠ Faturas Dist. ≠ Faturamento B7 ≠ Cobrança ≠ CRM.
2. Não renomear/destruir Customer nesta fase; não usá-lo como Consumer.
3. UC é entidade própria futura (≠ string em Plant).
4. Consumer é entidade de negócio própria (≠ User role sozinha).
5. Distributor é entidade própria futura (≠ `Plant.distributor` string).
6. Rateio é conceito próprio com **histórico/vigência**.
7. Geração telemetria ≠ crédito automático.
8. kW ≠ kWh; leitura instantânea ≠ balanço mensal.
9. Fatura Distribuidora ≠ Cobrança B7.
10. Role ≠ Scope ≠ Entidade de negócio (Sprint 18 permanece base).
11. Usina não é container universal de cobrança/CRM/crédito.
12. Integrações de distribuidora futuras via adapters (mesmo princípio de fabricantes).
13. Lumi é referência funcional, não arquitetura oficial B7.
14. Esta etapa **não implementa** domínio — apenas especifica.

---

## 25. Decisões ainda não congeladas

| ID | Tema | Dependência |
|----|------|-------------|
| D1 | Necessidade de Organization/Empresa/Tenant | PO / escala comercial |
| D2 | Titularidade formal da usina (PF/PJ/associação) | PO + jurídico |
| D3 | UC geradora/OC vs UC consumidora | PO + regulatório |
| D4 | Significado real de `Plant.consumerUnit` hoje | PO / operação |
| D5 | Cardinalidade Consumer ↔ UC | PO |
| D6 | Consumer ↔ múltiplas usinas | PO |
| D7 | Relação Customer ↔ Organization ↔ Consumer | PO |
| D8 | Association / Consortium / Cooperativa | **VALIDAÇÃO REGULATÓRIA** |
| D9 | Modelo oficial de crédito (expiração, prioridade, GD) | **VALIDAÇÃO REGULATÓRIA** |
| D10 | Regras de compensação e geração própria | **VALIDAÇÃO REGULATÓRIA** |
| D11 | Regras de remuneração B7 / Ultraclube | PO comercial |
| D12 | Fonte oficial de dados de distribuidoras | Produto + integrações |
| D13 | Entidade Investor vs só role+membership | PO |
| D14 | Nomenclatura comercial vs jurídica em telas | PO |
| D15 | Escopo membership por UC (extensão Sprint 18) | Arquitetura + PO |

---

## 26. Riscos arquiteturais se a especificação for ignorada

1. Continuar enchendo `Plant` com strings comerciais → impossível rateio multi-UC.
2. Usar `Customer` como Consumidor → quebra portal e faturamento.
3. Misturar `MonitoringReading` com crédito → contabilidade energética incorreta.
4. Cobrança B7 dentro de fatura da distribuidora → auditoria impossível.
5. Rateio sem histórico → litígio operacional.
6. Copiar Lumi literalmente → desalinhamento com patrimônio O&M B7 já estável.

---

## 27. Ordem recomendada de implementação (NÃO executar agora)

1. **Congelar esta V2.1** com o Product Owner (fechar D3–D6 e D9 no mínimo).
2. Aplicar migration pendente da Sprint 18 em ambiente com DB.
3. **Sprint de cadastro energético mínimo:** Distributor + UC (+ vínculo limpo com Plant, sem destruir Monitoramento).
4. Consumer + ligação UserMembership → Consumer/UC.
5. Rateio versionado.
6. Balanço Mensal (energia) usando geração do Monitoramento como **input**.
7. Fatura Distribuidora (aquisição manual/semi antes de adapters).
8. Faturamento B7 + Cobrança.
9. Portais Investidor/Consumidor.
10. CRM / WhatsApp / Mobile / IA.

**Próximo passo recomendado após aprovação do PO:** modelagem Prisma + APIs do **núcleo Gestão de Energia (Distributor + UC + Consumer + Rateio histórico)** — em sprint dedicada, sem tocar no pipeline de Monitoramento.

---

## 28. Checklist desta etapa

- [x] Documento criado em `docs/architecture/domain-spec-v2.1.md`
- [x] Baseado em código + docs B7 + Sprint 18 + referência Lumi (contexto)
- [x] PDF Lumi marcado como não encontrado no repo
- [x] Decisões congeladas vs pendentes explícitas
- [x] Sem migration / sem alteração de schema / sem alteração de monitoramento / AUXSOL / Redis / AuthorizationService

---

*Fim da Especificação Funcional e Modelo Conceitual V2.1 — aguardar revisão do Product Owner.*
