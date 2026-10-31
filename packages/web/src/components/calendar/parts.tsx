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
 * Pieces both calendar views share (validated canvases «Globe view» and
 * «Phone · calendar»): a signal bar, the month with its arrows, Play,
 * «Now» and the note for a month without a window. Touch targets are
 * 44 px.
 */
import type { ReactNode } from 'react';
import type { MonthStrip, Segment } from '../../calendar/month-strip';
import { canShiftMonth, moveMonths } from '../../calendar/time-actions';
import { useI18n } from '../i18n-context';
import type { CalendarParts } from './hooks';

/** Which signal a bar shows; its colour is that signal's, and only it. */
export type BarTone = 'sun' | 'earth' | 'window';

interface BarProps {
  readonly tone: BarTone;
  readonly segments: readonly Segment[];
  /** Left to right (desktop strip) or top to bottom (phone columns). */
  readonly axis: 'horizontal' | 'vertical';
  readonly children?: ReactNode;
}

/** The month as a bar: grey («neither»), coloured where the signal holds. */
export function SignalBar({ tone, segments, axis, children }: BarProps) {
  const across = axis === 'horizontal';
  const place = (s: Segment) =>
    across
      ? { left: `${s.startPct}%`, width: `${s.widthPct}%` }
      : { top: `${s.startPct}%`, height: `${s.widthPct}%` };
  return (
    <div className="signal-bar" data-tone={tone} data-axis={axis}>
      {segments.map((s) => (
        <span key={s.startPct} className="signal-bar__on" style={place(s)} />
      ))}
      {children}
    </div>
  );
}

interface MonthProps {
  readonly parts: CalendarParts;
  readonly atMs: number;
  /** The month's name, and whatever goes with it between the arrows. */
  readonly children: ReactNode;
}

/** ‹ the month › : the arrows move the instant a month, inside the data. */
export function MonthArrows({ parts, atMs, children }: MonthProps) {
  const { t } = useI18n();
  const arrow = (delta: number, label: string, path: string) => (
    <button
      type="button"
      className="round-button"
      aria-label={label}
      disabled={!canShiftMonth(atMs, delta)}
      onClick={() => moveMonths(parts.time, atMs, delta)}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
        <path d={path} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
  return (
    <div className="month-arrows">
      {arrow(-1, t('calendar.prev'), 'M8 2L4 6l4 4')}
      {children}
      {arrow(1, t('calendar.next'), 'M4 2l4 4-4 4')}
    </div>
  );
}

/** Play, or Pause while time plays. */
export function PlayButton(props: { parts: CalendarParts; playing: boolean }) {
  const { parts, playing } = props;
  const { player } = parts;
  const { t } = useI18n();
  return (
    <button
      type="button"
      className="play-button"
      aria-label={t(playing ? 'calendar.pause' : 'calendar.play')}
      onClick={playing ? player.pause : player.play}
    >
      <svg width="14" height="16" viewBox="0 0 14 16" aria-hidden="true">
        <path d={playing ? 'M2 1.5h3.5v13H2zM8.5 1.5H12v13H8.5z' : 'M2 1.5v13l11-6.5z'} fill="currentColor" />
      </svg>
    </button>
  );
}

/** «Now»: back to the live instant; off while live already. */
export function NowButton(props: { parts: CalendarParts; live: boolean }) {
  const { t } = useI18n();
  return (
    <button type="button" className="now-button" disabled={props.live} onClick={props.parts.time.now}>
      {t('calendar.now')}
    </button>
  );
}

/** «No landing window this month», for a loaded month with none. */
export function NoWindowNote(props: {
  strip: MonthStrip | null;
  className: string;
}) {
  const { t } = useI18n();
  if (!props.strip || props.strip.window.length > 0) return null;
  return <p className={props.className}>{t('calendar.noWindow')}</p>;
}
