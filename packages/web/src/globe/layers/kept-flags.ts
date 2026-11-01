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
 * The layers' flags kept on the device (VENT-37): which layers the visitor
 * switched off stays so on the next visit. Read defensively (storage is the
 * visitor's): only well-formed ids with true or false, at most
 * {@link MAX_FLAGS} of them; anything else is ignored. Storage can be
 * missing or refuse access, and then nothing is kept and nothing breaks.
 */
import type { ChoiceStorage } from '../../i18n/choice';
import type { LayerRegistry } from './registry';

/** Where the flags are kept. */
export const FLAGS_KEY = 'ventana.layers';
const MAX_FLAGS = 32;
const LAYER_ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

/** The kept flags by layer id; none when there are none or they are bad. */
export function readFlags(
  storage: ChoiceStorage | null,
): Record<string, boolean> {
  let data: unknown;
  try {
    data = JSON.parse(storage?.getItem(FLAGS_KEY) ?? 'null');
  } catch {
    return {};
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return {};
  }
  const flags = Object.entries(data).filter(
    ([id, on]) => LAYER_ID.test(id) && typeof on === 'boolean',
  );
  return Object.fromEntries(flags.slice(0, MAX_FLAGS));
}

/**
 * Keeps each flag `registry` changes in `storage`, beside the others kept
 * (a layer need not be registered: the globe's own come and go with it);
 * returns the unsubscribe.
 */
export function keepFlags(
  registry: Pick<LayerRegistry, 'subscribe' | 'isVisible'>,
  storage: ChoiceStorage | null,
): () => void {
  return registry.subscribe(({ kind, id }) => {
    if (kind !== 'visibility') return;
    const flags = { ...readFlags(storage), [id]: registry.isVisible(id) };
    try {
      storage?.setItem(FLAGS_KEY, JSON.stringify(flags));
    } catch {
      // Refused storage: the flags hold for this page only.
    }
  });
}
