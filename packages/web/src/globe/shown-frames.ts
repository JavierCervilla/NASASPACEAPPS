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
 * The globe's frames while its section is hidden (VENT-51). On a phone the
 * on-foot and DSN views hide the globe but keep it mounted, with its own
 * WebGL context; a hidden host reads 0 x 0. Then the stage keeps its size
 * and a frame asked for (the live clock's minute tick re-aims the Sun) draws
 * nothing and stops the loop, so the GPU is the visible view's. Shown again,
 * the host's size comes back: the stage is fitted and one frame is asked,
 * which draws whatever changed meanwhile (the Sun is aimed on each change,
 * drawn or not).
 */
import type { FrameFn } from './loop';

/** The host's size and what fitting the stage to it takes. */
export interface HostFit {
  readonly size: () => { readonly width: number; readonly height: number };
  readonly resize: (width: number, height: number) => void;
  readonly invalidate: () => void;
}

export interface ShownFrames {
  /** The loop's frame: `draw` while the host shows, nothing while hidden. */
  readonly frame: FrameFn;
  /** Reads the host: hidden at 0 wide or tall; shown, fits and redraws. */
  readonly fit: (host: HostFit) => void;
}

/** Gates `draw` on whether the host shows, as its last fit read it. */
export function shownFrames(draw: FrameFn): ShownFrames {
  let shown = true;
  return {
    frame: (dt) => shown && draw(dt),
    fit: ({ size, resize, invalidate }) => {
      const { width, height } = size();
      shown = width > 0 && height > 0;
      if (!shown) return;
      resize(width, height);
      invalidate();
    },
  };
}
