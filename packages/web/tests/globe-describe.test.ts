import { describe, expect, it } from 'vitest';
import { describeSun } from '../src/globe/describe';

describe('describeSun', () => {
  it('says when and where the Sun stands overhead', () => {
    // The model gives 74.96° W, 1.46° S here; Horizons says 74.87° W (sun.test.ts fixture).
    expect(describeSun(Date.UTC(2026, 10, 1))).toBe(
      'Lit by the Sun as of 1 Nov 2026, 00:00 UTC, overhead at 1.5° S, 75.0° W.',
    );
  });
});
