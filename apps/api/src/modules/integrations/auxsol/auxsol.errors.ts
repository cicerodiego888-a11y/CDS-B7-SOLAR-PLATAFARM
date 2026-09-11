export class AuxsolContractUnavailableError extends Error {
  constructor(message = 'Contrato oficial da AUXSOL ainda não foi configurado.') {
    super(message);
    this.name = 'AuxsolContractUnavailableError';
  }
}

export class AuxsolManufacturerMismatchError extends Error {
  constructor() {
    super('Este inversor não pertence ao fabricante AUXSOL.');
    this.name = 'AuxsolManufacturerMismatchError';
  }
}

export class AuxsolTransientError extends Error {
  constructor(message: string, readonly statusCode?: number) {
    super(message);
    this.name = 'AuxsolTransientError';
  }
}

export class AuxsolAuthError extends Error {
  constructor(message = 'Falha de autenticação na integração AUXSOL.') {
    super(message);
    this.name = 'AuxsolAuthError';
  }
}

export class AuxsolInvalidPayloadError extends Error {
  constructor(message = 'Payload AUXSOL inválido.') {
    super(message);
    this.name = 'AuxsolInvalidPayloadError';
  }
}

/** Erros HTTP de cliente não autenticáveis/não transitórios (400/403/404 etc.). */
export class AuxsolRequestError extends Error {
  constructor(message: string, readonly statusCode?: number, readonly code?: string) {
    super(message);
    this.name = 'AuxsolRequestError';
  }
}

export function isTransientAuxsolError(error: unknown) {
  if (error instanceof AuxsolTransientError) return true;
  if (error instanceof Error && /timeout|aborted|econnreset|econnrefused|network/i.test(error.message)) return true;
  return false;
}
