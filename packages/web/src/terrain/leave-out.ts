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
 * The diagnostic switch `?onfoot=` (VENT-49): a comma list of parts of the
 * on-foot view to leave out, so a phone's crash can be bisected from its
 * address bar. Read once per mount by this one parser; a word it does not
 * know is ignored, never an error. Not a setting for visitors: it shows
 * nothing and has no text.
 */

/** The parts the view can do without, in the order they are listed. */
export const LEAVE_OUT_PARTS = [
  'shadows',
  'far',
  'shade',
  'logdepth',
  // VENT-69: the ground's costs only the high tier pays (ground-policy.ts).
  'photometry',
  'antitile',
  'footprint',
  'fine',
  'rocks',
  // VENT-64 and VENT-67: the small craters' mesh and the clods' micro-relief.
  'craters',
  'grain',
] as const;

export type LeaveOut = (typeof LEAVE_OUT_PARTS)[number];

/** The parts `search`'s `onfoot` names, once each, in the list's order. */
export function parseLeaveOut(search: string): ReadonlySet<LeaveOut> {
  const words = (new URLSearchParams(search).get('onfoot') ?? '')
    .split(',')
    .map((word) => word.trim().toLowerCase());
  return new Set(LEAVE_OUT_PARTS.filter((part) => words.includes(part)));
}
