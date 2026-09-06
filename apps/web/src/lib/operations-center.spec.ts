import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  OPERATIONS_EMPTY_ALERTS,
  OPERATIONS_EMPTY_ISSUES,
  OPERATIONS_EMPTY_PLANTS,
  buildOperationsQuery,
  operationsAlertHref,
  operationsInverterHref,
  operationsPlantHref,
} from './operations-center.ts';

describe('Central de Operação no frontend', () => {
  it('monta filtros sem poluir a query', () => {
    assert.equal(buildOperationsQuery({ period: 'today' }), 'period=today');
    assert.equal(
      buildOperationsQuery({ period: 'last7days', status: 'WARNING', search: 'Fazenda' }),
      'period=last7days&status=WARNING&search=Fazenda',
    );
  });

  it('navega para rotas existentes', () => {
    assert.equal(operationsPlantHref('p1'), '/usinas/p1');
    assert.equal(operationsInverterHref('i1'), '/inversores/i1');
    assert.equal(operationsAlertHref('a1'), '/alertas/a1');
  });

  it('textos de empty não inventam monitoramento', () => {
    assert.equal(OPERATIONS_EMPTY_PLANTS, 'Nenhuma usina cadastrada.');
    assert.equal(OPERATIONS_EMPTY_ALERTS, 'Nenhum alerta ativo.');
    assert.equal(OPERATIONS_EMPTY_ISSUES, 'Todos os inversores estão operacionais.');
  });
});
