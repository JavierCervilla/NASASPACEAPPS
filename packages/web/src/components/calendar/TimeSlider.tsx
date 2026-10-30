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
 * The desktop strip's controls (validated canvas «Globe view»): Play and
 * a slider over the month's hours, under the bars, and the date with
 * «Now» in the strip's head. The slider is a native range, so the arrows
 * move an hour and Home and End reach the month's ends; Page Up and Page
 * Down move a day, which browsers do not agree on.
 */
import type { KeyboardEvent } from 'react';
import { hourKeyDelta } from '../../calendar/hour-input';
import { formatInstant } from '../../calendar/instant-format';
import { monthHours } from '../../calendar/month';
import { hourOfMonth, moveToHour } from '../../calendar/time-actions';
import type { TimeStore } from '../../calendar/time-store';
import type { Calendar, CalendarParts } from './hooks';
import { NowButton, PlayButton } from './parts';

interface Props {
  readonly parts: CalendarParts;
  readonly calendar: Calendar;
}

/** Page Up and Page Down: a day later or earlier, inside the month. */
function dayKeys(time: TimeStore, atMs: number) {
  return (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key !== 'PageUp' && event.key !== 'PageDown') return;
    event.preventDefault();
    const delta = hourKeyDelta(event.key, 'horizontal') ?? 0;
    moveToHour(time, atMs, hourOfMonth(atMs) + delta);
  };
}

/** The selected date and «Now», in the strip's head. */
export function StripClock({ parts, calendar }: Props) {
  const { state } = calendar;
  if (!state) return null;
  return (
    <div className="strip__clock">
      <span className="strip__date">{formatInstant(state.atMs)}</span>
      <NowButton parts={parts} live={state.live} />
    </div>
  );
}

/** Play in the labels' column, the slider in the bars' column. */
export function TimeSlider({ parts, calendar }: Props) {
  const { state, playing } = calendar;
  if (!state) return null;
  const { atMs } = state;
  return (
    <>
      <PlayButton parts={parts} playing={playing} />
      <input
        type="range"
        className="strip__slider"
        aria-label="Selected hour"
        aria-valuetext={formatInstant(atMs)}
        min={0}
        max={monthHours(atMs) - 1}
        step={1}
        value={hourOfMonth(atMs)}
        onChange={(e) => moveToHour(parts.time, atMs, Number(e.target.value))}
        onKeyDown={dayKeys(parts.time, atMs)}
      />
    </>
  );
}
