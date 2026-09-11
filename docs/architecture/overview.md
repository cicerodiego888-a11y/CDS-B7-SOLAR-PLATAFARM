# Arquitetura

**B7 Solar Plataforma de Gestão** é um monorepo modular.
O núcleo **confirmado no código** hoje é o Sistema de Monitoramento / O&M.

Web consome a API central. Mobile existe apenas como scaffold Expo (NÃO ENCONTRADO NO CÓDIGO ATUAL: app funcional).
A API possui domínio próprio de monitoramento e uma camada de integrações que normaliza dados de fabricantes (AUXSOL live; demais planned).

Fluxo de monitoramento (preservado):

```
Fabricante -> Connector -> Normalização -> Banco (MonitoringReading)
  -> Motor de Monitoramento / Alertas -> Dashboard / Operação
```

Baseline técnico V2: [baseline-v2.md](./baseline-v2.md).
