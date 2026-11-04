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
 * The Sun's shadow map on demand (VENT-73). Three redraws it on every frame
 * by default; here it renders only when something that casts or receives
 * the shadow changed (the Sun's direction, ground, rings, props or crater
 * patch geometry, the first frame), so turning the camera costs no shadow
 * pass. A change only marks the gate; the next frame asks for the render
 * (`needsUpdate`), which three clears once it has rendered.
 */

/** The part of `renderer.shadowMap` the gate drives. */
export interface ShadowMapSwitch {
  needsUpdate: boolean;
}

export interface ShadowGate {
  /** What casts or receives the Sun's shadow changed. */
  readonly mark: () => void;
  /** Asks the coming draw to render the shadow map, if marked. */
  readonly beforeDraw: () => void;
  /** Counts the render the draw did. */
  readonly afterDraw: () => void;
  /** Shadow-map renders so far (`data-shadows` on the host). */
  readonly renders: () => number;
}

/** A gate that starts marked: the first frame renders the map. */
export function createShadowGate(map: ShadowMapSwitch): ShadowGate {
  let marked = true;
  let asked = false;
  let renders = 0;
  return {
    mark: () => {
      marked = true;
    },
    beforeDraw: () => {
      if (!marked) return;
      marked = false;
      asked = true;
      map.needsUpdate = true;
    },
    afterDraw: () => {
      if (!asked || map.needsUpdate) return;
      asked = false;
      renders += 1;
    },
    renders: () => renders,
  };
}
