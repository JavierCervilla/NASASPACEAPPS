import { describe, expect, it } from 'vitest';
import { HACKATHON_START_UTC, daysUntil } from '../src/lib/countdown';

const DAY = 86_400_000;

describe('daysUntil', () => {
  it('counts a partial day as a whole one', () => {
    expect(daysUntil(HACKATHON_START_UTC - DAY - 1)).toBe(2);
  });

  it('is exactly one on the last day', () => {
    expect(daysUntil(HACKATHON_START_UTC - 1)).toBe(1);
  });

  it('never goes negative once the hackathon has started', () => {
    expect(daysUntil(HACKATHON_START_UTC)).toBe(0);
    expect(daysUntil(HACKATHON_START_UTC + 10 * DAY)).toBe(0);
  });
});
