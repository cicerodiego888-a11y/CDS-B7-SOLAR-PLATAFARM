import { HttpException } from '@nestjs/common';
import { CollectionErrorCode } from '../integration.contract';

export class CollectionError extends HttpException {
  readonly code: CollectionErrorCode;

  constructor(code: CollectionErrorCode, message: string, status: number) {
    super({ ok: false, code, message, error: code, statusCode: status }, status);
    this.code = code;
    this.name = 'CollectionError';
  }
}

export function integrationNotConfigured() {
  return new CollectionError('INTEGRATION_NOT_CONFIGURED', 'Integração não configurada.', 422);
}

export function integrationNotSupported() {
  return new CollectionError('INTEGRATION_NOT_SUPPORTED', 'Fabricante ainda não possui integração disponível.', 422);
}

export function integrationBlocked(message = 'Integração bloqueada até o contrato oficial.') {
  return new CollectionError('INTEGRATION_BLOCKED', message, 422);
}

export function collectionFailed(message = 'Não foi possível sincronizar o inversor.') {
  return new CollectionError('COLLECTION_FAILED', message, 422);
}

export function concurrentCollection() {
  return new CollectionError('CONCURRENT_COLLECTION', 'Já existe uma coleta em andamento para este inversor.', 409);
}

export function persistenceFailed() {
  return new CollectionError('PERSISTENCE_FAILED', 'Não foi possível persistir as leituras.', 500);
}
