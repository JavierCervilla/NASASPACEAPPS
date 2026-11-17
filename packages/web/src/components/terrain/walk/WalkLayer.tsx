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
 * The walk's surfaces over the on-foot view (VENT-121): the first-time
 * hint until the first move, chip 3A while the eye stands away from the
 * point, the edge card once it was held to the reach, and a polite live
 * region that says each arrival («180 m NE of IM-2 · Window here»).
 */
import type { EyeReport } from '../../../terrain/scene/scene-types';
import { isAway } from '../../../terrain/walk/walk-reach';
import { walkView, type WalkSky } from '../../../terrain/walk/walk-view';
import { useI18n } from '../../i18n-context';
import { WalkChip } from './WalkChip';
import { WalkEdge } from './WalkEdge';
import { WalkHint } from './WalkHint';

export interface WalkProps {
  readonly eye: EyeReport | null;
  /** The sky, the Sun hidden at a site in permanent shadow (VENT-128). */
  readonly sky: WalkSky | null;
  /** The site's short name, or the custom point's. */
  readonly site: string;
  readonly onBack: () => void;
  /** Drops a pin where the eye stands; null: the page has no pin. */
  readonly onPin: (() => void) | null;
}

export function WalkLayer({ eye, sky, site, onBack, onPin }: WalkProps) {
  const i18n = useI18n();
  const view = walkView(i18n, eye, sky, site);
  const moved = eye !== null && isAway(eye.at);
  return (
    <>
      <WalkHint moved={moved} />
      {view ? <WalkChip view={view} site={site} onBack={onBack} /> : null}
      {view?.edge ? (
        <WalkEdge text={view.edge} site={site} onPin={onPin} onBack={onBack} />
      ) : null}
      <p className="visually-hidden" aria-live="polite">{view?.said ?? ''}</p>
    </>
  );
}
