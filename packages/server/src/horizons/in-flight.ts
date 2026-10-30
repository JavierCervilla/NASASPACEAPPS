/**
 * Requests already on their way, so concurrent callers of the same query share
 * one Horizons call.
 */
export class InFlight<T> {
  private readonly pending = new Map<string, Promise<T>>();

  /**
   * The promise in flight for `key`, or a new one from `start`, shared until it
   * settles. A synchronous throw from `start` starts nothing.
   */
  share(key: string, start: () => Promise<T>): Promise<T> {
    const pending = this.pending.get(key);
    if (pending) return pending;
    const request = start().finally(() => this.pending.delete(key));
    this.pending.set(key, request);
    return request;
  }
}
