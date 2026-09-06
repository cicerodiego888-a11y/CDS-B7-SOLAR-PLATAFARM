import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  HISTORY_EMPTY,
  HISTORY_ERROR,
  HISTORY_LOADING,
  HISTORY_NO_GENERATION,
  buildHistoryQuery,
  historyHasChart,
} from './monitoring-history.ts';

describe('Histórico no frontend', () => {
  it('não desenha gráfico sem pontos', () => {
    assert.equal(historyHasChart([]), false);
    assert.equal(historyHasChart([{ label: 'Seg', energyKwh: 4, collectedAt: '2026-09-01' }]), true);
  });

  it('monta query só com filtros relevantes', () => {
    assert.equal(buildHistoryQuery({ period: 'last7days', plantId: 'p1' }), 'period=last7days&plantId=p1');
    assert.equal(
      buildHistoryQuery({ period: 'custom', startDate: '2026-09-01', endDate: '2026-09-05', inverterId: 'i1' }),
      'period=custom&startDate=2026-09-01&endDate=2026-09-05&inverterId=i1',
    );
  });

  it('textos de estado não inventam geração', () => {
    assert.match(HISTORY_EMPTY, /Não existem leituras/);
    assert.match(HISTORY_NO_GENERATION, /Não há dados de geração/);
    assert.equal(HISTORY_LOADING, 'Carregando histórico...');
    assert.equal(HISTORY_ERROR, 'Não foi possível carregar o histórico.');
  });
});
