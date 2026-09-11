import { spawnSync } from 'node:child_process';

const action = process.argv[2];
const isWindows = process.platform === 'win32';
const pnpm = isWindows ? 'pnpm.cmd' : 'pnpm';
const env = {
  ...process.env,
  DATABASE_URL: process.env.E2E_DATABASE_URL || 'postgresql://b7_e2e:b7_e2e_password@localhost:55432/b7_solar_e2e',
  REDIS_HOST: process.env.E2E_REDIS_HOST || 'localhost',
  REDIS_PORT: process.env.E2E_REDIS_PORT || '56379',
  REDIS_PASSWORD: process.env.E2E_REDIS_PASSWORD || '',
  NODE_ENV: 'test',
};

const commands = {
  migrate: [pnpm, ['--filter', '@b7/api', 'exec', 'prisma', 'migrate', 'deploy']],
  seed: [pnpm, ['--filter', '@b7/api', 'exec', 'tsx', 'prisma/seed.e2e.ts']],
  test: [pnpm, ['test:e2e']],
};
const command = commands[action];
if (!command) throw new Error(`Ação E2E inválida: ${action || '(vazia)'}`);
const result = spawnSync(command[0], command[1], { stdio: 'inherit', env });
process.exit(result.status ?? 1);
