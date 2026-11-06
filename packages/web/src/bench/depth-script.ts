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
 * The depth suite's script (VENT-104), declarative like script.ts: the
 * on-foot view of IM-2 opened and settled as step c of script v1 does,
 * then turned by ArrowRight for {@link DEPTH_TURN_MS}, a key every 16 ms as
 * step d does. No globe step and no point change: what is compared is the
 * depth buffer alone. `fast` (the e2e's `&benchFast`) keeps a fifth of the
 * turn, for software GL.
 */
import {
  FAST, SETTLE_MS, TURN_GAP_MS, type Step,
} from './script';

/** The depth script's own version, in its report's suite line. */
export const DEPTH_SCRIPT_VERSION = 1;

/** How long the view is turned. */
export const DEPTH_TURN_MS = 60_000;

/** The depth suite's steps; `fast` scales the turn down. */
export function depthScript(fast: boolean): readonly Step[] {
  const ms = DEPTH_TURN_MS * (fast ? FAST.waits : 1);
  return [
    { id: 'openView', actions: [{ kind: 'view', view: 'horizon' },
      { kind: 'settle', timeoutMs: SETTLE_MS, park: false }] },
    { id: 'turnMinute', actions: [{ kind: 'keysFor', target: 'onFoot',
      key: 'ArrowRight', gapMs: TURN_GAP_MS, ms }] },
  ];
}
