# B7 Solar Plataforma de Gestão
# D3 — Modelo Conceitual de Unidade Consumidora

**Tipo:** análise e documentação de domínio (sem implementação)  
**Base:** código B7 + V2.1/V2.2 + auditoria `Plant.consumerUnit` + Lei 14.300/2022 + REN ANEEL 1.000/2021 (com alterações da REN 1.059/2023)  
**Referência funcional:** Lumi (não é especificação jurídica)  
**PDF Lumi:** NÃO ENCONTRADO NO REPOSITÓRIO (contexto de reunião/auditoria apenas)

---

## 0. Princípio fundamental

```
USINA / CENTRAL GERADORA
≠ UNIDADE CONSUMIDORA (UC)
≠ CONSUMIDOR
≠ CONSUMIDOR-GERADOR
≠ RATEIO / ALOCAÇÃO
≠ CRÉDITO
≠ COMPENSAÇÃO / ENERGIA COMPENSADA
≠ Plant.consumerUnit (legado textual)
≠ OC (Orçamento de Conexão)
```

Não tratar esses termos como sinônimos no modelo B7.

---

## 1. Fontes

| Fonte | Papel |
|-------|-------|
| Código B7 / Prisma / UI usinas | Legado existente |
| `plant-consumer-unit-legacy-audit.md` | Auditoria obrigatória do campo legado |
| `domain-spec-v2.1.md` / `domain-decisions-v2.2.md` | Pendências D3–D6 |
| Lei nº 14.300/2022 | Definições legais SCEE / MMGD |
| REN ANEEL nº 1.000/2021 (+ REN 1.059/2023) | Definições de UC, consumidor, modalidades |
| Páginas ANEEL GD / registro MMGD | Contexto institucional (fetch oficial timeout; conceitos cruzados via norma) |
| Material Lumi | Benchmark funcional |

**Confiança das citações normativas:** alta para trechos literais de Lei 14.300 e REN 1.000/1.059 obtidos na pesquisa. Detalhes operacionais de cada distribuidora: não inventados.

---

## 2. Definição de Unidade Consumidora (UC)

### Fonte oficial (REN ANEEL 1.000/2021, inciso L — consolidado)

**Unidade consumidora:** conjunto composto por instalações, ramal de entrada, equipamentos elétricos, condutores, acessórios e, no caso de conexão em tensão maior ou igual a 2,3 kV, a subestação, sendo caracterizado por:

1. recebimento de energia elétrica em **apenas um ponto de conexão**;
2. **medição individualizada**;
3. pertencente a **um único consumidor**; e
4. localizado em um **mesmo imóvel** ou em **imóveis contíguos**.

### Elementos relevantes para o B7

| Elemento | Implicação de domínio |
|----------|------------------------|
| Ponto de conexão | UC é instalação perante a **distribuidora** |
| Medição | Base de faturamento e de apuração injeção/consumo |
| Um único consumidor | Titularidade 1 consumidor ↔ 1 UC (por definição) |
| Imóvel/contíguos | Limite físico da UC |
| Faturamento | Ciclo da distribuidora opera sobre a UC |
| Identificação | Número/código da UC na distribuidora (dado cadastral futuro) |

**Não inventar definição própria:** a definição regulatória acima é a referência congelável.

---

## 3. Consumidor

### Fonte oficial (REN 1.000/2021, inciso VII)

**Consumidor:** pessoa física ou jurídica que solicite o fornecimento do serviço à distribuidora, assumindo as obrigações decorrentes desta prestação à sua unidade consumidora.

### Separações B7

| Conceito | O que é | O que não é |
|----------|---------|-------------|
| Consumidor (regulatório) | Titular da UC perante a distribuidora | Login do sistema |
| `User` + role `CONSUMIDOR` | Autorização (Sprint 18) | Entidade de negócio |
| `Customer` | Conta operacional dona de `Plant` | Consumidor regulatório |
| Consumer (futuro B7) | Entidade de negócio alinhada ao titular/beneficiário comercial | Automaticamente = User |

```
TITULARIDADE (Consumidor ↔ UC)
≠ ACESSO AO SISTEMA (User + Membership)
≠ BENEFÍCIO ENERGÉTICO (UC participante do SCEE / rateio)
```

---

## 4. Consumidor-gerador

### Fonte oficial (Lei 14.300/2022, art. 1º, V)

**Consumidor-gerador:** titular de unidade consumidora com microgeração ou minigeração distribuída.

### Caracterização

- É o **titular** da UC onde está a MMGD.
- Relaciona-se à **UC com MMGD** (não à usina como sinônimo).
- Relaciona-se à **central geradora** conectada **por meio das instalações** dessa UC (Lei 14.300 / REN: micro/minigeração = central geradora conectada via instalações de UC).

### Como modelar no B7 (sem implementar)

**Não criar** entidade `ConsumerGenerator`.

Tratar como:

- **papel/status do consumidor titular** da UC que possui MMGD; e/ou
- **característica da UC** (“UC com micro/minigeração”);

derivado do relacionamento UC ↔ geração — **não** como terceira pessoa distinta do consumidor titular.

**Confiança:** alta (definição legal literal).

---

## 5. Usina / Central geradora

### Fontes

- Lei 14.300: micro/minigeração = **central geradora** conectada à rede **por meio de instalações de unidades consumidoras**.
- REN 1.000: microgeração/minigeração distribuída definidas como **central geradora** … conectada … por meio de instalações de **unidade consumidora**.
- Código B7: `Plant` = ativo O&M (inversores, readings, alerts) — **não** é a definição regulatória de UC.

### Conclusão conceitual

```
USINA (Plant no B7)  ≈  representação operacional da CENTRAL GERADORA / ativo MMGD
UC                   =  instalação/medição perante a distribuidora
```

- Usina **≠** UC.
- A conexão regulatória da MMGD ocorre **via instalações de uma UC**.
- Portanto existe, no domínio, tipicamente uma **UC associada à conexão da geração** (UC do consumidor-gerador), distinta das UCs que apenas **recebem** excedentes/créditos.

**Não congelar** `Plant 1:1 ConsumerUnit` como regra única: modalidades remotas/compartilhadas exigem **N UCs**.

---

## 6. Autoconsumo local

### Fonte (Lei 14.300/2022, art. 1º, I)

Modalidade de MMGD eletricamente **junto à carga**, no SCEE, em que o excedente gerado por UC de titularidade de um **consumidor-gerador** é compensado ou creditado pela **mesma** unidade consumidora.

### Implicação B7

- Geração e carga na **mesma UC**.
- Rateio para outras UCs **não** é o núcleo desta modalidade.
- Monitoramento da usina ainda existe; gestão de energia do ciclo é predominantemente **UC única**.

---

## 7. Autoconsumo remoto

### Fontes

- Lei 14.300/2022, art. 1º, II  
- REN 1.059/2023 (inciso I-A consolidado na REN 1.000): UCs do **mesmo titular** (PF/PJ, incl. matriz/filial); UC com MMGD em **local diferente** das UCs que recebem excedentes; **mesma distribuidora**.

### Implicação B7

```
1 Consumidor-gerador (mesmo titular)
  ├── 1 UC com MMGD (local da geração)
  └── N UCs receptoras de excedente/crédito
         ↑
    mesma distribuidora
```

Relação **Usina ↔ N UCs** torna-se estrutural.  
Alocação de percentuais/ordem (Lei 14.300 art. 12 §4º) → futuro **Rateio**, não atributo embutido em Plant.

---

## 8. Geração compartilhada

### Fontes

- Lei 14.300/2022, art. 1º, X  
- REN 1.059/2023 (XXII-A): reunião de consumidores via **consórcio, cooperativa, condomínio civil voluntário ou edilício, ou outra associação civil**, com UC com MMGD; mesma distribuidora.

### Implicação B7

- Participantes = consumidores com UCs.
- Estrutura jurídica (consórcio/coop/associação) = **D8** — validação jurídica; **não criar** Association/Consortium nesta etapa.
- Benefícios distribuídos entre UCs participantes → **Rateio/alocação** futuro.
- Lumi e operação comercial B7 tipicamente se aproximam deste padrão (multi-beneficiário).

---

## 9. Múltiplas unidades consumidoras

### Fontes

- Lei 14.300/2022, art. 1º, VII  
- REN 1.059 (XIV-A): conjunto de UCs na mesma propriedade/contíguas; MMGD na UC das **áreas comuns**; responsabilidade do condomínio/administração/proprietário.

### Implicação B7

- Empreendimento (condomínio etc.) com várias UCs + uma UC de conexão da geração.
- Não implementar agora; reconhecer como modalidade SCEE distinta de geração compartilhada “clássica”.

---

## 10. UC beneficiária / participante

### Evidência normativa

- Lei 14.300 usa **“unidades consumidoras beneficiárias”** (ex.: art. 5º — destinação de créditos).
- Definição de SCEE (Lei / REN) fala em **unidades consumidoras participantes** do sistema.
- REN: “energia compensada” … de UC **participante** do SCEE.

### Posição B7 (nomenclatura)

| Termo | Uso proposto | Confiança |
|-------|--------------|-----------|
| **UC participante** | Nomenclatura interna B7 para UC no SCEE (recebe/compõe compensação) | Média-alta |
| **UC beneficiária** | Sinônimo funcional aceitável (aparece na Lei); preferir “participante” em modelo de dados para evitar ambiguidade comercial | Média |
| Terminologia da distribuidora | Preservar em integrações/faturas como dado externo | Alta |

**“Beneficiária” não é entidade distinta de UC** — é **papel da UC no SCEE/alocação**.

Não há evidência de um terceiro tipo regulatório além de: UC (com ou sem MMGD) + papel no rateio.

---

## 11. Relação UC ↔ Usina

### Modelos avaliados

| Modelo | Descrição | Adequação |
|--------|-----------|-----------|
| A | Usina → 1 UC | Só cobre bem autoconsumo local |
| B | Usina → UC de geração → N UCs participantes | Alinhado a remoto/compartilhada |
| C | UC ↔ N Usinas | Possível em casos especiais; não é o padrão MMGD típico B7 |
| **D** | Usina ↔ N UCs **via alocação/rateio** (+ UC de conexão da geração) | Flexível e alinhado a Lei 14.300 art. 12 |

### Modelo recomendado para o B7

**MODELO D (refinado):**

```
USINA (Plant / central geradora operacional)
   │
   ├── associada à UC COM MMGD
   │     (ponto de conexão da geração; titular = consumidor-gerador)
   │
   └── ALOCAÇÃO / RATEIO (futuro, versionado)
           │
           └── N UCs PARTICIPANTES
                 (podem incluir a própria UC com MMGD
                  e/ou outras UCs receptoras)
```

- Autoconsumo local: N=1 (só a UC com MMGD).  
- Remoto / compartilhada / múltiplas UCs: N≥1 com regras de titularidade/estrutura jurídica.

### Nível de confiança

**MÉDIO–ALTO** para a estrutura Usina–Rateio–UCs.  
**MÉDIO** para obrigar sempre modelar “UC com MMGD” como registro UC separado desde o dia 1 (PO pode priorizar só participantes no MVP — **pendente**).

---

## 12. Relação Consumer ↔ UC

| Dimensão | Relação regulatória | Uso B7 |
|----------|---------------------|--------|
| Titularidade | UC pertence a **um único** consumidor (REN) | Consumer 1 — N UC (mesmo titular, várias UCs) |
| Acesso sistema | User ↔ Membership | Independente da titularidade |
| Benefício energético | UC no rateio | Não exige ser o titular em todos os produtos comerciais — **DECISÃO PENDENTE PO** se B7 tiver “beneficiário comercial” ≠ titular |

### Proposta (hipótese de trabalho)

```
1 Consumer (titular) → N UCs
1 UC → 1 Consumer titular (regulatório)
```

**N Consumers → 1 UC:** incompatível com a definição REN de UC (um único consumidor), salvo figuras especiais não modeladas aqui → **não adotar** sem validação jurídica.

### Nível de confiança

**ALTO** para 1 UC → 1 titular.  
**MÉDIO** para 1 Consumer → N UCs (fortemente sustentado por autoconsumo remoto).  
**BAIXO** para “beneficiário comercial ≠ titular” — **PO**.

---

## 13. Rateio (somente conceito)

Rateio/alocação **não** cria a UC; apenas relaciona energia/excedente/crédito entre usina (via UC com MMGD) e UCs participantes.

```
USINA
  ↓
ALOCAÇÃO / RATEIO (%, ordem, vigência — futuro)
  ↓
UC PARTICIPANTE
```

Lei 14.300 art. 12 §4º: consumidor-gerador pode solicitar alteração de percentuais/ordem/realocação perante a distribuidora — reforça necessidade de **histórico**.

Rateio ≠ existência da UC ≠ crédito ≠ regra comercial B7.

---

## 14. Crédito (somente diferenciação)

### Fonte (Lei 14.300 art. 1º, VI; REN crédito de energia)

**Crédito de energia:** excedente não compensado no ciclo em que foi gerado/injetado, registrado para uso em ciclos posteriores (conforme regras aplicáveis).

| Termo | ≠ |
|-------|---|
| Geração / telemetria (`MonitoringReading`) | Crédito |
| Excedente | Crédito (excedente pode virar crédito se não compensado no ciclo) |
| Energia compensada | Crédito |
| Rateio | Crédito |

**Não** implementar Credit Engine nesta etapa.

---

## 15. `Plant.consumerUnit` (legado — obrigatório)

Conforme `plant-consumer-unit-legacy-audit.md`:

| Regra | Status |
|-------|--------|
| Continua legado | Sim |
| Transformar em FK | **Não** |
| Usar como futura UC | **Não** |
| Renomear / remover | **Não** |
| Usar dados para relacionamento energético | **Não** até decisão PO + migração explícita |

A futura entidade UC será modelada **independentemente**.

Significado operacional do string: ainda **ambíguo** (D4) — possível candidato a “número da UC da usina”, sem prova.

---

## 16. OC — correção conceitual

### Conclusão fundamentada

No contexto de conexão MMGD, **OC** refere-se tipicamente a **Orçamento de Conexão** (documento/processo da distribuidora para solicitação de conexão — citado em normas de conexão e manuais de distribuidoras; REN trata de “solicitação de orçamento de conexão”).

```
OC (Orçamento de Conexão)  ≠  UC (Unidade Consumidora)
```

### Código B7

- Termo **OC** como entidade: **NÃO ENCONTRADO**.
- Documentação V2.1/V2.2 às vezes usou “OC” de forma ambígua junto a UC geradora — **corrigir conceitualmente** daqui em diante.

### Futuro

Se o B7 precisar guardar número/documento de Orçamento de Conexão, tratar como **dado/documento do processo de conexão**, não como substituto de UC. **Fora desta etapa.**

---

## 17. Modelo conceitual provisório (ajustado)

```
DISTRIBUIDORA
      │ atende
      ↓
     UC
      │
      ├── titular: CONSUMIDOR
      │     └── se UC tem MMGD → CONSUMIDOR-GERADOR (papel)
      │
      ├── medição / fatura da distribuidora
      │
      └── participação no SCEE (modalidade)
               │
               ├── UC COM MMGD ←── conexão da CENTRAL GERADORA
               │                      ↑
               │                   USINA (Plant / O&M)
               │
               └── ALOCAÇÃO / RATEIO (futuro)
                        ↓
                  OUTRAS UCs PARTICIPANTES
```

Monitoramento opera na **Usina/equipamentos**.  
Gestão de Energia opera em **UC + rateio + crédito/compensação**.  
Faturamento B7 / Cobrança vêm depois do balanço.

---

## 18. Nomenclatura B7 proposta

| Termo | Definição | Fonte | Uso B7 | Confiança |
|-------|-----------|-------|--------|-----------|
| Unidade Consumidora (UC) | Instalação com ponto de conexão, medição, um titular, imóvel/contíguos | REN 1.000 | Entidade futura de Gestão de Energia | Alta |
| Consumidor | PF/PJ titular das obrigações da UC | REN 1.000 | Entidade futura `Consumer` (negócio) | Alta |
| Consumidor-gerador | Titular de UC com MMGD | Lei 14.300 | Papel/status; não entidade separada | Alta |
| Usina | Ativo operacional de geração no B7 (`Plant`) | Código B7 | O&M + âncora energética | Alta |
| Central geradora | Conceito regulatório da MMGD | Lei / REN | Linguagem jurídica; mapear para Usina | Alta |
| UC com MMGD | UC onde a geração se conecta | Lei / REN | Subtipo/papel de UC | Alta |
| UC participante | UC no SCEE (recebe/compõe compensação) | Lei/REN (“participante”/“beneficiária”) | Papel no rateio | Média-alta |
| Rateio / Alocação | Regra versionada usina→UCs | Lei 14.300 art.12 + domínio B7 | Entidade futura | Alta (necessidade) |
| Crédito | Excedente não compensado no ciclo, para ciclos seguintes | Lei / REN | Ledger futuro | Alta (conceito) |
| Compensação / energia compensada | Abatimento no faturamento do ciclo | REN | Evento/apuração futura | Alta (conceito) |
| OC | Orçamento de Conexão | Prática regulatória/conexão | Documento futuro; ≠ UC | Alta |
| Plant.consumerUnit | String legada | Código B7 | Legado; não é UC entidade | Alta |

---

## 19. Decisões que podem ser congeladas agora

1. **UC é entidade de negócio própria futura** (≠ string em Plant).  
2. **UC ≠ Customer ≠ User ≠ Plant**.  
3. **Consumidor ≠ User**; Consumer futuro ≠ Customer.  
4. **Consumidor-gerador** = papel do titular de UC com MMGD — não entidade `ConsumerGenerator`.  
5. **Usina/central geradora ≠ UC**; conexão MMGD ocorre via instalações de UC.  
6. **`Plant.consumerUnit` permanece legado**; não vira FK; não funda rateio.  
7. **OC ≠ UC**; OC = Orçamento de Conexão (processo/documento).  
8. **Geração/telemetria ≠ crédito**; crédito ≠ rateio; energia compensada ≠ crédito.  
9. **Monitoramento ≠ Gestão de Energia**.  
10. Relação estrutural futura **Usina ↔ N UCs via Rateio** (Modelo D), cobrindo local (N=1) e remoto/compartilhada (N≥1).  
11. **1 UC → 1 consumidor titular** (REN).  
12. Modalidades SCEE relevantes: autoconsumo local, remoto, geração compartilhada, múltiplas UCs — como **enquadramentos**, não como tabelas nesta etapa.  
13. Association/Consortium: conceitos da geração compartilhada — **não criar** entidades agora (D8).

---

## 20. Decisões pendentes

| ID | Tema | Dependência |
|----|------|-------------|
| P1 | Significado operacional de `Plant.consumerUnit` (D4) | PO / operação |
| P2 | No MVP, obrigar cadastro da “UC com MMGD” além das participantes? | PO |
| P3 | Consumer comercial ≠ titular regulatório? | PO + jurídico |
| P4 | Cardinalidade exata produtos B7 Consumer↔UC além do mínimo 1:N titular | PO (D5) |
| P5 | Association/Consortium como entidades | Jurídico (D8) |
| P6 | Investor entidade vs role | PO (D13) |
| P7 | Regras comerciais / remuneração B7 | PO (D11) |
| P8 | Motor de crédito (expiração, prioridade GD) | Regulatório (D9) |
| P9 | Integração/fonte de dados das distribuidoras | PO + integrações (D12) |
| P10 | Guardar Orçamento de Conexão (OC) como documento | PO / processo |

---

## 21. Validação regulatória necessária (especialista)

- Detalhes de faturamento por posto tarifário e GD I/II.  
- Limites de potência e enquadramentos específicos.  
- Regras de realocação/percentuais perante cada distribuidora.  
- Figuras em que “beneficiário” comercial diverge do titular.  
- Nuances de empreendimento com múltiplas UCs vs geração compartilhada no produto B7.

---

## 22. Relação com Lumi (referência funcional)

Lumi ilustra: balanço por UC, rateio multi-beneficiário, faturas UC/usina, alocação de créditos.  
Isso **é compatível** com o Modelo D + SCEE, mas **não define** o schema B7 nem substitui a Lei/REN.

---

## 23. Recomendação para o próximo passo (NÃO IMPLEMENTAR)

1. PO confirma P1–P4 (especialmente D4 e se UC com MMGD é obrigatória no MVP).  
2. Em seguida, sprint de **Cadastro Energético Mínimo**: Distributor + UC + Consumer (titular) + vínculo Usina–UC via Rateio versionado — **sem** Credit Engine, **sem** alterar Monitoramento, **sem** migrar `Plant.consumerUnit` automaticamente.

Até revisão do PO: **não implementar**.

---

## 24. Checklist desta etapa

- [x] Documento `domain-uc-d3.md` criado  
- [x] Fontes Lei 14.300 / REN 1.000 / 1.059 usadas para definições  
- [x] Auditoria `Plant.consumerUnit` respeitada  
- [x] OC corrigido conceitualmente (≠ UC)  
- [x] Sem schema / migration / código  

---

*Fim — D3 Modelo Conceitual de UC. Aguardar Product Owner.*
