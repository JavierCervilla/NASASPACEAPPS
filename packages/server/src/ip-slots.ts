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
 * A cap on the computations one client address has in flight (VENT-46). The
 * global gate caps what runs, but an address that fires many at once would
 * fill its queue and turn the rest away, so each address has a few slots of
 * its own: a request over them waits in a short room per address, and past
 * that room it is refused at once, never queued without bound. A key is
 * kept only while it holds a slot or a place in line, so the map is as
 * small as the requests in flight.
 */

/** Slots one address may hold at once when the caller sets none. */
export const DEFAULT_SLOTS_RUNNING = 4;
/** Places in line one address may hold behind its slots when none is set. */
export const DEFAULT_SLOTS_WAITING = 4;
const RETRY_AFTER_SEC = 1;

/** Gives the slot back; calling it again does nothing. */
export type Release = () => void;

/** An address has its slots and its line full: it may try again shortly. */
export class SlotLimitError extends Error {
  override readonly name = 'SlotLimitError';
  readonly retryAfterSec = RETRY_AFTER_SEC;

  constructor() {
    super('too many computations in flight for this address');
  }
}

/** Settings of {@link IpSlots}. */
export interface IpSlotsOptions {
  readonly running: number;
  readonly waiting: number;
}

interface Line {
  running: number;
  readonly waiting: (() => void)[];
}

/** In-memory slots of every address: `running` per key, `waiting` more. */
export class IpSlots {
  private readonly lines = new Map<string, Line>();

  private readonly options: IpSlotsOptions;

  constructor(options: IpSlotsOptions) {
    this.options = options;
  }

  /**
   * A slot for `key`, waiting for its turn when its slots are taken.
   *
   * @throws SlotLimitError when the line is full too.
   */
  async acquire(key: string): Promise<Release> {
    const line = this.lines.get(key) ?? { running: 0, waiting: [] };
    if (line.running < this.options.running) {
      line.running++;
      this.lines.set(key, line);
    } else if (line.waiting.length < this.options.waiting) {
      await new Promise<void>((resolve) => line.waiting.push(resolve));
    } else throw new SlotLimitError();
    return this.releaseOf(key, line);
  }

  /** Keys with a slot or a place in line. */
  size(): number {
    return this.lines.size;
  }

  private releaseOf(key: string, line: Line): Release {
    let done = false;
    return () => {
      if (done) return;
      done = true;
      // The slot passes to the next in line without being freed, so the
      // count never dips below what is held.
      const next = line.waiting.shift();
      if (next) return next();
      line.running--;
      if (line.running === 0) this.lines.delete(key);
    };
  }
}
