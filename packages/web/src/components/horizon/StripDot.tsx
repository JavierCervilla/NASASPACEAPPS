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
 * A body's dot on the horizon strip (VENT-40): in its signal colour,
 * dimmed under the skyline where the terrain hides it, and past the
 * scale pinned to the edge it went past under a caret pointing on, so
 * the strip's stretch never changes for it.
 */
import type { LabelledMark } from '../../horizon/strip-model';

/** A caret over or under a dot past the scale, pointing on. */
function caret(mark: LabelledMark): string {
  const up = mark.offScale === 'above';
  const tip = up ? mark.y - 9 : mark.y + 9;
  const base = up ? mark.y - 6 : mark.y + 6;
  return `M${mark.x - 3},${base} L${mark.x},${tip} L${mark.x + 3},${base} Z`;
}

/** A body's dot, under the skyline when hidden. */
export function Dot({ mark }: { readonly mark: LabelledMark }) {
  const dot = (
    <circle
      className="horizon__body"
      data-body={mark.id}
      data-hidden={!mark.visible}
      cx={mark.x}
      cy={mark.y}
      r={mark.visible ? 5.5 : 4.5}
    />
  );
  if (mark.offScale === null) return dot;
  return (
    <>
      {dot}
      <path className="horizon__off" data-body={mark.id} data-off={mark.offScale} d={caret(mark)} />
    </>
  );
}
