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
 * The astronaut's idle (VENT-34): the clip pinned to a pose and played
 * only by the frames the view draws anyway, so an idle view still draws
 * nothing (globe/loop.ts). It stands at `POSE_S` seconds into the clip
 * (the rest pose, arms down) until a frame runs; a frame then moves it on
 * by that frame's time, unless the person asked for less motion, when it
 * never moves.
 */
import {
  AnimationClip,
  AnimationMixer,
  type Object3D,
} from 'three';

/** Where in the idle clip the figure stands before it moves, seconds. */
export const POSE_S = 0;

export interface Idle {
  /** Moves the idle on by `dt` seconds of a frame being drawn. */
  advance(dt: number): void;
}

/** Plays `clip` on `root` as above; `reduced()` is asked per frame. */
export function createIdle(
  root: Object3D,
  clip: AnimationClip,
  reduced: () => boolean,
): Idle {
  const mixer = new AnimationMixer(root);
  mixer.clipAction(clip).play();
  mixer.setTime(POSE_S);
  return {
    advance: (dt) => {
      if (!reduced() && dt > 0) mixer.update(dt);
    },
  };
}
