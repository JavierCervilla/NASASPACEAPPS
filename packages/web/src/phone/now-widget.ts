/** The «Right now» widget: which of the four states holds this hour. */
import { hasEarth, hasSun, type HourSample } from '@ventana/sim';
import { formatShare } from './format';
import type { NowState, NowWidget } from './widget-types';

const TITLES: Readonly<Record<NowState, string>> = {
  window: 'Landing window',
  sun: 'Sun only',
  earth: 'Earth only',
  none: 'No window',
};

/** The state of one hour: Sun and Earth, one of them, or neither. */
export function nowState(
  sample: Pick<HourSample, 'sunEl' | 'earthEl'>,
): NowState {
  const sun = hasSun(sample);
  const earth = hasEarth(sample);
  if (sun && earth) return 'window';
  if (sun) return 'sun';
  return earth ? 'earth' : 'none';
}

/** The widget for `sample`, with the month's window share. */
export function nowWidget(
  sample: Pick<HourSample, 'sunEl' | 'earthEl'>,
  windowPct: number,
  month: string,
): NowWidget {
  const state = nowState(sample);
  return { state, title: TITLES[state], detail: formatShare(windowPct, month) };
}
