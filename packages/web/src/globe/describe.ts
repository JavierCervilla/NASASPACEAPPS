/**
 * The globe's text alternative: what the picture shows, in words. Pure, so
 * it is the same on the server and in the browser for the same input.
 */
import { subSolarPoint } from '@ventana/sim';

function angle(deg: number, positive: string, negative: string): string {
  return `${Math.abs(deg).toFixed(1)}° ${deg < 0 ? negative : positive}`;
}

/** When the Sun is lit and where it stands overhead, in one sentence. */
export function describeSun(atMs: number): string {
  const sun = subSolarPoint(atMs);
  const when = new Date(atMs).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
  const lat = angle(sun.latDeg, 'N', 'S');
  const lon = angle(sun.lonEastDeg, 'E', 'W');
  return `Lit by the Sun as of ${when} UTC, overhead at ${lat}, ${lon}.`;
}
