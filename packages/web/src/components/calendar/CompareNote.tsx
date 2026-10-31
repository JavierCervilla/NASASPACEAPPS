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
 * Under «Compare» (VENT-36): how many hours of the month the simulator and
 * Horizons disagree on, or, honestly, that the comparison waits for
 * Horizons or cannot be made without it. Nothing outside «Compare».
 * And the hatch's key, for a view without the strip's legend.
 */
import { useI18n } from '../i18n-context';
import type { Calendar } from './hooks';

interface Props {
  readonly calendar: Calendar;
  readonly className: string;
  /** With the hatch's key, for a view without the strip's legend. */
  readonly keyed?: boolean;
}

/** The note's text; null while there is nothing to say. */
function noteText(calendar: Calendar, i18n: ReturnType<typeof useI18n>) {
  const { compare, diff } = calendar;
  if (compare.kind === 'pending') return i18n.t('compare.pending');
  if (compare.kind === 'unavailable') return i18n.t('compare.unavailable');
  if (compare.kind === 'off' || !diff) return null;
  return i18n.plural('compare.differ', diff.hours);
}

/** Under «Compare», next to the count: what the hatch means. */
function DiffersKey() {
  const { t } = useI18n();
  return (
    <ul className="calendar__legend" aria-label={t('calendar.legend')}>
      <li><span className="legend-key" data-tone="differs" />{t('calendar.differs')}</li>
    </ul>
  );
}

export function CompareNote({ calendar, className, keyed }: Props) {
  const i18n = useI18n();
  const text = noteText(calendar, i18n);
  if (text === null) return null;
  return (
    <>
      <p className={className} role="status" data-compare={calendar.compare.kind}>
        {text}
      </p>
      {keyed && calendar.diff ? <DiffersKey /> : null}
    </>
  );
}
