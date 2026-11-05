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
 * The browser's own measures the benchmark reads (VENT-81): long tasks
 * (a PerformanceObserver of `longtask`, where the browser has it), the
 * resources fetched since an instant (Resource Timing's `transferSize`:
 * 0 for a cached answer), and the JS heap (`performance.memory`, Chromium
 * only).
 */

export interface LongTasks {
  readonly count: number;
  readonly ms: number;
}

/** Watches long tasks from now; the returned function stops and tells. */
export function watchLongTasks(): () => LongTasks {
  const tasks: number[] = [];
  let observer: PerformanceObserver | null = null;
  try {
    observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) tasks.push(entry.duration);
    });
    observer.observe({ type: 'longtask', buffered: false });
  } catch {
    observer = null;
  }
  return () => {
    observer?.disconnect();
    return { count: tasks.length, ms: tasks.reduce((a, b) => a + b, 0) };
  };
}

/** Bytes and count of the resources whose fetch started at or after `t0`. */
export function resourcesSince(t0: number): { bytes: number; count: number } {
  const entries = performance.getEntriesByType('resource')
    .filter((e) => e.startTime >= t0) as PerformanceResourceTiming[];
  const bytes = entries.reduce((sum, e) => sum + (e.transferSize || 0), 0);
  return { bytes, count: entries.length };
}

/** The JS heap in use, bytes; null where the browser does not say. */
export function heapBytes(): number | null {
  const memory = (performance as { memory?: { usedJSHeapSize?: number } })
    .memory;
  return typeof memory?.usedJSHeapSize === 'number'
    ? memory.usedJSHeapSize : null;
}

/** Room for every resource of a run: the default buffer keeps 250. */
export function widenResourceBuffer(): void {
  performance.setResourceTimingBufferSize?.(10_000);
}
