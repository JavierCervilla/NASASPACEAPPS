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
 * The polar map's side of the astronaut (VENT-10): its disk registered as
 * a place to drop it on, and the figure standing on its point when that
 * lies on the map.
 */
import type { RefObject } from 'react';
import { StandingAstronaut } from './StandingAstronaut';
import { usePolarSurface } from './use-surface';

interface Props {
  readonly disk: RefObject<HTMLElement | null>;
  /** The selected site's id. */
  readonly selected: string;
  readonly onPick: (id: string) => void;
}

export function PolarAstronaut({ disk, selected, onPick }: Props) {
  const surface = usePolarSurface(disk);
  const pin = { surface, selected, onSelect: onPick };
  return <StandingAstronaut {...pin} />;
}
