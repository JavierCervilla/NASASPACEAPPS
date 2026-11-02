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
 * What the on-foot view says when it cannot show the ground (VENT-34):
 * loading, no terrain here, none installed on the server, a failure that
 * outlasted its retries (with «Try again»), no WebGL, or a site with no
 * coordinates. Nothing once the scene draws.
 */
import type { TextKey } from '../../i18n/catalogue';
import type { RingState } from '../../terrain/ring/ring-session';
import { useI18n } from '../i18n-context';
import type { SceneStatus } from './use-terrain-scene';

interface Props {
  readonly located: boolean;
  readonly tile: RingState;
  readonly scene: SceneStatus;
  readonly onRetry: () => void;
}

const TILE_WORDS: Readonly<Record<RingState['kind'], TextKey | null>> = {
  loading: 'onFoot.loading',
  ready: null,
  noTerrain: 'onFoot.noTerrain',
  notInstalled: 'horizon.notInstalled',
  unavailable: 'onFoot.unavailable',
};

/** The message's key, or null when the scene shows. */
function wordsOf({ located, tile, scene }: Props): TextKey | null {
  if (!located) return 'onFoot.noPoint';
  if (tile.kind !== 'ready') return TILE_WORDS[tile.kind];
  if (scene === 'failed') return 'onFoot.noWebgl';
  return scene === 'loading' ? 'onFoot.loading' : null;
}

export function OnFootStatus(props: Props) {
  const { t } = useI18n();
  const key = wordsOf(props);
  if (!key) return null;
  return (
    <div className="on-foot__status" role="status">
      <p>{t(key)}</p>
      {props.tile.kind === 'unavailable' ? (
        <button type="button" className="on-foot__retry" onClick={props.onRetry}>
          {t('data.retry')}
        </button>
      ) : null}
    </div>
  );
}
