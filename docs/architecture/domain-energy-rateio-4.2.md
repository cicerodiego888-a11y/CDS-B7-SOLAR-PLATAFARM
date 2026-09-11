# B7 Solar Plataforma de Gestão
# Domínio 4.2 — Auditoria e Especificação do Rateio

**Tipo:** auditoria + especificação (sem implementação)  
**Status do documento:** proposta oficial para aprovação do Product Owner  
**Fonte de verdade imediata para:** Sprint 4.3 (Rateio Versionado)  
**Data-base:** 2026-09-11  
**Alterações de código/schema/migration nesta sprint:** **NENHUMA**

---

## 1. Objetivo

Definir, de forma congelável, o domínio de **Rateio** (alocação energética) entre:

- **Plant** (Usina / ativo O&M de geração)
- **ConsumerUnit** (UC)

preparando a implementação do Sprint 4.3 **sem** Credit Engine, Compensation, Billing ou alteração de Monitoring/AUXSOL.

---

## 2. Escopo

### Incluído

- Conceito de Rateio
- Cardinalidade Plant ↔ UC
- Versionamento e vigência
- Percentual e composição
- Ciclo de vida / inativação / exclusão
- Integridade, auditoria, concorrência, transações
- Fronteiras com geração, consumo, crédito, compensação, faturamento
- Recomendações oficiais para o 4.3

### Excluído (FORA DO ESCOPO)

- Implementação Prisma/API/UI
- Cálculo de kWh alocados
- Credit / Compensation / MonthlyBalance
- Billing / Collection / faturas de distribuidora
- Association / Consortium
- Migração de `Plant.consumerUnit`
- Tenancy / Organization
- Regras regulatórias não validadas

---

## 3. Fontes analisadas

| Fonte | Uso |
|-------|-----|
| `domain-uc-d3.md` | Modelo D Usina–Rateio–UCs; modalidades SCEE; Rateio ≠ crédito |
| `domain-spec-v2.1.md` | Rateio próprio + histórico obrigatório; ciclo Geração→Rateio→Compensação→Crédito |
| `domain-decisions-v2.2.md` | N:N via Rateio; D5/D6; Lumi como referência funcional |
| `domain-energy-cadastro-minimo-4.1.md` | Distributor/Consumer/UC implementados; Plant ⟂ UC |
| `domain-distributor-uc-d3-d4-audit.md` | Matriz entidades; Plant×UC via Rateio; legado |
| `plant-consumer-unit-legacy-audit.md` | `Plant.consumerUnit` ambíguo e legado |
| `domain-energy-rateio-4.3-BLOCKED.md` | Lacunas que este 4.2 fecha |
| `schema.prisma` + migrations | Estado real: sem Rateio; Decimal em potências/energia; `RecordStatus`; Alert `*By` string |
| Código Plant/Customer/Consumer/ConsumerUnit/Distributor/User/Membership | CRUD cadastral; soft status; sem `createdBy` em cadastros |

**Referência Lumi:** apenas benchmark funcional (rateio % multi-UC, refazer rateio). **Não** é especificação jurídica B7.

---

## 4. Estado atual

### Código / Prisma

| Item | Estado |
|------|--------|
| Entidade Rateio / EnergyAllocation | **NÃO EXISTE** |
| FK Plant ↔ ConsumerUnit | **NÃO EXISTE** |
| `Plant.consumerUnit` / `Plant.distributor` | Strings **LEGADO** |
| `ConsumerUnit` | Existe (4.1); independente de Plant |
| `Distributor` | Existe (4.1); FK só em ConsumerUnit |
| Monitoring / AUXSOL | Intactos; sem dependência de Rateio |
| Auditoria genérica de domínio | **Não** há `createdBy` em Customer/Plant/UC; Alert usa `acknowledgedBy`/`resolvedBy`/`actor` string |

### Conclusão factual

O Rateio precisa nascer **aditivo** no domínio Gestão de Energia, mediando Plant e ConsumerUnit, sem tocar Monitoring nem o legado textual da Plant.

---

## 5. Conceito de Rateio

### Definição B7

**Rateio** = regra versionada de **alocação percentual** da energia gerada/alocável de uma **Plant** para uma ou mais **ConsumerUnit(s)**.

Nome técnico recomendado: **`EnergyAllocation`**  
Nome funcional/UI: **Rateio**

### Problema de negócio que resolve

Permitir configurar e historiar **quem participa** da geração de uma usina e **em que proporção**, sem confundir isso com telemetria, crédito, fatura ou cobrança.

### O que Rateio NÃO é

| Conceito | Relação |
|----------|---------|
| Geração (`MonitoringReading`) | Input futuro; Rateio **não** armazena kWh gerados |
| Consumo | Domínio separado; Rateio **não** armazena kWh consumidos |
| Crédito | Ledger futuro; **RATEIO ≠ CRÉDITO** |
| Compensação | Etapa posterior ao Rateio |
| Faturamento / Cobrança B7 | Domínios posteriores |
| Valor financeiro | Proibido no modelo de Rateio |

### Regra de ouro

```
Plant gerou 1.000 kWh (futuro)
Rateio: UC1=50%, UC2=30%, UC3=20%

Rateio armazena: 50 / 30 / 20
Rateio NÃO armazena: 500 / 300 / 200 kWh
```

---

## 6. Plant × ConsumerUnit

```
ORIGEM  = Plant
DESTINO = ConsumerUnit
MEDIAÇÃO = EnergyAllocation (+ versões)
```

- **Não** criar FK direta Plant↔ConsumerUnit que substitua o Rateio.
- **Não** usar `Plant.consumerUnit` (legado).
- **Não** colocar `customerId` / `userId` em EnergyAllocation.
- Destino é sempre **ConsumerUnit** (Consumer acessível via UC).

---

## 7. Cardinalidades

| Relação | Cardinalidade | Confiança | Status |
|---------|---------------|-----------|--------|
| Plant → UCs via Rateio | **1 : N** | Alta (núcleo produto / Lumi / D3) | **APROVADO PELO DOCUMENTO** |
| UC → Plants via Rateio | **1 : N** (modelo de dados) | Média | **RECOMENDADO AO PO** |
| Plant ↔ UC | **N : N** mediado por Rateio | Média–Alta | **APROVADO PELO DOCUMENTO** (estrutura) |
| 1 vínculo Plant+UC | **1** EnergyAllocation (identidade estável) | Alta | **APROVADO PELO DOCUMENTO** |
| 1 Allocation → versões | **1 : N** | Alta | **APROVADO PELO DOCUMENTO** |

**Nota:** permitir no **modelo** UC←N Plants não implica que todo produto comercial/regulatório permita isso em todos os casos. Uso comercial específico: ver §32 e §36.

---

## 8. Cenários suportados

| ID | Cenário | Válido no modelo? | Observação |
|----|---------|-------------------|------------|
| A | 1 Plant → 1 UC | **Sim** | Autoconsumo local / MVP mínimo |
| B | 1 Plant → N UCs | **Sim** | Cenário núcleo (remoto/compartilhada) |
| C | 1 UC → 1 Plant | **Sim** | Caso particular de A |
| D | 1 UC → N Plants | **Sim no modelo** | Cada Plant tem seu próprio conjunto; **RECOMENDADO AO PO** confirmar MVP |
| E | N Plants → N UCs | **Sim no modelo** | União de conjuntos por Plant; sem “grade global” única |

---

## 9. Cenários não definidos / condicionados

| Tema | Status |
|------|--------|
| Obrigatoriedade de cadastrar “UC com MMGD” além das participantes | **PENDENTE** (D3 P2) |
| Beneficiário comercial ≠ titular da UC | **PENDENTE — PO** + possível jurídico |
| Association/Consortium na geração compartilhada | **FORA DO ESCOPO** / jurídico |
| “Saldo usina” como linha especial de rateio (ex.: 15% residual Lumi) | **PENDENTE — PO** |
| Compatibilidade obrigatória mesma Distributor Plant×UC | **PENDENTE DE VALIDAÇÃO REGULATÓRIA** (Plant ainda não tem FK Distributor) |

---

## 10. Percentual

### Decisões

| Pergunta | Resposta | Status |
|----------|----------|--------|
| Rateio usa percentual? | **Sim** (MVP) | **APROVADO PELO DOCUMENTO** |
| Intervalo | `0 < percentage ≤ 100` | **APROVADO PELO DOCUMENTO** |
| Mínimo | **> 0** (não cadastrar linha 0%) | **APROVADO PELO DOCUMENTO** |
| Máximo | **100** | **APROVADO PELO DOCUMENTO** |
| Tipo | **Prisma `Decimal` / PostgreSQL NUMERIC** — **nunca Float** | **APROVADO PELO DOCUMENTO** |
| Precisão recomendada | **`Decimal(7, 4)`** (ex.: 33.3333) | **RECOMENDADO AO PO** (alternativa aceitável: `Decimal(5,2)`) |
| Quantidade (kWh) no Rateio? | **Não** no MVP | **FORA DO ESCOPO** |
| Prioridade / ordem? | **Não** no MVP (Lei cita ordem — futuro) | **FORA DO ESCOPO** / evolução |
| Outro critério? | **Não** no MVP | **FORA DO ESCOPO** |

---

## 11. Composição

### Unidade de agregação (CRÍTICO)

A unidade lógica de composição é:

```
Plant + instante T (data de referência)
  = conjunto de percentuais das EnergyAllocations ACTIVE
    cuja versão vigente cobre T
```

**Não** é um “documento Rateio único” separado no MVP.  
**São** N vínculos Plant–UC, validados **em conjunto** por Plant.

### Soma = 100%?

| Regra | Detalhe | Status |
|-------|---------|--------|
| Soma obrigatória | **Sim** | **RECOMENDADO AO PO** |
| Escopo | **Por Plant**, em qualquer instante T coberto por versões | **RECOMENDADO AO PO** |
| Tolerância | Igualdade exata em Decimal com 4 casas (ou 2 se PO escolher) | **RECOMENDADO AO PO** |
| Soma 80% / 120% | **Rejeitar** na operação atômica de composição | **RECOMENDADO AO PO** |
| UC sem percentual no conjunto | Não participa (ausência ≠ 0%) | **APROVADO PELO DOCUMENTO** |

Se o PO rejeitar soma rígida 100% (ex.: permitir residual), isso deve ser registrado **antes** do 4.3 — senão o 4.3 implementa a recomendação acima.

### Remoção de UC do rateio

- Não apagar histórico.
- Encerrar versão vigente (`effectiveTo`) e/ou inativar `EnergyAllocation`.
- Revalidar soma do conjunto da Plant no mesmo instante.

---

## 12. Versionamento

### Modelos avaliados

| Modelo | Descrição | Avaliação |
|--------|-----------|-----------|
| **A** | `EnergyAllocation` + `EnergyAllocationVersion` | Melhor histórico, consultas, auditoria, evolução |
| B | Uma entidade com só vigência | Mistura identidade do vínculo com cada mudança de % |
| C | Snapshot de “plano” por Plant/período | Mais complexo; útil depois se PO exigir “pacote” nomeado |

### Recomendação oficial

**MODELO A**

```
EnergyAllocation          ← identidade do vínculo Plant ↔ ConsumerUnit
      │ 1:N
      ▼
EnergyAllocationVersion   ← percentage + effectiveFrom + effectiveTo (+ audit)
```

Uma alteração de percentual **cria nova versão**; **nunca** sobrescreve a anterior.

---

## 13. Vigência

| Campo | Significado |
|-------|-------------|
| `effectiveFrom` | Início inclusivo da vigência |
| `effectiveTo` | Fim **exclusivo** recomendado **ou** inclusivo documentado na implementação — **escolher um e fixar no 4.3** |
| `effectiveTo = NULL` | Versão **aberta** (atual ou futura ainda sem fim) |

### Classes de versão

| Classe | Regra |
|--------|-------|
| Encerrada | `effectiveTo` preenchido e ≤ agora (ou < now, conforme convenção) |
| Atual | cobre “hoje” e tipicamente `effectiveTo = NULL` ou fim futuro |
| Futura | `effectiveFrom` > hoje |

**Recomendação de convenção para o 4.3:** intervalo **semiaberto** `[effectiveFrom, effectiveTo)` com `NULL` = +∞. Documentar na migration/código.

---

## 14. Sobreposição

### Contexto de conflito

Sobreposição é avaliada **por `EnergyAllocation` (par Plant + ConsumerUnit)**.

Duas versões do **mesmo** vínculo **não** podem ter intervalos sobrepostos.

```
PROIBIDO:
  Versão A: 01/01 → 31/12
  Versão B: 01/06 → NULL
  (mesmo EnergyAllocation)
```

Versões de **vínculos diferentes** (outra UC ou outra Plant) **não** entram no mesmo teste de sobreposição de vigência (composição % é outro teste, por Plant).

**Status:** **APROVADO PELO DOCUMENTO**

---

## 15. Alteração retroativa

Exemplo: hoje a vigência aberta desde 01/01 = 50%; usuário tenta 01/03 = 60%.

| Opção | Prós | Contras |
|-------|------|---------|
| Proibir no MVP | Simples; evita reescrever passado | Menos flexível operacionalmente |
| Permitir com motivo + perfil elevado | Realista para correções | Risco se Billing já fechou ciclo |

**Recomendação:** **PENDENTE — PO**

**Default seguro para 4.3 se PO não responder:** **rejeitar** `effectiveFrom` anterior ao início da versão aberta atual (sem correção retroativa no MVP).

---

## 16. Alteração futura

```
Atual:  01/01/2026 → NULL = 50%
Futura: 01/07/2027 → NULL = 60%
```

Ao criar a futura: **fechar** a atual com `effectiveTo = 01/07/2027` (mesma transação).

**Status:** **APROVADO PELO DOCUMENTO** (permitido)

---

## 17. Inativação

| Aspecto | Regra |
|---------|-------|
| Significado | `EnergyAllocation.status = INACTIVE` — vínculo não entra em composição ativa |
| Histórico / versões | **Preservados** |
| Nova versão | **Bloqueada** enquanto INACTIVE |
| Reativação | **Permitida** (`ACTIVE` de novo); composição da Plant deve ser revalidada |
| Enum | Reutilizar **`RecordStatus`** (ACTIVE/INACTIVE) — **sem DRAFT** no MVP |

**Status:** **APROVADO PELO DOCUMENTO**

---

## 18. Exclusão

| Estratégia | Decisão |
|------------|---------|
| DELETE físico | **Não** no MVP |
| Soft delete | **Inativação** |
| Exceção “nunca usado” | Não necessária se não há DELETE |

**Status:** **APROVADO PELO DOCUMENTO**

---

## 19. Auditoria

### Padrão existente

- Cadastros: `createdAt` / `updatedAt`
- Alertas: `acknowledgedBy` / `resolvedBy` / `AlertEvent.actor` (string)

### Recomendação Rateio

| Campo | Onde | Obrigatório MVP? |
|-------|------|------------------|
| `createdAt` / `updatedAt` | Allocation + Version | **Sim** |
| `createdBy` (string userId/email) | Version (e create Allocation) | **RECOMENDADO AO PO** (alinhar a Alert) |
| `reason` | Version | **RECOMENDADO** em mudanças; opcional na 1ª versão |
| `updatedBy` / `inactivatedBy` | Allocation | Opcional / evolução |
| Tabela Event genérica | — | **Não** criar mecanismo paralelo no MVP |

Não inventar framework de auditoria novo.

---

## 20. Integridade

### Plant INACTIVE

- **Não** apagar Rateios/versões.
- **Bloquear** criação de novos vínculos e novas versões enquanto Plant não ACTIVE (ou WARNING/OFFLINE? — Plant usa `PlantStatus`, não só RecordStatus).
- **Recomendação:** permitir leitura; bloquear mutações de Rateio se `Plant.status = INACTIVE`. Para WARNING/OFFLINE (operacional), Rateio cadastral **permanece editável** (Monitoring ≠ Energy).

### ConsumerUnit INACTIVE

- **Não** apagar histórico.
- **Bloquear** novas versões / novos vínculos com UC INACTIVE.
- Vínculos existentes: permanecem; UC INACTIVE **não entra** na composição ativa (ou bloqueia mutação do conjunto — preferir: composição só considera UC ACTIVE + Allocation ACTIVE).

### FK

- `ON DELETE RESTRICT` em Plant e ConsumerUnit.
- Unicidade: `@@unique([plantId, consumerUnitId])` em EnergyAllocation.

---

## 21. Distributor

| Fato | Implicação |
|------|------------|
| UC tem `distributorId` | Identidade da UC |
| Plant tem só `distributor` string legado | Sem FK formal |
| Autoconsumo remoto (REN, doc D3) | Tipicamente **mesma** distribuidora |

**Regra no MVP 4.3:** **NÃO** validar compatibilidade Distributor Plant×UC automaticamente.

**Status:** **PENDENTE DE VALIDAÇÃO REGULATÓRIA** + evolução quando Plant ganhar Distributor formal.

---

## 22. Customer × Consumer × User

| Entidade | Papel no Rateio |
|----------|-----------------|
| Customer | Dono operacional da Plant; **não** destino do Rateio |
| Consumer | Titular da UC; acessível via ConsumerUnit |
| User | Acesso/autorização; opcional em `createdBy` |
| ConsumerUnit | **Único destino** do Rateio |

```
Customer ≠ Consumer ≠ User
Rateio → ConsumerUnit → Consumer
Rateio → Plant → Customer (somente navegação)
```

---

## 23. Tenancy

- **Não** criar `tenantId` no Rateio agora.
- Isolamento atual: JWT + permissions (cadastro energético global do operador, como 4.1).
- Modelo deve permitir evolução futura (ex.: scope por Customer da Plant via join) **sem** exigir tenant global hoje.

**Status:** **APROVADO PELO DOCUMENTO** (sem tenantId)

---

## 24. Modelo conceitual

```
Customer
   └── Plant (O&M + legado consumerUnit/distributor strings)
          │
          │ 1:N
          ▼
   EnergyAllocation  (status RecordStatus)
          │ plantId + consumerUnitId  UNIQUE
          │
          │ 1:N
          ▼
   EnergyAllocationVersion
          │ percentage Decimal
          │ effectiveFrom
          │ effectiveTo?
          │ createdBy? reason?
          │
          └──────────────┐
                         │ N:1
                         ▼
                  ConsumerUnit → Consumer
                               → Distributor

Monitoring / AUXSOL ⟂ Rateio
```

Label UI: **Rateio** / **Histórico de Rateio**.

---

## 25. Constraints (conceituais para o 4.3)

1. FK `plantId` → Plant (RESTRICT)  
2. FK `consumerUnitId` → ConsumerUnit (RESTRICT)  
3. FK `energyAllocationId` → EnergyAllocation (CASCADE de versões só se Allocation for removida — mas Allocation **não** é removida no MVP)  
4. `UNIQUE(plantId, consumerUnitId)`  
5. `percentage` Decimal, `> 0` e `≤ 100`  
6. Sem sobreposição de vigência no mesmo Allocation (app + transaction; índice auxiliar opcional)  
7. Índices: `(plantId, status)`, `(consumerUnitId)`, `(energyAllocationId, effectiveFrom)`  
8. Composição Σ% = 100 **por Plant em T** — regra de **aplicação** (não constraint SQL trivial)

---

## 26. Concorrência

Cenário: dois usuários criam versão com mesmo `effectiveFrom` no mesmo Allocation.

**Estratégia recomendada (4.3):**

1. Transação  
2. `SELECT … FOR UPDATE` no `EnergyAllocation` (ou lock do conjunto Plant)  
3. Revalidar sobreposição e composição  
4. Unique parcial / rejeição por ConflictException se conflito  

Não exigir optimistic locking complexo no MVP além de lock transacional.

---

## 27. Transações

Obrigatoriamente atômicas:

| Operação | Conteúdo |
|----------|----------|
| Nova versão | Fechar versão anterior + inserir nova |
| Substituir composição da Plant | Encerrar/criar versões de **várias** UCs + validar Σ=100% |
| Inativar Allocation | Update status (+ opcionalmente fechar versão aberta) |

Falha parcial → **ROLLBACK**.

---

## 28. Atomicidade do conjunto

```
ANTES: UC1=50, UC2=30, UC3=20
DEPOIS: UC1=60, UC2=20, UC3=20
```

- Três `EnergyAllocation` (vínculos)  
- Uma **operação de composição** da Plant (API batch recomendada no 4.3)  
- Uma transação  
- Validação Σ=100% **no fim** do batch, não linha a linha isolada sem o conjunto  

**Status:** **APROVADO PELO DOCUMENTO**

---

## 29. Multi-Plant

```
Plant A → UC1 50%   (conjunto A soma 100% com outras UCs de A)
Plant B → UC1 40%   (conjunto B independente)
```

- Cada Plant tem **seu próprio** conjunto de composição.  
- **Não** há conjunto global único Plant×UC×todas-usinas.  
- Sem prioridade entre Plants no MVP.  

**Status:** **APROVADO PELO DOCUMENTO** (modelo); uso de negócio **RECOMENDADO AO PO**

---

## 30. Multi-UC

```
Plant A → UC1 50% + UC2 30% + UC3 20% = 100%
```

- Válido e núcleo do produto.  
- 80% / 120% → rejeitar (se regra de soma aprovada).  
- Remover UC3 → redistribuir e versionar atomicamente.

---

## 31. Ciclo de vida

```
ACTIVE ⇄ INACTIVE
```

- **Sem DRAFT** no MVP.  
- Versões não têm status próprio além da vigência (encerrada/atual/futura derivado das datas).  
- Allocation INACTIVE ≠ apagar versões.

---

## 32. Regulação

### PONTOS QUE EXIGEM VALIDAÇÃO REGULATÓRIA

1. Mesma distribuidora em autoconsumo remoto / compartilhada  
2. Figuras de geração compartilhada (consórcio/coop)  
3. Quando 1 UC pode receber de múltiplas centrais geradoras  
4. Ordem/prioridade de alocação perante a distribuidora (Lei 14.300 art. 12)  
5. Relação entre percentuais B7 e percentuais oficiais informados à distribuidora  

### Separação

| Tipo | Exemplos |
|------|----------|
| **DECISÃO TÉCNICA** | EnergyAllocation+Version; Decimal; RESTRICT; soft delete; lock |
| **DECISÃO DE NEGÓCIO (PO)** | Soma 100% rígida; UC←N Plants no MVP; retroativo; createdBy; precisão 4 vs 2 casas; saldo usina |
| **DECISÃO REGULATÓRIA** | Compatibilidade Distributor; modalidades SCEE; ordem oficial |

---

## 33. Legacy `Plant.consumerUnit`

| Regra | |
|-------|--|
| Permanece legado | Sim |
| Usar no Rateio | **Não** |
| Migrar automaticamente no 4.3 | **Não** |
| Transformar em FK | **Não** |
| Remover/renomear | **Não** |

Idem `Plant.distributor` string.

---

## 34. Recomendações oficiais (resumo)

1. Entidade: **`EnergyAllocation`** (UI: Rateio)  
2. Relação: Plant **N:N** ConsumerUnit **via** Allocation  
3. Versionamento: **`EnergyAllocationVersion`**  
4. Vigência: `effectiveFrom` + `effectiveTo` (NULL = aberta); semiaberto recomendado  
5. Percentual: Decimal; só % no MVP  
6. Composição: Σ=100% **por Plant em T** (recomendado ao PO)  
7. Histórico: imutabilidade de versões passadas (corrigir = nova versão / política retroativa PO)  
8. Alterações: futuras OK; retroativas pendentes PO (default rejeitar)  
9. Inativação: soft; sem DELETE  
10. Concorrência: transaction + row lock  
11. Auditoria: timestamps + `createdBy`/`reason` recomendados  
12. Fora: crédito, compensação, kWh, billing, monitoring, legado Plant strings  

---

## 35. Decisões

| DECISÃO | RECOMENDAÇÃO | JUSTIFICATIVA | STATUS |
|---------|--------------|---------------|--------|
| Nome técnico | `EnergyAllocation` | V2.1; evita colisão com UI “Rateio” | **APROVADO PELO DOCUMENTO** |
| Nome UI | Rateio | Vocabulário produto | **APROVADO PELO DOCUMENTO** |
| Estrutura | Allocation + Version | Histórico sem sobrescrita | **APROVADO PELO DOCUMENTO** |
| Destino | ConsumerUnit | Modelo D / 4.1 | **APROVADO PELO DOCUMENTO** |
| Origem | Plant | Modelo D | **APROVADO PELO DOCUMENTO** |
| N:N via Rateio | Sim | D3 / V2.2 | **APROVADO PELO DOCUMENTO** |
| 1 Plant → N UC | Sim | Núcleo | **APROVADO PELO DOCUMENTO** |
| 1 UC → N Plant | Permitir no modelo | Flexível; composição por Plant | **RECOMENDADO AO PO** |
| Critério MVP | Somente % | Lumi/V2.1; simples | **APROVADO PELO DOCUMENTO** |
| Decimal | Sim, nunca Float | Precisão financeira/energética de regra | **APROVADO PELO DOCUMENTO** |
| Precisão | Decimal(7,4) | Terços etc. | **RECOMENDADO AO PO** |
| Soma 100% | Por Plant em T | Evita configuração incompleta | **RECOMENDADO AO PO** |
| Sobreposição mesma Allocation | Proibida | Ambiguity | **APROVADO PELO DOCUMENTO** |
| Alteração futura | Permitida | Operação normal | **APROVADO PELO DOCUMENTO** |
| Alteração retroativa | Default rejeitar | Segurança | **PENDENTE** (default se PO silente) |
| DELETE físico | Não | Preservar histórico | **APROVADO PELO DOCUMENTO** |
| Status | RecordStatus | Padrão projeto | **APROVADO PELO DOCUMENTO** |
| DRAFT | Não | Desnecessário MVP | **APROVADO PELO DOCUMENTO** |
| Compat. Distributor | Não validar no 4.3 | Plant sem FK; regulatório | **BLOQUEADO POR REGULATÓRIO** / adiado |
| tenantId | Não | Sem Organization | **APROVADO PELO DOCUMENTO** |
| createdBy/reason | Recomendado | Padrão Alert | **RECOMENDADO AO PO** |
| Prioridade/ordem | Fora MVP | Evolução | **FORA DO ESCOPO** |
| kWh no Rateio | Proibido | Regra ≠ resultado | **APROVADO PELO DOCUMENTO** |
| Usar Plant.consumerUnit | Proibido | Legado | **APROVADO PELO DOCUMENTO** |
| Acoplar Monitoring | Proibido | Separação de domínios | **APROVADO PELO DOCUMENTO** |

---

## 36. Pendências (checklist PO antes do 4.3)

1. [ ] Confirmar Σ% = 100% rígida por Plant  
2. [ ] Confirmar Decimal(7,4) vs (5,2)  
3. [ ] Confirmar UC←N Plants no MVP  
4. [ ] Política de alteração retroativa  
5. [ ] Exigir `createdBy` / `reason`?  
6. [ ] Existe “saldo usina” como linha de rateio?  
7. [ ] Aprovar este documento como fonte de verdade do 4.3  

---

## 37. Fora do escopo

Credit Engine · Compensation · MonthlyBalance · Billing · Collection · faturas distribuidora · cálculo geração/consumo · Association/Consortium · migração legado Plant · Organization/tenantId · portal consumidor · escopo membership por UC · ordem/prioridade regulatória oficial.

---

## 38. Preparação para Sprint 4.3

### Ordem sugerida de implementação

1. Prisma: `EnergyAllocation` + `EnergyAllocationVersion` (migration **aditiva**)  
2. Permissions: `ENERGY_ALLOCATIONS_VIEW|CREATE|UPDATE` (sem DELETE ou DELETE = inativar)  
3. Service: CRUD vínculo + nova versão + batch composição Plant (transação)  
4. Validações: existência, %, sobreposição, Σ, Plant/UC ACTIVE  
5. API REST alinhada ao padrão Nest atual  
6. Testes obrigatórios do prompt 4.3  
7. UI Rateio + histórico  
8. Doc `domain-energy-rateio-4.3.md` pós-implementação  

### Endpoints conceituais (orientação; 4.3 detalha)

```
GET    /api/energy-allocations
GET    /api/energy-allocations/:id
POST   /api/energy-allocations
PATCH  /api/energy-allocations/:id          (metadados/status; não sobrescrever %)
POST   /api/energy-allocations/:id/versions
GET    /api/energy-allocations/:id/versions
POST   /api/plants/:plantId/energy-allocations/composition   (batch atômico — recomendado)
```

### Exemplos (regras aprovadas/recomendadas)

**Exemplo 1 — 50/50**

```
Plant A
  UC1 50%
  UC2 50%
Σ = 100%
```

**Exemplo 2 — três UCs**

```
Plant A
  UC1 40% · UC2 30% · UC3 30%
```

**Exemplo 3 — versionamento**

```
Allocation (Plant A, UC1)
  V1: 01/01 → 30/06 = 50%
  V2: 01/07 → NULL  = 60%
```

(Composição da Plant nas duas datas deve continuar Σ=100% com as outras UCs.)

**Exemplo 4 — sobreposição**

```
V1: 01/01→31/12 e V2: 01/06→NULL no mesmo Allocation → REJEITAR
```

**Exemplo 5 — futura**

```
Fechar V atual em 01/07/2027; abrir V nova 01/07/2027 → NULL  (mesma TX)
```

**Exemplo 6 — UC INACTIVE**

```
Não criar novo vínculo; não nova versão; histórico permanece
```

**Exemplo 7 — Plant INACTIVE**

```
Mutações de Rateio bloqueadas; histórico permanece
```

---

## Checklist de aceite Sprint 4.2

- [x] Documentos oficiais analisados  
- [x] Código/schema auditados  
- [x] Plant / UC / Consumer / Distributor analisados  
- [x] Legado `Plant.consumerUnit` preservado conceitualmente  
- [x] Cardinalidade definida ou marcada pendente  
- [x] Estrutura Rateio recomendada  
- [x] Versionamento / vigência / sobreposição definidos  
- [x] Percentual / composição definidos ou RECOMENDADO AO PO  
- [x] Atomicidade / auditoria / inativação / DELETE definidos  
- [x] Concorrência / Distributor / tenancy analisados  
- [x] Fronteiras Rateio×Crédito/Geração/Consumo/Compensação  
- [x] Monitoring/AUXSOL fora do domínio  
- [x] Nenhum código de produção alterado  
- [x] Nenhuma migration criada  
- [x] Documento `domain-energy-rateio-4.2.md` criado  

---

*Fim — Domínio 4.2 Especificação do Rateio. Aguardar aprovação do Product Owner antes do Sprint 4.3.*
