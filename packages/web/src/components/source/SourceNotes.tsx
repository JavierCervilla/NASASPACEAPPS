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
 * Quiet notes under data the simulator computed (VENT-36): the caption
 * that says the hours are ours and approximate, with the error measured
 * against JPL Horizons, or extrapolated outside the months checked
 * (Javier's decision); and, when Horizons (or Compare) was chosen and
 * failed, that it is unavailable and the view shows the computed sky, with
 * a retry. The caption waits while the computed hours only stand in for
 * Horizons.
 */
import { computedCaption } from '../../source/computed-caption';
import { useI18n } from '../i18n-context';

interface Month {
  readonly computed: boolean;
  readonly provisional: boolean;
  readonly horizonsDown: boolean;
  readonly retry: () => void;
}

interface Props {
  readonly month: Month;
  /**
   * The selected instant: its month says whether it was checked; null
   * before the clock runs, and then there are no notes.
   */
  readonly atMs: number | null;
}

function HorizonsDown({ onRetry }: { readonly onRetry: () => void }) {
  const { t } = useI18n();
  return (
    <p className="source-note source-note--down" role="status">
      <span>{t('source.down')}</span>
      <button type="button" className="source-note__retry" onClick={onRetry}>
        {t('data.retry')}
      </button>
    </p>
  );
}

/**
 * Only that Horizons is down, with its retry: the phone's summary puts it
 * above the widgets, where the tab bar never covers it.
 */
export function SourceDown({ month, atMs }: Props) {
  if (atMs === null || !month.horizonsDown) return null;
  return <HorizonsDown onRetry={month.retry} />;
}

/** Only the caption, once the computed hours are the answer. */
export function SourceCaption({ month, atMs }: Props) {
  const i18n = useI18n();
  if (atMs === null || !month.computed || month.provisional) return null;
  return (
    <p className="source-note source-note--caption">
      {computedCaption(i18n, atMs)}
    </p>
  );
}

export function SourceNotes(props: Props) {
  return (
    <>
      <SourceDown {...props} />
      <SourceCaption {...props} />
    </>
  );
}
