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
 * The astronaut's figure (VENT-10): its picture for the pose and visor
 * colour, a cell of the sprite sheet baked offline
 * (astronaut/figure-types.ts; styles/astronaut.css picks the cell), or,
 * before the island runs and under Save-Data, a plain silhouette with a
 * tinted visor. The visor is neutral silver at home and off the Moon; a
 * signal colour only says a state. Decorative: the button around it
 * carries the name.
 */
import { useSyncExternalStore } from 'react';
import type { Pose, Visor } from '../../astronaut/figure-types';
import { prefersSaveData } from '../../lib/viewport';

interface Props {
  readonly pose: Pose;
  readonly visor: Visor;
  readonly className?: string;
}

const steady = (): (() => void) => () => undefined;

/** Whether the sheet may load: in the browser, unless it saves data. */
const useSheet = (): boolean =>
  useSyncExternalStore(steady, () => !prefersSaveData(), () => false);

export function Figure({ pose, visor, className = '' }: Props) {
  const sheet = useSheet();
  return (
    <span
      className={`astro-figure ${className}`.trim()}
      data-pose={pose}
      data-visor={visor}
      aria-hidden="true"
    >
      {sheet ? (
        <span className="astro-figure__image" />
      ) : (
        <span className="astro-figure__plain">
          <span className="astro-figure__visor" />
        </span>
      )}
    </span>
  );
}
