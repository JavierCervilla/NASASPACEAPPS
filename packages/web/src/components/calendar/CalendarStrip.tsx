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
 * The desktop calendar strip under the globe (validated canvas «Globe
 * view»): the month with its arrows, the date with «Now», the legend, the
 * Sun, Earth and window bars from the API's hourly data, the instant line
 * and the day ticks, then Play and a slider over the month's hours (arrows
 * move an hour, Page Up and Page Down a day). The slider's track spans the
 * bars' column, so its thumb sits on the instant line.
 */
import { monthLabel } from '../../calendar/instant-format';
import { dayTicks } from '../../calendar/month';
import { instantPct, type MonthStrip } from '../../calendar/month-strip';
import { monthYear } from '../../i18n/format';
import { formatShare } from '../../phone/format';
import { useI18n } from '../i18n-context';
import { CompareNote } from './CompareNote';
import type { Calendar, CalendarParts } from './hooks';
import { MonthArrows, NoWindowNote, SignalBar } from './parts';
import { StripStatus } from './StripStatus';
import { StripClock, TimeSlider } from './TimeSlider';

interface Props {
  readonly parts: CalendarParts;
  readonly calendar: Calendar;
}

/** The four signals, and «Differs» under «Compare». */
function Legend({ comparing }: { readonly comparing: boolean }) {
  const { t } = useI18n();
  const keys = [
    ['sun', t('signal.sun')],
    ['earth', t('signal.earth')],
    ['window', t('calendar.both')],
    ['none', t('signal.neither')],
    ...(comparing ? [['differs', t('calendar.differs')]] : []),
  ];
  return (
    <ul className="strip__legend" aria-label={t('calendar.legend')}>
      {keys.map(([tone, label]) => (
        <li key={tone}><span className="legend-key" data-tone={tone} />{label}</li>
      ))}
    </ul>
  );
}

/** The three bars, the instant on the window bar, and the day ticks. */
function Bars({ calendar, atMs }: { calendar: Calendar; atMs: number }) {
  const { strip, diff } = calendar;
  const i18n = useI18n();
  if (!strip) return <StripStatus calendar={calendar} />;
  const share = (pct: number) =>
    formatShare(i18n, pct, monthYear(i18n, atMs));
  const rows = [
    ['sun', i18n.t('signal.sun'), strip.sun, strip.sunPct],
    ['earth', i18n.t('signal.earth'), strip.earth, strip.earthPct],
    ['window', i18n.t('signal.window'), strip.window, strip.windowPct],
  ] as const;
  return (
    <>
      {rows.map(([tone, label, segments, pct]) => (
        <div key={tone} className="strip__row" role="img" aria-label={i18n.t('calendar.row', { label, share: share(pct) })}>
          <span className="strip__label" aria-hidden="true">{label}</span>
          <SignalBar tone={tone} segments={segments} axis="horizontal" differs={diff?.[tone]}>
            {tone === 'window' ? <WindowMarks strip={strip} atMs={atMs} /> : null}
          </SignalBar>
        </div>
      ))}
      <DayTicks atMs={atMs} />
    </>
  );
}

/** On the window bar: the instant line, and a note if it never opens. */
function WindowMarks({ strip, atMs }: { strip: MonthStrip; atMs: number }) {
  return (
    <>
      <NoWindowNote strip={strip} className="signal-bar__note" />
      <span className="instant-line" style={{ left: `${instantPct(atMs)}%` }} />
    </>
  );
}

function DayTicks({ atMs }: { atMs: number }) {
  return (
    <div className="strip__days" aria-hidden="true">
      {dayTicks(atMs).map(({ day, pct }) => (
        <span key={day} style={{ left: `${pct}%` }}>{day}</span>
      ))}
    </div>
  );
}

export function CalendarStrip({ parts, calendar }: Props) {
  const atMs = calendar.state?.atMs ?? null;
  const i18n = useI18n();
  const label = i18n.t('calendar.label');
  if (atMs === null) {
    return <section className="strip" aria-label={label} aria-busy="true" />;
  }
  return (
    <section className="strip" aria-label={label}>
      <div className="strip__head">
        <MonthArrows parts={parts} atMs={atMs}>
          <h2 className="strip__month">{monthLabel(i18n, atMs)}</h2>
        </MonthArrows>
        <StripClock parts={parts} calendar={calendar} />
        <CompareNote calendar={calendar} className="strip__compare" />
        <Legend comparing={calendar.diff !== null} />
      </div>
      <div className="strip__grid">
        <Bars calendar={calendar} atMs={atMs} />
        <TimeSlider parts={parts} calendar={calendar} />
      </div>
    </section>
  );
}
