# B7 Solar Platform

Plataforma modular da B7 Solar.

## Fase inicial
Sistema de Monitoramento:
- autenticação e usuários
- clientes
- usinas
- unidades consumidoras
- inversores/equipamentos
- integrações com fabricantes
- leituras de monitoramento
- energia
- performance
- alertas
- relatórios

## Arquitetura futura
CRM, Homologação, Agentes de IA, Pós-venda e Mobile ficam preparados para evolução.

## Stack
- TypeScript
- Next.js
- NestJS
- PostgreSQL
- Prisma
- Docker
- React Native/Expo (estrutura futura)

## Inicialização
1. Copie `.env.example` para `.env`.
2. Execute `docker compose up -d`.
3. Execute `pnpm install`.
4. Execute `pnpm db:generate`.
5. Execute `pnpm db:migrate`.
6. Execute `pnpm db:seed`.
7. Execute `pnpm dev`.
