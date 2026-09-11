# B7 Solar Plataforma de Gestão
# Decisões de Domínio V2.2

**Tipo:** análise + matriz de decisão (sem implementação)  
**Base:** `docs/architecture/domain-spec-v2.1.md` + código real + Sprint 18  
**Referência funcional externa:** reunião/análise Lumi (contexto PO)  
**PDF `Apresentação Plataforma Lumi - 2026.pdf`:** **NÃO ENCONTRADO NO REPOSITÓRIO** nesta inspeção

---

## 0. Mapeamento D3–D6 + D9 (V2.1 → este documento)

Códigos **explicitamente numerados** em `domain-spec-v2.1.md` §25:

| Código V2.1 | Tema na V2.1 | Seção neste documento |
|-------------|--------------|------------------------|
| **D3** | UC geradora/OC vs UC consumidora | §6 (Decisão 3) |
| **D4** | Significado real de `Plant.consumerUnit` | §6 + §14 |
| **D5** | Cardinalidade Consumer ↔ UC | §7 (parte UC) |
| **D6** | Consumer ↔ múltiplas usinas | §7 (parte Usina) |
| **D9** | Modelo oficial de crédito (expiração, prioridade, GD) | §9 (Decisão 6 — regras regulatórias) |

Para permitir ao PO fechar o Cadastro Energético Mínimo, este documento também analisa decisões adjacentes da V2.1:

| Código V2.1 | Tema | Seção |
|-------------|------|-------|
| D1 | Organization/Empresa | §4 |
| D2 | Titularidade da usina | §5 |
| D8 | Association / Consortium / Cooperativa | §8 |
| D11 | Remuneração comercial | §10 |
| D12 | Fonte de dados das distribuidoras | §11 |
| D13 | Investor entidade vs role | §12 |
| D15 | Escopo membership por UC | §13 |

**Sem ambiguidade de código:** os IDs acima são os da V2.1; não foram reinventados.

---

## 1. Fontes consultadas

| Fonte | Resultado |
|-------|-----------|
| Schema Prisma / `Plant` / `Customer` / `UserMembership` | Confirmado |
| `plants.service.ts`, `common/dto.ts`, Web `usinas/*` | Uso real de `distributor` / `consumerUnit` |
| `seed.ts` | `consumerUnit: '000000000'` (placeholder) |
| `identity-authorization.md` | Role ≠ Scope |
| `domain-spec-v2.1.md` | Pendências e princípios |
| PDF Lumi no repo/Desktop | **NÃO ENCONTRADO** |
| Insights Lumi | apenas do contexto de reunião/auditoria já registrado na V2.1 |

---

## 2. Lumi não é especificação arquitetural do B7

- Lumi = **benchmark funcional** (telas, jornadas, vocabulário de produto).
- B7 = arquitetura própria ancorada em Monitoramento + Identity V2 já existentes.
- Entidades só nascem com domínio validado.
- Nomenclatura jurídica (OC, UG, SCEE, GD…) exige validação — **não inferir de apresentação comercial**.
- Regras regulatórias **não** serão inventadas pelo software a partir de slides.

---

## 3. Insights funcionais (referência Lumi)

Registrados como **REFERÊNCIA FUNCIONAL** (não arquitetura oficial B7):

- Dashboards com geração, consumo, compensação, saldo de créditos e faturamento estimado.
- **Balanço Mensal por UC** com consumo, energia compensada, faturamento, saldo e economia (para conferência antes da cobrança).
- **Alocação de créditos** acompanhando consumo/compensação/saldo e possibilidade de **refazer rateio**.
- Aquisição/processamento de faturas de usinas e UCs; auditoria; inconsistências.
- Faturamento B7 distinto da fatura da distribuidora; inadimplência; onboarding usinas/consumidores/UCs/rateios.
- Rateio percentual multi-beneficiário (ex.: A 30% / B 25% / … / saldo usina).
- Consumidores com **geração própria** tratados de forma distinta na leitura de fatura (bruto / injetada / líquida) — regra exata **não congelada**.

---

## 4. Decisão 1 — Organization / Empresa (V2.1 D1)

### Contexto (código)

- `Customer` = conta com `name`, `document`, contatos, `status`; dono de `Plant[]`; alvo de `User.customerId` e `UserMembership.customerId`.
- **Não** há tabela Organization/Tenant.
- Evidência de “empresa/tenant multi-empresa”: **fraca** — Customer funciona como **conta operacional única por cliente**, não como plataforma multi-tenant formal.

### Opções

| | OPÇÃO A | OPÇÃO B | OPÇÃO C |
|--|---------|---------|---------|
| Definição | Manter **Customer** como contexto principal agora | Introduzir **Organization** agora | Introduzir Organization **depois**, com Customer como “conta filha” |
| Banco | Sem mudança estrutural grande | Nova entidade + FKs em Plant/User/Membership | Migração faseada |
| Autorização | Membership já usa `customerId` | Novo scope `organizationId` | Evolução do Membership |
| Módulos | Baixo impacto | Alto (CRUD, filtros, seeds, e2e) | Médio no futuro |
| Risco migração | Baixo | Alto se prematuro | Controlado |
| Impacto futuro | Pode precisar de Organization depois | Evita retrabalho se multi-empresa for certo | Flexível |

### Avaliação

- User.customerId legado **depende** de Customer.
- Plant **pertence** a Customer.
- UserMembership **usa** Customer como scope.
- **É possível adiar Organization** sem bloquear Distributor/UC/Consumer/Rateio, desde que se aceite Customer como “conta dona da usina” no curto prazo.

### Recomendação técnica

**OPÇÃO A (adiar Organization)** para o Cadastro Energético Mínimo.

### Status

**DECISÃO DO PRODUCT OWNER** (confirma se haverá multi-empresa/holding no horizonte próximo).

---

## 5. Decisão 2 — Titularidade da Usina (V2.1 D2)

### Separações obrigatórias

```
TITULARIDADE  ≠  ACESSO  ≠  OPERAÇÃO  ≠  INVESTIMENTO
```

| Dimensão | Significado | Hoje no B7 |
|----------|-------------|------------|
| Titularidade | Quem figura juridicamente perante distribuidora/ANEEL | **NÃO MODELADO** (só `Plant.customerId`) |
| Acesso | Quem entra no sistema | User + role + membership |
| Operação | Quem opera O&M | Staff (ADMIN/OPERADOR/…) |
| Investimento | Quem detém resultado econômico | Role INVESTIDOR; sem entidade Investor |

### Opções de titular (futuro)

| Candidato | Prós | Contras |
|-----------|------|---------|
| Customer | Já existe FK | Mistura conta operacional com papel jurídico |
| Organization | Limpo se multi-empresa | Entidade ainda não decidida |
| Investor | Alinha portal investidor | Investidor ≠ necessariamente titular legal |
| Association / Consortium | Alinha Lumi | **VALIDAÇÃO JURÍDICA/REGULATÓRIA** |
| Entidade Titular genérica | Flexível | Mais complexidade |

### Modelo conceitual de trabalho (não congelado)

```
[Titular?] ──possui──► Usina ──operada via──► Staff / Integrações
                │
                ├── acesso Investidor (membership / Investor?)
                └── energia → Rateio → UC → Consumer
```

### Status

- **Decisão de domínio:** titularidade **não** deve ser confundida com User login.
- **Decisão de produto + jurídico:** quem é o titular no B7.
- **STATUS: DECISÃO DO PRODUCT OWNER + VALIDAÇÃO JURÍDICA** quando Association/Consortium entrarem.

---

## 6. Decisão 3 — UC geradora / OC / UC consumidora (V2.1 D3) + D4

### 6.1 Evidência de `Plant.consumerUnit` (D4)

| Local | Evidência |
|-------|-----------|
| Prisma | `consumerUnit String?` em `Plant` |
| Migration inicial | coluna TEXT desde o schema base |
| DTO create | **obrigatório**, mensagem: “Informe a unidade consumidora.” |
| Web lista/detalhe | label **“Unidade consumidora”** / “UC …” |
| Seed | `'000000000'` (placeholder, não regra de negócio) |
| Código | grava/trim string; **sem FK**, sem validação de formato ANEEL, sem OC |

**Conclusão factual:**

- Representa um **texto livre** associado à usina, rotulado como UC no produto.
- **Não** há evidência no código de que seja “UC beneficiária de terceiro” vs “UC/OC da própria usina”.
- Conceito **OC** / **UG**: **NÃO ENCONTRADO NO CÓDIGO ATUAL**.
- É **legado/cadastro operacional simplificado**, não entidade UC.

### 6.2 Conceitos a distinguir (sem inventar direito)

| Conceito | Papel típico (produto) | No B7 hoje |
|----------|------------------------|------------|
| Usina (`Plant`) | Ativo de geração + O&M | Existe |
| UC consumidora / beneficiária | Ponto de consumo que recebe compensação | Só string ambígua |
| UC geradora / UG / OC | Identificação junto à distribuidora do ponto de geração | **NÃO ENCONTRADO**; pode ser o que `consumerUnit` tentou capturar |

### 6.3 Status D3/D4

```
DECISÃO PENDENTE — NECESSITA VALIDAÇÃO DO PRODUCT OWNER / ESPECIALISTA REGULATÓRIO.
```

**Não** apagar, renomear ou migrar `Plant.consumerUnit` até essa validação.

---

## 7. Decisão 4 — Cardinalidade Consumer ↔ UC ↔ Usina (V2.1 D5 + D6)

### Cenários

| Cenário | Relação | Leitura |
|---------|---------|---------|
| A | 1 Consumer → 1 UC → 1 Usina | Mais simples; insuficiente se rateio multi-beneficiário for o núcleo |
| B | 1 Consumer → N UCs → 1..N Usinas | Flexível comercialmente |
| C | 1 UC → 1 Consumer → N Usinas | UC com várias usinas via rateio; consumer 1:1 UC |
| D | 1 UC → N vínculos de compensação → N Usinas | Rateio como entidade de ligação (independente do cadastro 1:1) |

### O que a referência Lumi sugere (não prova regra B7)

- Rateio % de **uma usina → vários consumidores/UCs**.
- Balanço e alocação **por UC**.
- Possibilidade de refazer rateio → vínculos **N:N via Rateio**, não 1:1 rígido Usina–Consumer.

### Cardinalidade proposta (hipótese de trabalho)

```
Usina 1 ──< Rateio (histórico) >── N UC
UC     1 ──< (tipicamente) 1 Consumer   [DECISÃO PENDENTE se N Consumers/UC]
Consumer 1 ──< N UC                    [DECISÃO PENDENTE — D5]
```

Ou seja: **o relacionamento Usina↔UC deve ser mediado por Rateio (N:N versionado)**; cadastro Consumer↔UC ainda exige PO.

### Nível de confiança

| Trecho | Confiança |
|--------|-----------|
| Usina ↔ UC via Rateio (N:N) | **MÉDIO** (forte na referência funcional; alinhado à V2.1) |
| Consumer ↔ UC 1:1 vs 1:N | **BAIXO** — **DECISÃO DO PRODUCT OWNER (D5)** |
| Consumer ↔ múltiplas usinas | **MÉDIO** se via UCs+rateios; **BAIXO** se vínculo direto — **D6** |

---

## 8. Decisão 5 — Associação / Consórcio / Cooperativa (V2.1 D8)

| Pergunta | Resposta atual |
|----------|----------------|
| Entidades próprias? | Possivelmente no longo prazo |
| Tipos de Customer? | **Não** recomendar `CustomerType` agora |
| Abstrair no Cadastro Energético Mínimo? | **Sim — adiar** |
| Necessidade imediata? | **Não** evidenciada no código B7 |
| Risco de modelar errado agora? | **Alto** (jurídico ≠ comercial ≠ software) |

Separar:

- conceito **comercial** (como o time vende)
- conceito **jurídico/regulatório** (ANEEL / contrato)
- conceito **software** (tabela/FK)

### Status

**DECISÃO PENDENTE — VALIDAÇÃO REGULATÓRIA / JURÍDICA + PO.**  
Não bloquear Distributor/UC/Consumer/Rateio se titularidade puder ficar temporariamente em Customer.

---

## 9. Decisão 6 — Regras regulatórias / crédito (V2.1 D9 + D10)

### Regras que NÃO devem ser inventadas pelo software

- geração própria (bruto / injetada / líquida)
- energia compensada vs crédito vs saldo
- expiração / prioridade / ordem de uso de créditos
- modalidades GD / SCEE aplicáveis ao B7
- definição legal de UC geradora / beneficiária / OC
- regras específicas por distribuidora
- remuneração regulada vs comercial

### Separação arquitetural futura (congelar como princípio)

```
DADO OBSERVADO          (telemetria, fatura importada)
  ≠ CÁLCULO DERIVADO    (agregações, balanço)
  ≠ REGRA REGULATÓRIA   (como a lei/distribuidora manda compensar)
  ≠ REGRA COMERCIAL     (desconto B7, split Ultraclube, etc.)
```

**D9 (modelo oficial de crédito):** **VALIDAÇÃO REGULATÓRIA NECESSÁRIA** — sem ela, **não** implementar Credit/Compensation engines.

---

## 10. Decisão 7 — Remuneração comercial (V2.1 D11)

### Conceitos

percentual de desconto; remuneração; tarifa; regra por usina/consumidor/contrato; vigência; histórico.

### Onde deve morar (futuro)

| Camada | Casa candidata |
|--------|----------------|
| REGRA REGULATÓRIA | motor/config de Gestão de Energia (não no Monitoramento) |
| RATEIO | entidade Rateio (energia/alocação) |
| CRÉDITO | ledger energético |
| REGRA COMERCIAL / REMUNERAÇÃO | módulo Faturamento (versionado), referenciando Balanço |

```
REGRA COMERCIAL ≠ REGRA REGULATÓRIA ≠ RATEIO ≠ CRÉDITO
```

**Não** criar motor de precificação agora.  
**STATUS: DECISÃO DO PRODUCT OWNER** sobre produtos/contratos; implementação só após Balanço energético mínimo.

---

## 11. Decisão 8 — Fonte de dados das distribuidoras (V2.1 D12)

Arquitetura futura (sem inventar API):

```
Distributor
   ↓
Adapter / Provider (por distribuidora)
   ↓
Document / Data Acquisition
   (portal + login autorizado | procuração | upload manual | API oficial se existir)
   ↓
Invoice Processing → validação → inconsistência → tratativa
```

Diferentes distribuidoras podem exigir mecanismos diferentes.  
Padrão alinhado a IntegrationEngine/adapters de fabricantes.

**STATUS:** princípio arquitetural recomendado; escolha de providers = **PO + integrações**.

---

## 12. Decisão 9 — Investidor (V2.1 D13)

| | Role `INVESTIDOR` | Entidade `Investor` |
|--|-------------------|---------------------|
| Existe hoje | Sim (Sprint 18) | Não |
| Serve para | permissions + membership plant/customer | titularidade econômica, contratos, receita |
| Portal | possível só com role+scope no curto prazo | útil se houver dados além do User |

### Recomendação

- **Curto prazo (portais MVP):** role + `UserMembership` (plant/customer) **suficiente**.
- **Médio prazo:** avaliar entidade Investor se houver atributos de negócio (participação societária, contratos, split de receita) que não caibam em User.

**STATUS: DECISÃO DO PRODUCT OWNER** (MVP só com role vs entidade cedo).

---

## 13. Escopo futuro por UC (V2.1 D15)

Modelo atual (Sprint 18):

```
User → Membership → role + scope(Customer | Plant)
```

Evolução possível **sem quebrar** o modelo:

```
User → Membership → role + scope(Customer | Plant | UC | Consumer)
```

O modelo atual **consegue evoluir** (novos FKs opcionais + `scopeKey`), desde que JWT continue pequeno e resolução continue server-side.

**Não alterar Sprint 18 nesta etapa.**

---

## 14. Tratamento do legado `Plant.consumerUnit`

| Item | Registro |
|------|----------|
| Onde existe | Prisma `Plant`, migration inicial, DTO, Web usinas, seed |
| Como é usado | Cadastro/edição/listagem/detalhe; filtro de busca |
| Significado atual | Texto livre rotulado “Unidade consumidora” — **ambíguo** (D4) |
| Dados dependentes | Valores em DB de plantas existentes; seed `000000000` |
| Risco de remoção | **Alto** — quebra formulários e dados |
| Risco de interpretação | Tratar como UC beneficiária ou geradora sem validação |
| Estratégia recomendada | **Preservar**; quando UC existir, mapear/migrar com regra explícita do PO; até lá, documentar como legado |

**Não remover. Não renomear. Não migrar. Não criar UC substituta nesta etapa.**

---

## 15. Matriz de decisões

| ID | Tema | Situação atual | Opções | Recomendação | Confiança | PO necessário | Regulatório |
|----|------|----------------|--------|--------------|-----------|---------------|-------------|
| D1 | Organization | Só Customer | A adiar / B criar agora / C faseado | **A adiar** | Média | Sim | Não |
| D2 | Titular usina | `Plant.customerId` | Customer / Org / Investor / Assoc… | Separar titularidade de acesso; titular formal TBD | Baixa | Sim | Se Assoc/Consórcio |
| D3 | UC geradora/OC vs consumidora | Sem entidades; nomenclatura aberta | Separar UG/OC vs UC benef. ou unificar | **Não congelar** | Baixa | Sim | **Sim** |
| D4 | `Plant.consumerUnit` | String obrigatória na UI | Legado / UC geradora / UC benef. | Preservar; interpretar após PO | Baixa | Sim | Ajuda |
| D5 | Consumer↔UC | Não existe | 1:1 vs 1:N | Pendente PO | Baixa | **Sim** | Não |
| D6 | Consumer↔Usinas | Não existe | Direto vs via UC+Rateio | Via UC+Rateio | Média | Sim | Não |
| D8 | Assoc/Consórcio | Não existe | Entidade / tipo / adiar | **Adiar** | Média | Sim | **Sim** |
| D9 | Modelo crédito | Não existe | — | Não implementar motor | — | Apoio | **Sim** |
| D10 | Compensação / ger. própria | Não existe | — | Não inventar | — | Apoio | **Sim** |
| D11 | Remuneração comercial | Não existe | Por usina/contrato… | Morar no Faturamento | Média | **Sim** | Não |
| D12 | Fonte dados distrib. | Só string | Adapter multi-mecanismo | Adapter/Provider | Alta (padrão) | Sim (providers) | Parcial |
| D13 | Investor entidade | Só role | Role+scope vs entidade | MVP role+scope | Média | Sim | Não |
| D15 | Scope UC | Só customer/plant | Estender membership | Evoluir depois | Alta | Sim (quando UC) | Não |

---

## 16. Matriz “Pode implementar agora?”

Pergunta: domínio fechado o bastante para implementar **sem alto risco de retrabalho**?

| Conceito | Pode implementar agora? | Motivo |
|----------|-------------------------|--------|
| Distributor | **Condicional** | Conceito claro; depende só de não misturar com string Plant |
| UC | **Não (ainda)** | D3/D4/D5 abertos — alto risco de modelar geradora vs beneficiária errado |
| Consumer | **Não (ainda)** | D5/D6 abertos |
| Rateio versionado | **Não (ainda)** | Depende de UC (+ usina); cardinalidade em aberto |
| Credit | **Não** | D9 regulatório |
| Compensation | **Não** | D9/D10 |
| MonthlyBalance | **Não** | Depende de UC + regras |
| Investor (entidade) | **Não** | D13 — role basta no curto prazo |
| Organization | **Não** | D1 — recomendado adiar |
| Association / Consortium | **Não** | D8 regulatório |

**Conclusão:** Cadastro Energético Mínimo completo (**Distributor + UC + Consumer + Rateio**) **ainda está bloqueado** pelas decisões D3–D6 e D9 até o PO/regulatório responder.

Possível fatia **mais segura** após PO fechar só Distributor: cadastro de **Distributor** isolado (sem UC), se o PO priorizar — ainda assim **aguardar revisão**, não implementar nesta etapa.

---

## 17. Modelo conceitual provisório (trabalho)

```
CUSTOMER  (conta operacional — preservar)
   │
   ├── USER + MEMBERSHIP (role + scope customer/plant → UC/Consumer no futuro)
   │
   └── USINA (Plant)
          │
          ├── MONITORAMENTO (já existe — não misturar)
          │
          ├── distributor String / consumerUnit String  ← LEGADO
          │
          └── GESTÃO DE ENERGIA (futuro)
                 │
                 ├── Distributor (entidade)
                 ├── UC (beneficiária e/ou geradora — TBD D3)
                 ├── Consumer
                 ├── Rateio (histórico) Usina ↔ UC
                 ├── Crédito / Compensação (após D9)
                 └── Balanço Mensal
                        │
                        └── Faturamento B7 / Cobrança (depois)
```

**Hipótese de trabalho — não é decisão congelada.**

---

## 18. Respostas-guia para o Product Owner

1. **Customer?** Conta operacional dona de usinas + contexto de membership; não é Consumer/Organization formal.  
2. **Organization agora?** Recomendação técnica: **não**; confirmar com PO.  
3. **Titular da Usina?** Não modelado; hoje só Customer FK — titularidade jurídica TBD.  
4. **UC?** Entidade futura; hoje só texto em Plant.  
5. **Consumer?** Entidade futura ≠ User role ≠ Customer.  
6. **UC geradora?** Não definida no código — D3.  
7. **OC?** Não existe no código — D3.  
8. **`Plant.consumerUnit`?** Texto legado “unidade consumidora”; significado preciso = D4.  
9. **UCs por consumidor?** D5 — pendente.  
10. **Usinas por UC?** Proposta via Rateio N:N — confiança média; confirmar.  
11. **Association/Consortium?** Adiar; validação jurídica.  
12. **Rateio?** Alocação versionada usina→UC.  
13. **Crédito?** Saldo energético regulado — D9.  
14. **Compensação?** Uso do crédito no ciclo — D9/D10.  
15. **Regras comerciais?** Futuro módulo Faturamento.  
16. **Regras regulatórias?** Config/motor de Gestão de Energia — não inventar.  
17. **Investor?** Role hoje; entidade opcional depois.  
18. **Scope UC?** Extensão natural do Membership — depois da entidade UC.

---

## 19. Recomendação para o próximo sprint

**NÃO implementar** Cadastro Energético Mínimo completo ainda.

### Bloqueios críticos

- **D3 / D4** — sem definição UC geradora/OC vs beneficiária e significado de `consumerUnit`
- **D5 / D6** — cardinalidades Consumer/UC/Usina
- **D9** — modelo de crédito (não precisa para cadastro mínimo, mas precisa para não prometer “energia completa” cedo demais)

### O que o PO deve fechar para destravar a próxima implementação

1. O que é `Plant.consumerUnit` na operação real B7?  
2. Usina terá UC/OC de geração separada da UC beneficiária?  
3. Consumer pode ter N UCs?  
4. Rateio é sempre Usina→UC (N:N versionado)?  

### Após essas respostas

Recomendar sprint: **Cadastro Energético Mínimo** = Distributor + UC + Consumer + relacionamentos + Rateio versionado — **sem** Credit engine, **sem** Billing, **sem** alterar Monitoramento.

Até lá: **aguardar revisão do Product Owner.**

---

## 20. Checklist desta etapa

- [x] Documento `domain-decisions-v2.2.md` criado  
- [x] D3–D6 e D9 mapeados sem reinventar códigos  
- [x] Sem alteração de schema / migration / APIs / Authorization / Monitoring / AUXSOL / Redis  
- [x] Lumi tratada como referência funcional  
- [x] PDF Lumi marcado como não encontrado no repo  

---

*Fim — Decisões de Domínio V2.2. Aguardar Product Owner.*
