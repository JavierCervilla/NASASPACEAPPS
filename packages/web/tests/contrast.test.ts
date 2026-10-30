import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const TOKENS = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');
const PHONE = readFileSync(new URL('../src/styles/phone.css', import.meta.url), 'utf8');

/** The custom properties set in the first block that follows `marker` in `css`. */
function block(css: string, marker: string): Record<string, string> {
  const start = css.indexOf(marker);
  if (start === -1) throw new Error(`no block ${marker}`);
  const body = css.slice(start, css.indexOf('}', css.indexOf(':root', start)));
  return Object.fromEntries([...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2]?.trim()]));
}

/** WCAG 2 relative luminance of a `#rrggbb` colour. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

describe('light-mode label contrast on the phone cards', () => {
  const light = block(TOKENS, '@media (prefers-color-scheme: light) {');
  const card = block(PHONE, '@media (prefers-color-scheme: light) {')['--phone-card'] ?? '';

  it('reads the card as white', () => {
    expect(card).toBe('#ffffff');
  });

  // 12 px labels are small text: WCAG AA asks 4.5:1.
  it.each(['--signal-window-ink', '--signal-sun-ink', '--signal-earth-ink', '--text-muted'])('%s reaches 4.5:1 on the card', (token) => {
    const colour = light[token] ?? '';
    expect(colour).toMatch(/^#[0-9a-f]{6}$/i);
    expect(contrast(colour, card)).toBeGreaterThanOrEqual(4.5);
  });
});
