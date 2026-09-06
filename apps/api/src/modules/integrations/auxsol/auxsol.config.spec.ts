import { auxsolMockAllowed, resolveAuxsolMode } from './auxsol.config';

describe('Configuração AUXSOL', () => {
  const env = { ...process.env };

  afterEach(() => {
    process.env = { ...env };
  });

  it('não ativa mock silenciosamente em produção', () => {
    process.env.NODE_ENV = 'production';
    process.env.AUXSOL_MOCK_MODE = 'true';
    delete process.env.AUXSOL_ALLOW_MOCK_IN_PRODUCTION;
    expect(auxsolMockAllowed()).toBe(false);
    expect(resolveAuxsolMode()).toBe('blocked');
  });

  it('permanece bloqueado sem URL oficial', () => {
    delete process.env.AUXSOL_API_BASE_URL;
    process.env.AUXSOL_MOCK_MODE = 'false';
    expect(resolveAuxsolMode()).toBe('blocked');
  });
});
