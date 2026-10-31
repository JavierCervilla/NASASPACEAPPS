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
 * How close the analytic sky (sky.ts) is to JPL Horizons, as the web says
 * it to the visitor: the bound on the Sun's and the Earth's elevation, and
 * the months it was checked over. tests/sky.test.ts holds the model to
 * this bound over exactly that period, so the claim and the check cannot
 * drift apart. Outside the period the same model is extrapolated, unchecked.
 */

/** The bound, in degrees, on the Sun's and the Earth's elevation error. */
export const VALIDATED_ELEVATION_DEG = 0.05;

/** The first hour of the validated period, ISO 8601 UTC. */
export const VALIDATED_FROM = '2026-11-01T00:00:00Z';

/** The last hour of the validated period, ISO 8601 UTC. */
export const VALIDATED_TO = '2026-12-31T23:00:00Z';
