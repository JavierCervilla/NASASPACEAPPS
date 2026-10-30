/**
 * The «Listening on Earth» widget: the DSN complex that tracks the Moon
 * this hour and how long it keeps it, or when the next one picks it up.
 */
import {
  hoursBetween,
  hoursUntilLost,
  toMs,
  type DsnComplex,
  type HourSample,
} from '@ventana/sim';
import { formatAtLeast, formatDuration } from './format';
import type { DsnWidget } from './widget-types';

/** The antenna site's name and where it is, as the canvas shows them. */
const COMPLEXES: Readonly<Record<DsnComplex, [string, string]>> = {
  goldstone: ['Goldstone', 'California'],
  canberra: ['Canberra', 'Australia'],
  madrid: ['Robledo', 'Madrid'],
};

function listening(
  hours: readonly HourSample[],
  now: HourSample,
  dsn: DsnComplex,
): DsnWidget {
  const [name, place] = COMPLEXES[dsn];
  const left = hoursUntilLost(hours, now.t, (s) => s.dsn === dsn);
  const last = hours.at(-1)?.t ?? now.t;
  const time =
    left === null
      ? formatAtLeast(hoursBetween(now.t, last) + 1)
      : `~${formatDuration(left)}`;
  return { value: name, detail: `${place} · ${time} left` };
}

function waiting(hours: readonly HourSample[], now: HourSample): DsnWidget {
  const nowMs = toMs(now.t);
  const next = hours.find((s) => s.dsn !== null && toMs(s.t) > nowMs);
  if (!next?.dsn) return { value: 'No antenna', detail: 'None this month' };
  const [name] = COMPLEXES[next.dsn];
  const wait = formatDuration(hoursBetween(now.t, next.t));
  return { value: 'No antenna', detail: `${name} in ~${wait}` };
}

/** The widget for the hour `now`, a sample of `hours`. */
export function dsnWidget(
  hours: readonly HourSample[],
  now: HourSample,
): DsnWidget {
  return now.dsn ? listening(hours, now, now.dsn) : waiting(hours, now);
}
