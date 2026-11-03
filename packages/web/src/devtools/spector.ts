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
 * Spector.js, the WebGL frame capture tool, started on `#stats-spector`.
 * A dev-only dependency fetched only when asked for: it adds about 1 MB.
 *
 * Split out of dev-tools.ts, ported from GAMESTUDIO's Web starter
 * (`studio/engines/web/scaffold/packages/client/src/engine/dev-tools.ts`).
 */

/**
 * Spies on every canvas from now on and shows Spector.js's capture UI. Only
 * the dev server and a PUBLIC_PERF_HUD=1 build carry it: in a production
 * build the condition is a constant false and the bundler drops the import.
 */
export async function startSpector(): Promise<void> {
  if (import.meta.env.DEV || import.meta.env.PUBLIC_PERF_HUD === '1') {
    const { Spector } = await import('spectorjs');
    const spector = new Spector();
    spector.spyCanvases();
    spector.displayUI();
  }
}
