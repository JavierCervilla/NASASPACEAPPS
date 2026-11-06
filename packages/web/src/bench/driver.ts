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
 * Plays the script's actions on the page (VENT-81): views by their hash
 * (view-tabs.ts), keys as synthetic KeyboardEvents on the globe's or the
 * on-foot view's host (both listen on the element, globe/keys.ts and
 * scene/controls.ts), the point change through the site store as the site
 * list does it, and the waits. A key pressed for a time (the depth suite,
 * VENT-104) stops with an error as soon as the host says the view failed,
 * as the settle's wait does.
 */
import { goToView } from '../lib/view-tabs';
import type { SiteStore } from '../phone/site-store';
import type { Action, KeyTarget } from './script';
import {
  FAILED, hostMarks, ON_FOOT_HOST, waitSettled, type Sleep,
} from './settle';

export interface DriverDeps {
  readonly doc: Document;
  readonly place: { hash: string };
  readonly store: SiteStore;
  readonly sleep: Sleep;
}

const HOSTS: Readonly<Record<KeyTarget, string>> = {
  globe: '.globe-viewport',
  onFoot: ON_FOOT_HOST,
};

/** Presses `key` on `target`'s host, down then up, if it is there. */
function press(doc: Document, target: KeyTarget, key: string): void {
  const el = doc.querySelector<HTMLElement>(HOSTS[target]);
  for (const type of ['keydown', 'keyup']) {
    el?.dispatchEvent(new KeyboardEvent(type,
      { key, bubbles: true, cancelable: true }));
  }
}

/** Presses `keys` on `target`, `gapMs` apart. */
async function pressAll(
  deps: DriverDeps,
  action: Extract<Action, { kind: 'keys' }>,
): Promise<void> {
  for (const key of action.keys) {
    press(deps.doc, action.target, key);
    await deps.sleep(action.gapMs);
  }
}

/** Presses `action.key` every `gapMs` for `ms`, until the view fails. */
async function pressFor(
  deps: DriverDeps,
  action: Extract<Action, { kind: 'keysFor' }>,
): Promise<void> {
  const end = performance.now() + action.ms;
  while (performance.now() < end) {
    const status = hostMarks(deps.doc)?.status ?? '';
    if (FAILED.has(status)) throw new Error(`3D view failed: ${status}`);
    press(deps.doc, action.target, action.key);
    await deps.sleep(action.gapMs);
  }
}

/** Plays `action`; true when a wait for the view timed out. */
export async function act(action: Action, deps: DriverDeps): Promise<boolean> {
  switch (action.kind) {
    case 'view':
      goToView(deps.place, action.view);
      return false;
    case 'wait':
      await deps.sleep(action.ms);
      return false;
    case 'keys':
      await pressAll(deps, action);
      return false;
    case 'keysFor':
      await pressFor(deps, action);
      return false;
    case 'site':
      deps.store.select(action.id, 'list');
      return false;
    case 'settle':
      return waitSettled(deps.doc, action, deps.sleep);
  }
}
