import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { integrationBindingLabel } from './integration-status.ts';

describe('Estados de integração no frontend', () => {
  it('não mostra Offline para BLOCKED', () => {
    const label = integrationBindingLabel({
      manufacturerCode: 'AUXSOL',
      status: 'NOT_CONFIGURED',
      hasBinding: true,
      lastErrorMessage: 'Integração bloqueada até o contrato oficial.',
    });
    assert.equal(label, 'Integração aguardando configuração/contrato oficial');
    assert.equal(label.includes('Offline'), false);
  });

  it('distingue não configurado, pronto e erro', () => {
    assert.equal(integrationBindingLabel({}), 'Integração não configurada');
    assert.equal(integrationBindingLabel({ status: 'READY' }), 'Configuração pronta');
    assert.equal(integrationBindingLabel({ status: 'COMMUNICATION_ERROR' }), 'Falha na comunicação');
  });

  it('rótulos de integração não usam Offline', () => {
    assert.equal(integrationBindingLabel({ manufacturerCode: 'DEYE', hasBinding: true }).includes('Offline'), false);
  });
});
