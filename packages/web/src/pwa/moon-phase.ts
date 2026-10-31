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
 * The Moon's phase at an instant, for the live favicon and the loading
 * state: the share of the synodic month since new Moon, 0 new, 0.5 full.
 * It comes from the simulator's sky (VENT-36): how far the sub-solar point
 * has turned from the sub-Earth point around the Moon, which is the Sun's
 * elongation seen from the Earth. Within a quarter of an hour of the true
 * phases, and a frame of the favicon is a day. Pure.
 */
import { moonPosition, subEarthPoint, subSolarPoint } from '@ventana/sim';

/** Where an instant falls in the month of phases. */
export interface PhaseSource {
  /** 0 at new Moon, 0.25 first quarter, 0.5 full, 0.75 last quarter. */
  phaseAt(atMs: number): number;
}

/**
 * The phase from the sub-solar and sub-Earth points: at new Moon the Sun
 * is overhead on the far side, 180° from the Earth; at full Moon both are
 * overhead at the same point. The sub-solar point runs west, so the
 * phase grows as it does.
 */
export const simPhase: PhaseSource = {
  phaseAt: (atMs) => {
    const sun = subSolarPoint(atMs);
    const earth = subEarthPoint(moonPosition(atMs));
    const turns = (earth.lonEastDeg - sun.lonEastDeg + 180) / 360;
    return turns - Math.floor(turns);
  },
};
