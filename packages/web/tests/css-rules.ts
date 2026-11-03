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

/** A small reader of the shipped stylesheets for the style tests: rules with their media queries. */
import { readdirSync, readFileSync } from 'node:fs';

export interface CssRule {
  /** The at-rule preludes around the rule, outermost first (`@media (prefers-contrast: more)`). */
  readonly media: readonly string[];
  readonly selector: string;
  readonly body: string;
}

const STYLES = new URL('../src/styles/', import.meta.url);

/** The text of `src/styles/<file>`. */
export const styleSheet = (file: string): string => readFileSync(new URL(file, STYLES), 'utf8');

/** Every stylesheet of `src/styles/` by file name. */
export function allStyleSheets(): Record<string, string> {
  const files = readdirSync(STYLES).filter((file) => file.endsWith('.css'));
  return Object.fromEntries(files.map((file) => [file, styleSheet(file)]));
}

/** The index of the brace that closes the block opened just before `from`. */
function closing(css: string, from: number): number {
  let depth = 1;
  for (let i = from; i < css.length; i += 1) {
    if (css[i] === '{') depth += 1;
    if (css[i] === '}') depth -= 1;
    if (depth === 0) return i;
  }
  return css.length;
}

/** The style rules of `css`, comments dropped, nested in at-rules or not. */
export function rulesOf(css: string, media: readonly string[] = []): CssRule[] {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules: CssRule[] = [];
  let start = 0;
  for (let open = text.indexOf('{'); open !== -1; open = text.indexOf('{', start)) {
    const prelude = text.slice(start, open).replace(/^[\s\S]*;/, '').trim();
    const end = closing(text, open + 1);
    const inner = text.slice(open + 1, end);
    if (prelude.startsWith('@')) rules.push(...rulesOf(inner, [...media, prelude]));
    else rules.push({ media, selector: prelude, body: inner });
    start = end + 1;
  }
  return rules;
}

/** The value of `property` in a rule's body, its last declaration. */
export function declared(body: string, property: string): string | undefined {
  const all = [...body.matchAll(new RegExp(`(?:^|[;{\\s])${property}:\\s*([^;]+);?`, 'g'))];
  return all.at(-1)?.[1]?.trim();
}

/** The media features of an `@media` prelude, as `name: value` strings. */
const featuresOf = (prelude: string): string[] => [...prelude.matchAll(/\(([^()]+)\)/g)].map((m) => m[1]?.trim() ?? '');

/**
 * The value of the custom property `name` on `:root` when the media features `active` hold (`prefers-color-scheme:
 * light`, `prefers-contrast: more`…), read from `files` in the order the page loads them: the last applicable
 * declaration wins, as in the cascade.
 */
export function rootToken(name: string, active: readonly string[], files = ['tokens.css', 'phone.css']): string {
  let value: string | undefined;
  for (const file of files) {
    for (const rule of rulesOf(styleSheet(file))) {
      const applies = rule.selector === ':root' && rule.media.every((m) => featuresOf(m).every((f) => active.includes(f)));
      value = (applies && declared(rule.body, name)) || value;
    }
  }
  if (!value) throw new Error(`no ${name} for ${active.join(', ') || 'the default'}`);
  return value;
}
