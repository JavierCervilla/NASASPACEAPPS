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
 * The phone's calendar, filling the sheet at full (validated canvas
 * «Phone · calendar»): the month with its arrows and the site, the
 * month's three shares, the Sun, Earth and window columns running down
 * the month with a draggable instant line, then Play, the date and «Now».
 * Dragging anywhere in the columns moves the instant: the height is the
 * hour of the month.
 */
import type { KeyboardEvent } from 'react';
import { hourKeyDelta } from '../../calendar/hour-input';
import {
  formatChip,
  formatInstant,
  monthLabel,
} from '../../calendar/instant-format';
import { dayTicks, monthHours } from '../../calendar/month';
import { instantPct, type MonthStrip } from '../../calendar/month-strip';
import { hourOfMonth, moveToHour } from '../../calendar/time-actions';
import { NOW_TITLES } from '../../phone/now-widget';
import { siteLabels, type PhoneSite } from '../../phone/phone-site';
import type { NowState } from '../../phone/widget-types';
import type { HoursResult } from '../../phone/widgets-loader';
import { hourDrag } from './hour-drag';
import { useCalendar, type CalendarParts } from './hooks';
import {
  MonthArrows,
  NoWindowNote,
  NowButton,
  PlayButton,
  SignalBar,
} from './parts';
import { StripStatus } from './StripStatus';

interface Props {
  readonly parts: CalendarParts;
  readonly site: PhoneSite;
  /** The site's state at the instant, once its data has loaded. */
  readonly state: NowState | null;
}

/**
 * «Sun 59 %», «Earth 58 %» and «Window 47 %» of the month, and a note
 * when the month has no window at all.
 */
function Shares({ strip }: { readonly strip: MonthStrip | null }) {
  const shares = [
    ['sun', 'Sun', strip?.sunPct],
    ['earth', 'Earth', strip?.earthPct],
    ['window', 'Window', strip?.windowPct],
  ] as const;
  return (
    <>
      <ul className="calendar__shares" aria-label="Share of the month">
        {shares.map(([tone, label, pct]) => (
          <li key={tone} data-tone={tone}>
            {label} <b>{pct === undefined ? '–' : `${Math.round(pct)} %`}</b>
          </li>
        ))}
      </ul>
      <NoWindowNote strip={strip} className="calendar__note" />
    </>
  );
}

interface ColumnsProps {
  readonly parts: CalendarParts;
  readonly strip: MonthStrip;
  readonly atMs: number;
}

/** The slider's role, range and value, and its keys. */
function sliderProps({ parts, atMs }: Omit<ColumnsProps, 'strip'>) {
  const hour = hourOfMonth(atMs);
  const hours = monthHours(atMs);
  const move = (to: number): void => moveToHour(parts.time, atMs, to);
  const ends: Record<string, number> = { Home: 0, End: hours - 1 };
  const onKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
    const delta = hourKeyDelta(event.key, 'vertical');
    const end = ends[event.key];
    if (delta === null && end === undefined) return;
    event.preventDefault();
    move(end ?? hour + (delta ?? 0));
  };
  return {
    role: 'slider', tabIndex: 0, 'aria-label': 'Selected hour',
    'aria-orientation': 'vertical', 'aria-valuemin': 0,
    'aria-valuemax': hours - 1, 'aria-valuenow': hour,
    'aria-valuetext': formatInstant(atMs), onKeyDown, ...hourDrag(move, hours),
  } as const;
}

/** The columns: a vertical slider over the month's hours. */
function Columns({ parts, strip, atMs }: ColumnsProps) {
  const top = `${instantPct(atMs)}%`;
  return (
    <div className="columns" data-sheet-scroll {...sliderProps({ parts, atMs })}>
      <div className="columns__days" aria-hidden="true">
        {dayTicks(atMs).map(({ day, pct }) => (
          <span key={day} style={{ top: `${pct}%` }}>{day}</span>
        ))}
      </div>
      <SignalBar tone="sun" segments={strip.sun} axis="vertical" />
      <SignalBar tone="earth" segments={strip.earth} axis="vertical" />
      <SignalBar tone="window" segments={strip.window} axis="vertical" />
      <span className="columns__line" style={{ top }} aria-hidden="true">
        <span className="columns__chip">{formatChip(atMs)}</span>
      </span>
    </div>
  );
}

interface ControlsProps extends Props {
  /** The month's hours: no state while they load means no data. */
  readonly result: HoursResult;
  readonly atMs: number;
  readonly live: boolean;
  readonly playing: boolean;
}

const HINT = 'drag the strip to move in time';

/** Play, the date with the state at that hour, and «Now». */
function Controls(props: ControlsProps) {
  const { parts, state, atMs, live, playing } = props;
  // No state: the hour's data is on its way, or there is none.
  const idle = props.result.kind === 'loading'
    ? 'Drag the strip to move in time'
    : 'No data for this hour';
  const line = state ? NOW_TITLES[state] : idle;
  // The hint goes first when large text leaves no room (calendar.css).
  const hint = state ? <span className="calendar__hint"> · {HINT}</span> : null;
  return (
    <div className="calendar__controls">
      <PlayButton parts={parts} playing={playing} />
      <div className="calendar__when">
        <span className="calendar__date">{formatInstant(atMs)}</span>
        <span className="calendar__state" data-tone={state ?? undefined}>
          {line}
          {hint}
        </span>
      </div>
      <NowButton parts={parts} live={live} />
    </div>
  );
}

export function CalendarSheet(props: Props) {
  const { parts, site } = props;
  const calendar = useCalendar(parts, site.id);
  const { state: time, strip, playing, result } = calendar;
  if (!time) return null;
  const { pill, pillDetail } = siteLabels(site);
  return (
    <div className="calendar">
      <MonthArrows parts={parts} atMs={time.atMs}>
        <div className="calendar__title">
          <h2>{monthLabel(time.atMs)}</h2>
          <p>{pillDetail ? `${pill} · ${pillDetail}` : pill}</p>
        </div>
      </MonthArrows>
      <Shares strip={strip} />
      {strip ? (
        <Columns parts={parts} strip={strip} atMs={time.atMs} />
      ) : (
        <StripStatus calendar={calendar} />
      )}
      <Controls {...props} {...time} playing={playing} result={result} />
    </div>
  );
}
