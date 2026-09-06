import { createDefaultIntegrationEngine } from './integration.engine';
import { getInverterManufacturerName, OFFICIAL_INVERTER_MANUFACTURERS } from './manufacturers.catalog';

describe('Catálogo oficial de fabricantes', () => {
  it('cadastra os sete fabricantes prioritários', () => {
    const codes = OFFICIAL_INVERTER_MANUFACTURERS.map((item) => item.code);
    expect(codes).toEqual(['AUXSOL', 'SOLPLANET', 'SAJ', 'HUAWEI', 'DEYE', 'CHINT', 'SUNGROW']);
  });

  it('expõe o nome de exibição sem códigos internos', () => {
    expect(getInverterManufacturerName('DEYE')).toBe('Deye');
    expect(getInverterManufacturerName('SOLPLANET')).toBe('Solplanet');
  });

  it('registra um adaptador por fabricante no motor', () => {
    const engine = createDefaultIntegrationEngine();
    expect(engine.listProviders()).toHaveLength(7);
    expect(engine.resolve('HUAWEI')?.provider).toBe('HUAWEI');
    expect(engine.resolve('AUXSOL')?.provider).toBe('AUXSOL');
  });
});
