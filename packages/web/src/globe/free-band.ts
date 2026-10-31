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
 * Where a framed site's marker stays in view (VENT-33): between the
 * phone's top bar and the sheet's top edge, or the tab bar when the sheet
 * is lower; on a desktop, the whole globe. The sheet's edge comes from
 * sheet-edge.ts, the rest from band-watch.ts; the site framer listens
 * for a band that moved. Pure but for its listeners, so tested alone.
 */
import type { FreeBand } from './site-aim';

/** What the band is measured from; px from the globe host's top left. */
export interface BandLayout {
  readonly hostHeight: number;
  /** The phone top bar's bottom edge; none: 0. */
  readonly barBottom: number;
  /** The phone sheet's top edge; no sheet: +Infinity. */
  readonly sheetTop: number;
  /** The phone tab bar's top edge; none: +Infinity. */
  readonly tabsTop: number;
}

/** The band of `layout`: under the top bar, above the sheet or tabs. */
export function freeBand(layout: BandLayout): FreeBand {
  const { hostHeight, barBottom, sheetTop, tabsTop } = layout;
  return { top: barBottom, bottom: Math.min(sheetTop, tabsTop, hostHeight) };
}

/** The band as measurements come in, and who hears it move. */
export class FreeBandWatch {
  private layoutNow: BandLayout = {
    hostHeight: 0,
    barBottom: 0,
    sheetTop: Number.POSITIVE_INFINITY,
    tabsTop: Number.POSITIVE_INFINITY,
  };
  private readonly listeners = new Set<() => void>();

  /** Takes in new measurements: any of the layout's fields. */
  layout(change: Partial<BandLayout>): void {
    const was = this.band();
    this.layoutNow = { ...this.layoutNow, ...change };
    const now = this.band();
    if (now.top === was.top && now.bottom === was.bottom) return;
    for (const listener of this.listeners) listener();
  }

  /** The band now. */
  band(): FreeBand {
    return freeBand(this.layoutNow);
  }

  /** Calls `listener` whenever the band moves; returns how to stop. */
  watch(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => void this.listeners.delete(listener);
  }
}
