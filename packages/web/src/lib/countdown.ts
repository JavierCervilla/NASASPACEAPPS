/**
 * Opening day of NASA Space Apps Challenge 2026 in Madrid (00:00 Europe/Madrid,
 * CET = UTC+1).
 */
export const HACKATHON_START_UTC = Date.UTC(2026, 10, 13, 23, 0, 0);

const MS_PER_DAY = 86_400_000;

/**
 * Whole days left until `target`, rounded up so the last partial day still
 * counts as one. Returns 0 once the target has passed.
 */
export function daysUntil(
  nowMs: number,
  targetMs: number = HACKATHON_START_UTC,
): number {
  const remaining = targetMs - nowMs;
  return remaining <= 0 ? 0 : Math.ceil(remaining / MS_PER_DAY);
}
