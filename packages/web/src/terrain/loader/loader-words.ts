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
 * What the on-foot loader says (VENT-60, the canvas's words): the phase's
 * line with its note and its bar, the ring the plan shows, and the far
 * relief's chip after the hand-over. The sizes are the levels' own (2, 8,
 * 32 and 128 km, nodes 15.6 m to 1 km apart). Pure.
 */
import { TILE_CELLS, nominalSpacingM } from '@ventana/sim';
import type { I18n } from '../../i18n/translate';
import { tally, type RingProgress } from '../ring/ring-progress';
import { NEAR_LEVELS, farTally, type LoaderPhase } from './loader-phase';

export interface LoaderWords {
  readonly title: string;
  readonly note: string;
  /** The bar's share, 0 to 1. */
  readonly bar: number;
}

/** A level's tile side, km. */
const tileKm = (level: number): number =>
  (nominalSpacingM(level) * TILE_CELLS) / 1000;

/** The words of `phase` over the tiles of `p`. */
export function loaderWords(
  i18n: I18n,
  phase: Exclude<LoaderPhase, 'handover'>,
  p: RingProgress,
): LoaderWords {
  const { done, total } = tally(p, 0, NEAR_LEVELS);
  if (phase === 'list') {
    return { title: i18n.t('onFoot.loader.list'),
      note: i18n.t('onFoot.loader.listNote'), bar: 0 };
  }
  if (phase === 'near') {
    const note = i18n.t('onFoot.loader.nearNote',
      { near: i18n.number(tileKm(0)), mid: i18n.number(tileKm(1)) });
    return { title: i18n.plural('onFoot.loader.near', total, { done }),
      note, bar: total === 0 ? 0 : done / total };
  }
  return { title: i18n.t('onFoot.loader.shaping'),
    note: i18n.plural('onFoot.loader.shapingNote', total, { done: total }),
    bar: 1 };
}

/** The ring the plan shows: «2 km tiles · 15.6 m». */
export function ringLabel(i18n: I18n, level: number): string {
  const spacing = nominalSpacingM(level);
  return i18n.t('onFoot.loader.ring', {
    size: i18n.number(tileKm(level)),
    spacing: i18n.number(spacing, spacing < 100 ? 1 : 0),
  });
}

/** The far relief's chip: its count, then which rings are in. */
export function farWords(
  i18n: I18n,
  p: RingProgress,
): { title: string; detail: string } | null {
  const far = farTally(p);
  if (!far) return null;
  const title = i18n.t('onFoot.loader.far');
  if (far.done < far.total) {
    return { title,
      detail: i18n.plural('onFoot.loader.farCount', far.total,
        { done: far.done }) };
  }
  const levels = [...new Set(p.tiles.map((t) => t.level))]
    .filter((level) => level >= NEAR_LEVELS).sort((a, b) => a - b);
  const sizes = new Intl.ListFormat(i18n.tag, { type: 'conjunction' })
    .format(levels.map((level) => i18n.number(tileKm(level))));
  return { title, detail: i18n.t('onFoot.loader.farIn', { sizes }) };
}
