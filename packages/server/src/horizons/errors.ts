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

/** The error every Horizons failure is reported as. */

/**
 * Why a Horizons request failed: the HTTP layer, an error reported by
 * Horizons, a body we cannot read, or the download queue being full (`busy`,
 * Horizons was not called).
 */
export type HorizonsErrorKind = 'http' | 'api' | 'parse' | 'busy';

/** A Horizons request did not produce an observer table. */
export class HorizonsError extends Error {
  override readonly name = 'HorizonsError';
  readonly kind: HorizonsErrorKind;

  constructor(kind: HorizonsErrorKind, message: string) {
    super(message);
    this.kind = kind;
  }
}

// Longest excerpt of a Horizons error text copied into an error message.
const MAX_ERROR_EXCERPT = 300;

/** `text` on one line, cut to a length that fits in an error message. */
export function excerpt(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= MAX_ERROR_EXCERPT) return flat;
  return `${flat.slice(0, MAX_ERROR_EXCERPT)}...`;
}
