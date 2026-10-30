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
import type { Calendar, CalendarParts } from './hooks';
import { MonthArrows, NoWindowNote, SignalBar } from './parts';
import { StripStatus } from './StripStatus';
import { StripClock, TimeSlider } from './TimeSlider';

interface Props {
  readonly parts: CalendarParts;
  readonly calendar: Calendar;
}

function Legend() {
  const keys = [
    ['sun', 'Sun'],
    ['earth', 'Earth'],
    ['window', 'Both: landing window'],
    ['none', 'Neither'],
  ];
  return (
    <ul className="strip__legend" aria-label="Legend">
      {keys.map(([tone, label]) => (
        <li key={tone}><span className="legend-key" data-tone={tone} />{label}</li>
      ))}
    </ul>
  );
}

/** The three bars, the instant on the window bar, and the day ticks. */
function Bars({ calendar, atMs }: { calendar: Calendar; atMs: number }) {
  const { strip } = calendar;
  if (!strip) return <StripStatus calendar={calendar} />;
  const month = monthLabel(atMs);
  const share = (pct: number) => `${Math.round(pct)} % of ${month}`;
  const rows = [
    ['sun', 'Sun', strip.sun, strip.sunPct],
    ['earth', 'Earth', strip.earth, strip.earthPct],
    ['window', 'Window', strip.window, strip.windowPct],
  ] as const;
  return (
    <>
      {rows.map(([tone, label, segments, pct]) => (
        <div key={tone} className="strip__row" role="img" aria-label={`${label}: ${share(pct)}`}>
          <span className="strip__label" aria-hidden="true">{label}</span>
          <SignalBar tone={tone} segments={segments} axis="horizontal">
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
  if (atMs === null) {
    return <section className="strip" aria-label="Calendar" aria-busy="true" />;
  }
  return (
    <section className="strip" aria-label="Calendar">
      <div className="strip__head">
        <MonthArrows parts={parts} atMs={atMs}>
          <h2 className="strip__month">{monthLabel(atMs)}</h2>
        </MonthArrows>
        <StripClock parts={parts} calendar={calendar} />
        <Legend />
      </div>
      <div className="strip__grid">
        <Bars calendar={calendar} atMs={atMs} />
        <TimeSlider parts={parts} calendar={calendar} />
      </div>
    </section>
  );
}
