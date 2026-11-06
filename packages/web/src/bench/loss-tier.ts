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
 * The on-foot view's tier at the moment its WebGL context is lost
 * (VENT-107). The view drops itself to `low` in the loss's own event, so a
 * depth run that lost its context while opening read `low` into its
 * header; heard in the capture phase, before the view's handler, the tier
 * is still the one the run ran at. Only the first loss counts.
 */

export interface LossTier {
  /** The tier when the first context went; null until one does. */
  readonly tier: () => string | null;
  readonly stop: () => void;
}

/** Watches `doc` for a lost context, reading the tier with `tierNow`. */
export function tierAtLoss(
  doc: EventTarget,
  tierNow: () => string | null,
): LossTier {
  let kept: string | null = null;
  const heard = (): void => {
    kept ??= tierNow();
  };
  const options = { capture: true };
  doc.addEventListener('webglcontextlost', heard, options);
  return {
    tier: () => kept,
    stop: () => doc.removeEventListener('webglcontextlost', heard, options),
  };
}
