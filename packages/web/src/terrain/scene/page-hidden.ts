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
 * Whether the page was hidden at any moment since the watch began (VENT-69):
 * a hidden page has its timers spaced to a second or more, so the time a
 * compile took then says nothing of the GPU and must not step the tier down.
 */

export interface HiddenWatch {
  /** Was the page hidden at the start or at any time since? */
  readonly sawHidden: () => boolean;
  readonly stop: () => void;
}

/** Starts watching `doc`'s visibility. */
export function watchHidden(doc: Document): HiddenWatch {
  let saw = doc.visibilityState === 'hidden';
  const onChange = (): void => {
    if (doc.visibilityState === 'hidden') saw = true;
  };
  doc.addEventListener('visibilitychange', onChange);
  return {
    sawHidden: () => saw,
    stop: () => doc.removeEventListener('visibilitychange', onChange),
  };
}
