/**
 * The process-wide download queue: a few Horizons downloads at once, a bounded
 * number waiting, and one more refused at once with kind `busy`.
 */
import { HorizonsError } from './errors.ts';

/** A counting semaphore with a bounded waiting list. */
export class DownloadSlots {
  private active = 0;
  private readonly waiting: (() => void)[] = [];
  private readonly maxActive: number;
  private readonly maxWaiting: number;

  constructor(maxActive: number, maxWaiting: number) {
    this.maxActive = maxActive;
    this.maxWaiting = maxWaiting;
  }

  /**
   * Runs `task` once a slot is free, and frees the slot when it settles.
   *
   * @throws HorizonsError (`busy`) when every slot is taken and the waiting
   *   list is full; `task` is not started then.
   */
  async run<T>(task: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await task();
    } finally {
      this.release();
    }
  }

  private async acquire(): Promise<void> {
    if (this.active < this.maxActive) {
      this.active += 1;
      return;
    }
    if (this.waiting.length >= this.maxWaiting) {
      throw new HorizonsError('busy', 'too many Horizons downloads waiting');
    }
    // The releasing download hands its slot over, so `active` does not change.
    await new Promise<void>((resolve) => this.waiting.push(resolve));
  }

  private release(): void {
    const next = this.waiting.shift();
    if (next) next();
    else this.active -= 1;
  }
}
