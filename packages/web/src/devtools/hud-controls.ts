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
 * The readout's buttons: one per quality tier and one for Spector.js. Each
 * reloads the page with its choice in the address's hash, since the tier and
 * Spector.js are read at boot.
 *
 * Split out of perf-hud.ts, ported from GAMESTUDIO's Web starter
 * (`studio/engines/web/scaffold/packages/client/src/engine/perf-hud.ts`).
 */
import { TIERS, type Tier } from '../lib/quality';
import { debugHash, type DebugFlags } from './debug-flags';
import { HUD_MARKER, PERF_TEXT } from './perf-text';

function row(parent: HTMLElement): HTMLElement {
  const element = document.createElement('div');
  element.className = `${HUD_MARKER}__row`;
  parent.append(element);
  return element;
}

function toggle(
  parent: HTMLElement,
  label: string,
  active: boolean,
  onClick: () => void,
): void {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = `${HUD_MARKER}__toggle`;
  element.textContent = label;
  element.setAttribute('aria-pressed', String(active));
  element.addEventListener('click', onClick);
  parent.append(element);
}

function restart(flags: DebugFlags): void {
  window.location.hash = debugHash(flags);
  window.location.reload();
}

/** Appends the tier and Spector.js buttons to `parent`, in one row. */
export function appendControls(
  parent: HTMLElement,
  current: Tier,
  flags: DebugFlags,
): void {
  const controls = row(parent);
  for (const tier of TIERS) {
    const label = PERF_TEXT.tiers[tier];
    toggle(controls, label, tier === current, () =>
      restart({ ...flags, tier }),
    );
  }
  toggle(controls, PERF_TEXT.spector, flags.spector, () =>
    restart({ tier: current, spector: !flags.spector }),
  );
}
