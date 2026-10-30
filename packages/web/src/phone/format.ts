/** Text formats of the phone widgets. Pure. */

const HOURS_PER_DAY = 24;

/** «7 d 1 h», «3 d» or «5 h», for a whole number of hours. */
export function formatDuration(hours: number): string {
  const whole = Math.max(0, Math.round(hours));
  const days = Math.floor(whole / HOURS_PER_DAY);
  const rest = whole % HOURS_PER_DAY;
  if (days === 0) return `${rest} h`;
  return rest === 0 ? `${days} d` : `${days} d ${rest} h`;
}

/**
 * At least this long, when the range ends first: «at least 7 d». Under a
 * day it keeps the hours: «at least 5 h».
 */
export function formatAtLeast(hours: number): string {
  const days = Math.floor(hours / HOURS_PER_DAY);
  const span = days === 0 ? `${Math.max(0, hours)} h` : `${days} d`;
  return `at least ${span}`;
}

/** «Sun 6.4° up» or «Earth 2.0° below». */
export function formatElevation(body: string, elevationDeg: number): string {
  const side = elevationDeg < 0 ? 'below' : 'up';
  return `${body} ${Math.abs(elevationDeg).toFixed(1)}° ${side}`;
}

/** «84.79° S, 29.20° E» (east longitudes above 180 read as west). */
export function formatCoords(lat: number, lonEast: number): string {
  const lon = lonEast > 180 ? lonEast - 360 : lonEast;
  const ns = lat < 0 ? 'S' : 'N';
  const ew = lon < 0 ? 'W' : 'E';
  const a = Math.abs(lat).toFixed(2);
  return `${a}° ${ns}, ${Math.abs(lon).toFixed(2)}° ${ew}`;
}

/** «47 % of November». */
export function formatShare(percent: number, month: string): string {
  return `${Math.round(percent)} % of ${month}`;
}
