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

/** A fixed-window counter per key, with bounded memory. */

/** Every setting of a {@link FixedWindowLimiter}, already resolved. */
export interface FixedWindowSettings {
  readonly limit: number;
  readonly windowMs: number;
  readonly now: () => number;
  readonly maxKeys: number;
}

interface Window {
  readonly start: number;
  count: number;
}

/**
 * Counts hits per key in fixed windows. Expired keys are pruned at most once
 * per window, and when the map is full the oldest key is dropped (a Map
 * iterates in insertion order).
 */
export class FixedWindowLimiter {
  private readonly settings: FixedWindowSettings;
  private readonly windows = new Map<string, Window>();
  private lastPrune: number;

  constructor(settings: FixedWindowSettings) {
    this.settings = settings;
    this.lastPrune = settings.now();
  }

  /**
   * Counts one hit for `key`: 0 when allowed, else the whole seconds until
   * the key's window ends.
   */
  take(key: string): number {
    const { limit, windowMs, now } = this.settings;
    const at = now();
    if (at - this.lastPrune >= windowMs) this.prune(at);
    const window = this.openWindow(key, at);
    if (window.count >= limit) {
      return Math.ceil((window.start + windowMs - at) / 1000);
    }
    window.count += 1;
    return 0;
  }

  /** Keys held in memory. */
  size(): number {
    return this.windows.size;
  }

  /** The window of `key` still open at `at`, or a new one starting at `at`. */
  private openWindow(key: string, at: number): Window {
    const current = this.windows.get(key);
    if (current !== undefined && at - current.start < this.settings.windowMs) {
      return current;
    }
    this.windows.delete(key);
    if (this.windows.size >= this.settings.maxKeys) this.prune(at);
    if (this.windows.size >= this.settings.maxKeys) {
      const oldest = this.windows.keys().next();
      if (oldest.done !== true) this.windows.delete(oldest.value);
    }
    const fresh = { start: at, count: 0 };
    this.windows.set(key, fresh);
    return fresh;
  }

  private prune(at: number): void {
    for (const [key, window] of this.windows) {
      if (at - window.start >= this.settings.windowMs) this.windows.delete(key);
    }
    this.lastPrune = at;
  }
}
