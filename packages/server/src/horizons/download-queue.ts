/*
 *   _   _       _                         _ _
 *  | | | |_ __ (_)_   _____ _ __ ___  ___| | | ___
 *  | | | | '_ \| \ \ / / _ \ '__/ __|/ _ \ | |/ _ \
 *  | |_| | | | | |\ V /  __/ |  \__ \  __/ | |  __/
 *   \___/|_| |_|_| \_/ \___|_|  |___/\___|_|_|\___|
 *
 *             =++==--::.
 *         %%%%##**++=--:..  .
 *      ##**#%@%%#***+=--::.   .
 *    #**=+*#*#**#++++=-:::.. .  .
 *   #++-====*@%+*++==--::...   .  .    Ventana Lunar
 *  #+=-=--++==+===-+==--:..   .  .  .  Sun, Earth and landing
 * #----====-------=-=---:..  .  .  .   windows at the lunar
 * #+---+=====--=---==-::..     .  .  . south pole
 * #*----==---==-=-=-:-....    .  .  .
 * *#----===+*===--:-::...    .  .  .   Built for the NASA Space
 *  *----=*-+*%*+=-:::....   .  .  .    Apps Challenge 2026,
 *   *------=+*=--:::-:::.. .  .  .     Madrid. Not endorsed
 *    %*===-=-==--==-:::.  .  .  .      by NASA.
 *      *+:--+:--::::::.  .  .  .
 *         -=:::...:..   .  .           (c) 2026 Universelle
 *             :::.. .  .               SPDX-License-Identifier: MIT
 */

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
   * `onAdmit` runs once the task has a slot or a place in the waiting list,
   * before it takes either; throwing from it refuses the task.
   *
   * @throws HorizonsError (`busy`) when every slot is taken and the waiting
   *   list is full; neither `onAdmit` nor `task` runs then.
   */
  async run<T>(task: () => Promise<T>, onAdmit?: () => void): Promise<T> {
    await this.acquire(onAdmit);
    try {
      return await task();
    } finally {
      this.release();
    }
  }

  private async acquire(onAdmit?: () => void): Promise<void> {
    const free = this.active < this.maxActive;
    if (!free && this.waiting.length >= this.maxWaiting) {
      throw new HorizonsError('busy', 'too many Horizons downloads waiting');
    }
    onAdmit?.();
    if (free) {
      this.active += 1;
      return;
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
