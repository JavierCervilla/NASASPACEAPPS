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
 * The readout's line of the address's diagnostic switches (VENT-105), so a
 * screenshot of it says under which address it was taken. Each switch is
 * read through the parser the app reads it with, and only known words and
 * values are shown: the query's own text is never echoed.
 */
import { askedSuite } from '../bench/depth-suite';
import { forcedGlass } from '../glass/glass-gate';
import { ktx2Off } from '../globe/ktx2-target';
import { benchAsked } from '../lib/bench-param';
import { forcedTier } from '../lib/quality';
import { depthChoice } from '../terrain/depth-mode';
import { parseLeaveOut } from '../terrain/leave-out';
import { parseRockLook } from '../terrain/rock-look';

type SwitchWord = (search: string) => string | null;

const NOTHING_LEFT_OUT = new Set<never>();

/** One reader per switch, in the order the line names them. */
const SWITCHES: readonly SwitchWord[] = [
  (search) => {
    const { asked } = depthChoice(search, NOTHING_LEFT_OUT, true);
    return asked && `depth=${asked}`;
  },
  (search) => (depthChoice(search, NOTHING_LEFT_OUT, true).forceShadows
    ? 'shadows=force' : null),
  (search) => (ktx2Off(search) ? 'ktx2=0' : null),
  (search) => {
    const parts = [...parseLeaveOut(search)];
    return parts.length > 0 ? `onfoot=${parts.join(',')}` : null;
  },
  (search) => (parseRockLook(search) === 'stones' ? 'rocks=stones' : null),
  (search) => {
    const tier = forcedTier(search);
    return tier && `quality=${tier}`;
  },
  (search) => {
    const glass = forcedGlass(search);
    return glass && `glass=${glass}`;
  },
  (search) => {
    if (!benchAsked(search)) return null;
    const suite = askedSuite(new URLSearchParams(search));
    return suite ? `bench=${suite}` : 'bench';
  },
];

/** «switches: depth=linear shadows=force», or «switches: none». */
export function switchLine(search: string): string {
  const words = SWITCHES.map((read) => read(search))
    .filter((word): word is string => word !== null);
  return `switches: ${words.length > 0 ? words.join(' ') : 'none'}`;
}
