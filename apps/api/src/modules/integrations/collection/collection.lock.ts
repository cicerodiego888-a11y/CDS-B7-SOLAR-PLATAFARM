/**
 * Proteção válida para uma instância do processo.
 * Não cobre múltiplas instâncias da API; Redis poderá ser usado depois.
 */
export class InProcessCollectionLock {
  private readonly inflight = new Set<string>();

  tryAcquire(inverterId: string) {
    if (this.inflight.has(inverterId)) return false;
    this.inflight.add(inverterId);
    return true;
  }

  release(inverterId: string) {
    this.inflight.delete(inverterId);
  }
}
