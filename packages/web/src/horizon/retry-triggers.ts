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
 * When the page asks again for the horizons whose tries ran out (VENT-45):
 * when the browser comes back online and when the page is shown again,
 * the moments a passing failure has most likely passed.
 */

export interface ReturnSignals {
  /** Fires `online` (the window). */
  readonly win: EventTarget;
  /** Fires `visibilitychange` (the document). */
  readonly doc: EventTarget & {
    readonly visibilityState: DocumentVisibilityState;
  };
}

/**
 * Calls `retry` on those moments, from the browser's window and document
 * unless others are given; returns the unsubscribe.
 */
export function retryOnReturn(
  retry: () => void,
  { win, doc }: ReturnSignals = { win: window, doc: document },
): () => void {
  const again = (): void => retry();
  const onVisible = (): void => {
    if (doc.visibilityState === 'visible') retry();
  };
  win.addEventListener('online', again);
  doc.addEventListener('visibilitychange', onVisible);
  return () => {
    win.removeEventListener('online', again);
    doc.removeEventListener('visibilitychange', onVisible);
  };
}
