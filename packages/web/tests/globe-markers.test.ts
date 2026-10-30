import { describe, expect, it } from 'vitest';
import { markerKind, markerLabel } from '../src/globe/markers';

const site = (approximate: boolean) => ({ id: 'x', name: 'Mons Mouton (IM-2 Athena)', lat: -84.79, lonEast: 29.2, approximate });

describe('markerKind', () => {
  it('draws a published point as an exact touchdown', () => {
    expect(markerKind(site(false))).toBe('exact');
  });

  it('draws a stand-in coordinate as an approximate zone', () => {
    expect(markerKind(site(true))).toBe('zone');
  });
});

describe('markerLabel', () => {
  it('names the site and says whether its point is exact', () => {
    expect(markerLabel(site(false))).toBe('Mons Mouton (IM-2 Athena), landing site');
    expect(markerLabel(site(true))).toBe('Mons Mouton (IM-2 Athena), approximate zone');
  });
});
