# Desenvolvimento local

Pré-requisitos:
- Node.js LTS
- pnpm
- Docker

Comandos:
docker compose up -d
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev

API: http://localhost:3001/api/health
Web: http://localhost:3000

Credenciais de desenvolvimento:
admin@b7solar.local
B7@123456

Trocar a senha antes de qualquer ambiente real.