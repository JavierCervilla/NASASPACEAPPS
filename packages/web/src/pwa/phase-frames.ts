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
 * The Moon's phase frames, rendered offline by scripts/app_icons.py:
 * PHASE_FRAMES WebP disks through one month, frame 0 new and frame
 * PHASE_FRAMES / 2 full. Only the current one is downloaded. Pure.
 */

export const PHASE_FRAMES = 30;

/** The nearest frame to `phase` (0-1, 0 new), wrapping past the last. */
export function frameIndex(phase: number, count = PHASE_FRAMES): number {
  const wrapped = phase - Math.floor(phase);
  return Math.round(wrapped * count) % count;
}

/** The frame's address under the site's `base` path. */
export function frameUrl(base: string, index: number): string {
  const root = base.replace(/\/?$/, '/');
  return `${root}icons/phase/moon-${String(index).padStart(2, '0')}.webp`;
}
