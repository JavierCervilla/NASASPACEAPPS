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
 * The selected landing site, shared by the globe and the phone sheet. A
 * small observable value: whoever needs it gets the store passed in, so
 * there is no module-level state.
 */

/** Who picked the site: a marker on the globe, or the site list. */
export type PickOrigin = 'globe' | 'list';

export interface Selection {
  readonly id: string;
  readonly origin: PickOrigin;
}

export interface SiteStore {
  /** The current selection. */
  get(): Selection;
  /** Selects the site `id`; listeners run only when it changes. */
  select(id: string, origin: PickOrigin): void;
  /** Calls `listener` after every change; returns the unsubscribe. */
  subscribe(listener: () => void): () => void;
}

/** A store that starts with the site `initialId` selected. */
export function createSiteStore(initialId: string): SiteStore {
  let current: Selection = { id: initialId, origin: 'globe' };
  const listeners = new Set<() => void>();
  return {
    get: () => current,
    select: (id, origin) => {
      if (id === current.id) return;
      current = { id, origin };
      for (const listener of [...listeners]) listener();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}
