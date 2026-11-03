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
 * «New version ready» (VENT-52): when a new build's service worker takes
 * the open page over. The worker installs with `skipWaiting` and
 * activates with `clients.claim` (sw-worker.ts), so a new version
 * controls the page at once and deletes the old build's cache: the cue is
 * `controllerchange` on a page that already had a controller. A first
 * install also changes the controller (from none) and is no new version.
 * An installed app stays open for days, so the check runs when the app
 * opens and again each time it comes back to the foreground.
 */

/** What the watch needs of `navigator.serviceWorker`. */
export interface UpdateContainer {
  readonly controller: unknown;
  readonly ready: Promise<{ update(): Promise<unknown> }>;
  addEventListener(type: 'controllerchange', listener: () => void): void;
  removeEventListener(type: 'controllerchange', listener: () => void): void;
}

/** What the watch needs of `document`. */
export interface VisibilityDoc {
  readonly visibilityState: string;
  addEventListener(type: 'visibilitychange', listener: () => void): void;
  removeEventListener(type: 'visibilitychange', listener: () => void): void;
}

export interface UpdateWatch {
  readonly container: UpdateContainer | undefined;
  readonly saveData: boolean;
  readonly doc: VisibilityDoc;
  /** Called when a new version controls the page. */
  readonly onReady: () => void;
}

/** A takeover is a new version only over a page a worker already ran. */
export function isNewVersion(hadController: boolean, saveData: boolean) {
  return hadController && !saveData;
}

/** Whether the row shows; offline, the offline notice keeps the slot. */
export function showsUpdate(state: {
  readonly ready: boolean;
  readonly dismissed: boolean;
  readonly online: boolean;
}): boolean {
  return state.ready && !state.dismissed && state.online;
}

/** Asks the browser to look for a new `sw.js`; a failure is quiet. */
function checkForUpdate(container: UpdateContainer): void {
  container.ready
    .then((registration) => registration.update())
    .catch(() => undefined);
}

/**
 * Watches for a new version and checks for one now and on each return
 * to the foreground; nothing without a worker or under Save-Data (no
 * worker is registered then). Returns the stop.
 */
export function watchForUpdate(watch: UpdateWatch): () => void {
  const { container, saveData, doc, onReady } = watch;
  if (!container || saveData) return () => undefined;
  let hadController = container.controller !== null;
  const onChange = (): void => {
    if (isNewVersion(hadController, saveData)) onReady();
    hadController = container.controller !== null;
  };
  const onVisible = (): void => {
    if (doc.visibilityState === 'visible') checkForUpdate(container);
  };
  container.addEventListener('controllerchange', onChange);
  doc.addEventListener('visibilitychange', onVisible);
  checkForUpdate(container);
  return () => {
    container.removeEventListener('controllerchange', onChange);
    doc.removeEventListener('visibilitychange', onVisible);
  };
}
