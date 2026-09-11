# Cadastro Energético Mínimo (Domínio 4.1)

**Status:** implementado (cadastro base)  
**Escopo:** `Distributor` + `Consumer` + `ConsumerUnit`  
**Não implementado nesta sprint:** Rateio, Credits, Compensation, Billing, Collection, vínculo Plant↔UC

---

## Entidades

### Distributor

Concessionária/distribuidora cadastral.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | cuid | PK |
| name | string | obrigatório |
| code | string unique | normalizado uppercase |
| cnpj | string? | opcional |
| status | ACTIVE/INACTIVE | cadastral |
| createdAt / updatedAt | datetime | |

Sem configuração de integração nesta sprint.

### Consumer

Titular energético. **≠ Customer** e **≠ User**.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | cuid | PK |
| name | string | obrigatório |
| document | string unique | CPF/CNPJ textual (padrão Customer) |
| documentType | CPF \| CNPJ | enum |
| email / phone | string? | opcionais |
| status | ACTIVE/INACTIVE | cadastral |

Sem `customerId` / `userId` obrigatórios.

### ConsumerUnit (UC)

Unidade Consumidora perante a distribuidora. **≠ Plant**.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | cuid | PK |
| consumerId | FK → Consumer | titular (1 UC → 1 Consumer) |
| distributorId | FK → Distributor | vigente |
| number | string | ID da UC **no contexto da distribuidora** |
| address | string? | padrão simples (como Plant.address) |
| status | ACTIVE/INACTIVE | cadastral |

Unicidade: `@@unique([distributorId, number])`.

---

## Cardinalidades

```
Consumer 1 ──< N ConsumerUnit
Distributor 1 ──< N ConsumerUnit
Plant ⟂ ConsumerUnit   (independentes; Rateio futuro)
Customer ⟂ Consumer
User ⟂ Consumer
```

## Legado preservado

- `Plant.consumerUnit` (String?) — legado; UI usinas intacta
- `Plant.distributor` (String?) — legado; UI usinas intacta
- Sem FK automática a partir desses campos

## Autorização

Permissões novas no catálogo:

- `DISTRIBUTORS_*` / `CONSUMERS_*` / `CONSUMER_UNITS_*` (VIEW/CREATE/UPDATE)

Concedidas a ADMIN (todas), COMERCIAL (CRUD cadastral), OPERADOR/POS_VENDA (VIEW).  
Sem escopo por UC/Consumer nesta sprint.

## Tenancy

Sem `tenantId` / Organization. Cadastro energético mínimo é **global ao operador B7**, protegido por JWT + permissions (staff). Isolamento fino por Customer/UC fica como **pendência** para evolução de membership.

## APIs

- `/api/distributors`
- `/api/consumers`
- `/api/consumer-units`

## UI

- `/distribuidoras`
- `/consumidores`
- `/unidades-consumidoras`

---

*Não declarar Energy Management completo. Próxima sprint candidata: Rateio Plant ↔ UC.*
