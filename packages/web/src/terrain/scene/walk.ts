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
 * Walking in the on-foot view (VENT-121, the human's variant 3A): a tap on
 * the ground, an arrow key or «Back» sends the eye there (walk-move.ts); on
 * a fine pointer a ring on the ground under it says where a click goes, and
 * on touch it shows at the tap and fades as the glide starts.
 */
import type { EastNorth } from '../walk/walk-reach';
import { groundAt } from './walk-pick';
import { createWalkMarker, type WalkMarker } from './walk-marker';
import { goTo, type WalkParts } from './walk-move';

export interface Walker {
  readonly marker: WalkMarker;
  /** A tap at a client point: the ground there, or nothing on the sky. */
  readonly tap: (x: number, y: number, touch: boolean) => void;
  /** A fine pointer over the view; null: it left. */
  readonly hover: (at: { x: number; y: number } | null) => void;
  /** Glides `delta` metres east and north on from where it goes. */
  readonly step: (delta: EastNorth) => void;
  /** Glides back to the point. */
  readonly back: () => void;
  /** Takes the marker's label out of the host and frees its ring. */
  readonly dispose: () => void;
}

/** The walker of `parts`, its marker in the scene. */
export function createWalker(parts: WalkParts): Walker {
  const { world, view } = parts;
  const marker = createWalkMarker({ ground: () => world.ground,
    eye: () => view.eye, host: parts.host,
    words: (m) => world.input?.words.distance?.(m) ?? '' });
  world.stage.scene.add(marker.mesh);
  const show = (at: EastNorth | null): void =>
    void (marker.show(at), world.invalidate());
  return { marker,
    tap: (x, y, touch) => {
      const at = groundAt(world, x, y);
      if (!at) return;
      if (touch) show(at);
      view.fading = touch;
      goTo(parts, at);
    },
    hover: (p) => show(p ? groundAt(world, p.x, p.y) : null),
    step: (delta) => {
      const from = view.glide?.to ?? view.eye;
      goTo(parts, [from[0] + delta[0], from[1] + delta[1]]);
    },
    back: () => goTo(parts, [0, 0]),
    dispose: marker.dispose };
}

