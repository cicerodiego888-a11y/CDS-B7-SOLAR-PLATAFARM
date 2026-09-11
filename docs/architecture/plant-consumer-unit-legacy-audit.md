# B7 Solar Plataforma de Gestão
# Auditoria do Legado Plant.consumerUnit

**Tipo:** auditoria pontual (somente leitura)  
**Data-base:** pós V2.1 / V2.2  
**Alterações de código/schema/banco nesta etapa:** **NENHUMA**

---

## 1. Resumo executivo

`Plant.consumerUnit` é um campo **textual opcional no banco** (`String?` / `TEXT`), presente desde a **migration inicial**, sem relação, índice ou unique.

No produto:

- a **API/DTO de criação exige** o campo (validação de aplicação);
- o **frontend** rotula como **“Unidade consumidora”** e abrevia **“UC”** no detalhe;
- o valor é **persistido, listado, editado e usado em busca textual**;
- **não** entra em monitoramento, autorização, integrações, alertas ou cálculos energéticos.

**Classificação do significado:** **C) ambíguo** — o rótulo de UI sugere “unidade consumidora”, mas o código **não prova** se é UC geradora, UC beneficiária, OC, número de instalação ou outro identificador.

**Recomendação:** **NECESSITA DECISÃO DO PRODUCT OWNER** (+ apoio operacional), mantendo **PRESERVAR COMO LEGADO** até lá.

---

## 2. Definição técnica atual

| Aspecto | Valor confirmado |
|---------|------------------|
| Modelo | `Plant` |
| Campo Prisma | `consumerUnit` |
| Tipo Prisma | `String?` |
| Tipo SQL | `TEXT` |
| Nullable no schema | **Sim** (`?`) |
| Default | **Nenhum** |
| Relação / FK | **Nenhuma** |
| Índice | **Nenhum** dedicado |
| Unique | **Não** |
| Índices existentes em Plant | apenas `[customerId]`, `[status]` |

Trecho atual (`schema.prisma`):

```prisma
distributor     String?
consumerUnit    String?
```

**Nota de inconsistência aplicação vs schema:**  
`CreatePlantDto` marca `consumerUnit` como **obrigatório** (`@IsNotEmpty`), embora o banco permita `NULL`. Na prática, criações via API/UI preenchida **sempre gravam string** (após `.trim()`).

---

## 3. Onde o campo aparece

Escopo: árvore raiz oficial (ignorar cópia nested `b7-solar-platform-exe/` como fonte de verdade, embora espelhe o mesmo padrão legado).

| Área | Arquivos |
|------|----------|
| Schema | `apps/api/prisma/schema.prisma` |
| Migration | `apps/api/prisma/migrations/20260904014107_initial_schema/migration.sql` |
| Seed | `apps/api/prisma/seed.ts` |
| DTO | `apps/api/src/modules/common/dto.ts` |
| Service | `apps/api/src/modules/plants/plants.service.ts` |
| Spec | `apps/api/src/modules/plants/plants.service.spec.ts` |
| Web lista/form | `apps/web/src/app/usinas/page.tsx` |
| Web detalhe | `apps/web/src/app/usinas/[id]/page.tsx` |
| Docs arquitetura | `domain-spec-v2.1.md`, `domain-decisions-v2.2.md` |

**Não encontrado** em: monitoring, auth, integrations/AUXSOL, alerts, operations (lógica), equipment, inverters.

Buscas por `consumer_unit`, `unidadeConsumidora`, `unidade_consumidora`: **sem ocorrências** no código da árvore raiz (além do conceito em docs).

Ocorrências de “UC” no frontend ligadas **comprovadamente** ao campo: detalhe da usina (`UC ${data.consumerUnit}`) e `key: 'uc'` na coluna da tabela (mapeada a `consumerUnit`).

---

## 4. Onde o campo é usado

| Local | Tipo | Operação | Significado aparente |
|-------|------|----------|----------------------|
| `CreatePlantDto.consumerUnit` | API DTO | Validação + input create | Texto obrigatório “unidade consumidora” |
| `UpdatePlantDto.consumerUnit` | API DTO | Validação opcional + update | Mesmo rótulo; se enviado, não vazio |
| `PlantsService.create` | Backend | **Escrita** | Persiste `dto.consumerUnit.trim()` |
| `PlantsService.update` | Backend | **Escrita** (se informado) | Atualiza string trimada |
| `PlantsService.findAll` / `findOne` | Backend | **Leitura** | Retorna o modelo Plant completo (inclui campo) |
| `PlantsController` GET/POST/PATCH | API HTTP | Pass-through | Sem lógica própria sobre o campo |
| `usinas/page.tsx` form | Frontend | Create/Edit UI | Label “Unidade consumidora” |
| `usinas/page.tsx` tabela | Frontend | Exibição + busca client-side | Coluna “Unidade consumidora”; entra no filtro de texto |
| `usinas/[id]/page.tsx` | Frontend | Exibição | “UC {valor}” na description |
| `seed.ts` | Seed | Escrita | `'000000000'` (placeholder) |
| `plants.service.spec.ts` | Teste | Fixture | `'123'` em mocks de create |

### Não usado em

| Domínio | Evidência |
|---------|-----------|
| Cálculo energético | Nenhuma referência |
| Autorização / Membership | Nenhuma referência |
| Monitoramento / readings / alerts | Nenhuma referência |
| Integrações / AUXSOL / Binding | Nenhuma referência |
| Filtro server-side de listagem | `findAll()` não filtra por `consumerUnit` (só busca no browser) |

---

## 5. Histórico da migration

| Item | Valor |
|------|-------|
| Migration original | `20260904014107_initial_schema` |
| Arquivo | `apps/api/prisma/migrations/20260904014107_initial_schema/migration.sql` |
| Definição original | `"consumerUnit" TEXT,` dentro de `CREATE TABLE "Plant"` |
| Alterações posteriores | **Nenhuma** migration posterior menciona `consumerUnit` (busca em `prisma/migrations`) |
| Evidência de intenção no SQL | Nenhuma comentário; criado junto com `distributor` TEXT |

**Intenção inferível apenas pelo par de campos e pela UI:** cadastro descritivo de concessionária + “unidade consumidora” no registro da usina — **sem modelo de domínio energético**.

---

## 6. Evidências no código

1. **Persistência CRUD** de usina trata o campo como atributo cadastral livre.  
2. **Validação de create** exige preenchimento (regra de app, não de DB).  
3. **Rótulo de produto** = “Unidade consumidora” / “UC”.  
4. **Seed** usa nove zeros — indica preenchimento formal, não regra de negócio validada.  
5. **Ausência total** de uso em pipelines de monitoramento/integração/autorização.

---

## 7. Evidências no banco

**Banco não acessível — análise baseada em schema/migrations/código.**

Tentativa read-only via Prisma Client falhou (PostgreSQL indisponível; Docker não foi iniciado, conforme regra).

Não há contagem de não-nulos nem distribuição de formatos nesta auditoria.

---

## 8. Evidências no frontend

| Tela | Como aparece ao usuário |
|------|-------------------------|
| `/usinas` listagem | Coluna **“Unidade consumidora”** |
| `/usinas` criar/editar (modal) | Campo **“Unidade consumidora”** (`id="uc"`) |
| `/usinas` busca | Inclui o valor no match de texto (junto com nome, cliente, concessionária) |
| `/usinas/[id]` detalhe | Na description: `UC {consumerUnit ou —}` |

Não há máscara de formatação, máscara de dígitos, select de UC, nem link para outra entidade.

---

## 9. Significado identificado

### O que o código **suporta com certeza**

- Um **identificador/texto cadastral** associado à **Usina (`Plant`)**.
- Apresentado ao operador como **“unidade consumidora” / “UC”**.

### O que o código **não prova**

| Hipótese | Status |
|----------|--------|
| = entidade UC futura | Não — é string, sem FK |
| = UC geradora / UG | Sem evidência |
| = OC | Sem evidência (termo OC **NÃO ENCONTRADO** no código de domínio) |
| = UC beneficiária de terceiro | Sem evidência |
| = número oficial da instalação na distribuidora | Possível intenção de produto, **não comprovada** por validação/formato |

### Classificação

**C) ambíguo**

Frase obrigatória:

> **SEM EVIDÊNCIA SUFICIENTE PARA DEFINIR O SIGNIFICADO** regulatório/operacional exato (geradora vs beneficiária vs OC vs outro).  
> Há apenas evidência de **rótulo de UI + persistência textual na usina**.

---

## 10. Grau de confiança

| Afirmação | Confiança |
|-----------|-----------|
| Campo existe como `String?` sem FK desde a migration inicial | **ALTO** |
| Usado em CRUD usina + UI “Unidade consumidora” | **ALTO** |
| Não usado em monitoramento/autorização/integração | **ALTO** |
| Significado = UC geradora | **BAIXO** (não comprovado) |
| Significado = UC beneficiária | **BAIXO** (não comprovado) |
| Significado = OC | **BAIXO** (termo ausente no código) |

**Grau de confiança geral do significado de negócio:** **BAIXO**

---

## 11. Riscos

1. **Interpretação prematura** como UC beneficiária ou geradora → modelagem errada na V2.x.  
2. **Obrigação no DTO** vs **nullable no banco** → inconsistência se clientes API enviarem omitido vs UI.  
3. **Placeholder seed `000000000`** pode mascarar dados reais em ambientes seedados.  
4. **Busca só no client** — não é risco de segurança, mas reforça que o campo é metadado de UI.  
5. Remoção futura sem inventário de dados reais (banco offline nesta auditoria).

---

## 12. Relação com futura entidade UC

| Legado | Futuro (V2.1) |
|-------|----------------|
| `Plant.consumerUnit: String?` | Entidade `UC` / `ConsumerUnit` própria |
| Sem histórico / sem rateio | UC liga-se a Consumer, Distributor, Rateio |
| Um texto por Plant | Cardinalidade Plant↔UC ainda aberta (D3/D5/D6) |

**Estratégia segura (apenas recomendação):** preservar o campo até o PO definir o mapeamento; depois, eventual migração de valores string → FK(s) com regra explícita — **fora desta etapa**.

---

## 13. Relação com D3 / D4

| Código | Tema V2.1 / V2.2 | Esta auditoria |
|--------|------------------|----------------|
| **D4** | Significado real de `Plant.consumerUnit` | Confirmado: **ambíguo**; uso cadastral+UI; sem prova regulatória |
| **D3** | UC geradora/OC vs UC consumidora | Campo **não resolve** D3; pode ser qualquer uma das hipóteses — **PO + regulatório** |

Consistente com `domain-decisions-v2.2.md` §6 e §14.  
Consistente com `domain-spec-v2.1.md` (stub textual ≠ entidade UC).  
`baseline-v2.md` / `identity-authorization.md` **não** usam o campo — sem contradição.

**Lacuna:** ainda falta validação operacional do PO (“o que a operação B7 grava nesse campo na prática?”) e amostra de dados reais (banco offline).

**Diferença vs referência Lumi:** Lumi trata UC como entidade de jornada (balanço, rateio, faturas). No B7 legado, UC é **apenas um atributo de texto da usina** — não há paridade funcional.

---

## 14. Recomendação

**NECESSITA DECISÃO DO PRODUCT OWNER**

combinada com:

**PRESERVAR COMO LEGADO** (não remover, não renomear, não migrar, não usar como base de Rateio/Crédito até decisão).

Sub-recomendações (sem implementar):

1. PO/operação: informar se o valor digitado é o número da UC **da usina** junto à distribuidora, de um **beneficiário**, ou outro.  
2. Após resposta, atualizar D3/D4 na documentação de domínio.  
3. Só então planejar entidade UC e estratégia de migração do string legado.

---

## 15. Checklist desta auditoria

- [x] Schema inspecionado  
- [x] Referências no repo mapeadas  
- [x] API/frontend/seed/migration cobertos  
- [x] Banco tentado read-only → indisponível  
- [x] Cruzamento com docs V2.1/V2.2/baseline/identity  
- [x] Nenhum schema/migration/código alterado  

---

*Fim da auditoria pontual. Aguardar Product Owner.*
