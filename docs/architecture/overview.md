# Arquitetura

A B7 Solar Platform é modular. O primeiro produto é o Sistema de Monitoramento.

Web e Mobile consomem a API central. A API possui domínio próprio de monitoramento e uma camada de integrações que normaliza dados de diferentes fabricantes.

Fluxo:
Fabricante -> Connector -> Normalização -> Banco -> Motor de Monitoramento -> Dashboard/Alertas/Relatórios.