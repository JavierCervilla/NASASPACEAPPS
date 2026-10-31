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
 * colour (astronaut/figure-types.ts) or, until the pictures are drawn or
 * where they cannot be, a plain silhouette with a tinted visor. The visor
 * is neutral silver at home and off the Moon; a signal colour only says a
 * state. Decorative: the button around it carries the name.
 */
import type { Pose, Visor } from '../../astronaut/figure-types';
import { useAstronaut, useWatched } from './context';

interface Props {
  readonly pose: Pose;
  readonly visor: Visor;
  readonly className?: string;
}

export function Figure({ pose, visor, className = '' }: Props) {
  const kit = useAstronaut();
  const images = useWatched(kit?.figures ?? null, null);
  const src = images?.[pose][visor];
  return (
    <span
      className={`astro-figure ${className}`.trim()}
      data-pose={pose}
      data-visor={visor}
      aria-hidden="true"
    >
      {src ? (
        <img className="astro-figure__image" src={src} alt="" draggable={false} />
      ) : (
        <span className="astro-figure__plain">
          <span className="astro-figure__visor" />
        </span>
      )}
    </span>
  );
}
