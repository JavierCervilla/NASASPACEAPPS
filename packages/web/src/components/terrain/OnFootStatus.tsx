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
 * outlasted its retries (with «Try again»), no WebGL, a GPU context the
 * browser took away (the same words and «Try again» as an unavailable
 * terrain, plus a quieter «Copy report» that copies the crash report,
 * VENT-49), or a site with no coordinates. Nothing once the scene draws.
 */
import type { TextKey } from '../../i18n/catalogue';
import type { RingState } from '../../terrain/ring/ring-session';
import { useI18n } from '../i18n-context';
import { useCopyReport } from './use-copy-report';
import type { SceneStatus } from './use-terrain-scene';

interface Props {
  readonly located: boolean;
  readonly tile: RingState;
  readonly scene: SceneStatus;
  readonly onRetry: () => void;
  /** Copies the crash report; whether anything was copied. */
  readonly onCopyReport: () => Promise<boolean>;
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
  if (scene === 'lost') return 'onFoot.unavailable';
  if (scene === 'missing') return 'update.view';
  if (tile.kind !== 'ready') return TILE_WORDS[tile.kind];
  if (scene === 'failed') return 'onFoot.noWebgl';
  return scene === 'loading' ? 'onFoot.loading' : null;
}

interface ActionsProps {
  readonly lost: boolean;
  readonly onRetry: () => void;
  readonly onCopy: () => void;
}

/** «Try again», and in the lost state a quieter «Copy report». */
function Actions({ lost, onRetry, onCopy }: ActionsProps) {
  const { t } = useI18n();
  return (
    <div className="on-foot__actions">
      <button type="button" className="on-foot__retry" onClick={onRetry}>
        {t('data.retry')}
      </button>
      {lost ? (
        <button type="button" className="on-foot__copy" onClick={onCopy}>
          {t('onFoot.copyReport')}
        </button>
      ) : null}
    </div>
  );
}

export function OnFootStatus(props: Props) {
  const { t } = useI18n();
  const copy = useCopyReport(props.onCopyReport, props.scene);
  const key = wordsOf(props);
  if (!key) return null;
  const lost = props.scene === 'lost';
  const copied = copy.outcome === 'copied';
  return (
    <div className="on-foot__status" role="status" aria-atomic="false">
      <p>{t(key)}</p>
      {props.tile.kind === 'unavailable' || lost ? (
        <Actions lost={lost} onRetry={props.onRetry} onCopy={copy.press} />
      ) : null}
      {copy.outcome ? (
        <p className="on-foot__copied">
          {t(copied ? 'onFoot.reportCopied' : 'onFoot.reportNotCopied')}
        </p>
      ) : null}
    </div>
  );
}
