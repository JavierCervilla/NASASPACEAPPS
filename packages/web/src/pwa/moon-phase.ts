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
 * Behind an interface, so the analytic Sun of VENT-36 can replace this
 * approximation. Pure.
 */

/** Where an instant falls in the month of phases. */
export interface PhaseSource {
  /** 0 at new Moon, 0.25 first quarter, 0.5 full, 0.75 last quarter. */
  phaseAt(atMs: number): number;
}

const J2000_MS = Date.UTC(2000, 0, 1, 12);
const DAY_MS = 86_400_000;
const rad = (deg: number): number => (deg * Math.PI) / 180;

/**
 * The elongation of the Moon from the Sun, in degrees, from their mean
 * elements and the largest periodic terms (equation of the centre,
 * evection, variation, annual equation): within about half an hour of
 * the true phases, and a frame of the favicon is a day.
 */
function elongationDeg(atMs: number): number {
  const d = (atMs - J2000_MS) / DAY_MS;
  const moonMean = 218.316 + 13.176396 * d;
  const moonAnomaly = rad(134.963 + 13.064993 * d);
  const sunMean = 280.46 + 0.9856474 * d;
  const sunAnomaly = rad(357.529 + 0.9856003 * d);
  const mean = rad(moonMean - sunMean);
  const moon =
    moonMean +
    6.289 * Math.sin(moonAnomaly) +
    1.274 * Math.sin(2 * mean - moonAnomaly) +
    0.658 * Math.sin(2 * mean) -
    0.186 * Math.sin(sunAnomaly);
  const sun =
    sunMean + 1.915 * Math.sin(sunAnomaly) + 0.02 * Math.sin(2 * sunAnomaly);
  return moon - sun;
}

/** The phase from the Moon's and the Sun's mean orbits. */
export const meanOrbitPhase: PhaseSource = {
  phaseAt: (atMs) => {
    const turns = elongationDeg(atMs) / 360;
    return turns - Math.floor(turns);
  },
};
