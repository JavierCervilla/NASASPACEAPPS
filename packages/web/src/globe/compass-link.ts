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
 * What the globe hands the page for its compass (VENT-50), while it is
 * mounted: where the camera is, a way back to the opening view, and a
 * call after each drawn frame, so the Earth mark follows the globe as it
 * turns. Kept apart from the pin's view (globe-view.ts): that one is a
 * place to drop the pin on, this one a camera to read and to send home.
 */
import type { Vec3 } from './geo';
import type { GlobeView } from './globe-view';
import type { Stage } from './stage';

export interface GlobeCompass {
  /** The camera's position, in Moon radii from the Moon's centre. */
  eye(): Vec3;
  /** Turns the globe back to its opening view, framing the selected site. */
  home(): void;
  /** Calls `listener` after every drawn frame; returns the unsubscribe. */
  subscribe(listener: () => void): () => void;
}

export interface CompassLinkParts {
  readonly stage: Pick<Stage, 'camera'>;
  readonly frames: Pick<GlobeView, 'subscribe'>;
  readonly home: () => void;
  readonly onCompass?: ((compass: GlobeCompass | null) => void) | undefined;
}

/** Hands the page the compass; returns how to take it back. */
export function linkCompass(parts: CompassLinkParts): () => void {
  const { stage, frames, home, onCompass } = parts;
  onCompass?.({
    eye: () => stage.camera.position,
    home,
    subscribe: frames.subscribe,
  });
  return () => onCompass?.(null);
}
