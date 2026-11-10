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

// The rules of a stylesheet, flattened: each style rule with its selectors, its own declarations and the at-rules
// (`@media …`, `@starting-style`…) it sits in. Enough of CSS for the tests that read the stylesheets.
import { readdirSync, readFileSync } from 'node:fs';

export interface CssRule {
  /** Each selector of the rule's list, trimmed (a nested rule's `&` is its parent's selector). */
  readonly selectors: readonly string[];
  /** The whole selector list, joined with `, `. */
  readonly selector: string;
  /** The rule's own declarations, nested blocks left out. */
  readonly body: string;
  /** The preludes of the at-rules around it, outermost first. */
  readonly at: readonly string[];
}

export const STYLES = new URL('../src/styles/', import.meta.url);

/** The index after the `}` that closes the block opened at `open`. */
function closing(text: string, open: number): number {
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    if (text[i] === '{') depth += 1;
    else if (text[i] === '}' && --depth === 0) return i + 1;
  }
  return text.length;
}

/** Splits a selector list on its top-level commas (not those inside `:is(…)`). */
function splitList(list: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < list.length; i += 1) {
    if (list[i] === '(') depth += 1;
    else if (list[i] === ')') depth -= 1;
    else if (list[i] === ',' && depth === 0) {
      out.push(list.slice(start, i).trim());
      start = i + 1;
    }
  }
  out.push(list.slice(start).trim());
  return out.filter(Boolean);
}

const ruleOf = (selectors: readonly string[], body: string, at: readonly string[]): CssRule => ({
  selectors,
  selector: selectors.join(', '),
  body,
  at,
});

function walk(text: string, at: readonly string[], parents: readonly string[], out: CssRule[]): string {
  let own = '';
  let i = 0;
  while (i < text.length) {
    const open = text.indexOf('{', i);
    if (open < 0) {
      own += text.slice(i);
      break;
    }
    const before = text.slice(i, open);
    const cut = Math.max(before.lastIndexOf(';'), before.lastIndexOf('}'));
    own += before.slice(0, cut + 1);
    const prelude = before.slice(cut + 1).trim();
    const end = closing(text, open);
    const inner = text.slice(open + 1, end - 1);
    if (prelude.startsWith('@')) {
      const body = walk(inner, [...at, prelude], parents, out);
      if (parents.length > 0 && body.trim()) out.push(ruleOf(parents, body, [...at, prelude]));
    } else {
      const selectors = splitList(prelude).flatMap((s) =>
        parents.length === 0 ? [s] : parents.map((p) => (s.includes('&') ? s.replaceAll('&', p) : `${p} ${s}`)),
      );
      const body = walk(inner, at, selectors, out);
      out.push(ruleOf(selectors, body, at));
    }
    i = end;
  }
  return own;
}

/** Every style rule of `css`. */
export function rulesOf(css: string): CssRule[] {
  const out: CssRule[] = [];
  walk(css.replace(/\/\*[\s\S]*?\*\//g, ''), [], [], out);
  return out;
}

/** The text of the stylesheet `name` in src/styles/. */
export const sheet = (name: string): string => readFileSync(new URL(name, STYLES), 'utf8');

/** Every stylesheet of src/styles/ by name. */
export function allSheets(): Map<string, string> {
  const names = readdirSync(STYLES).filter((name) => name.endsWith('.css'));
  return new Map(names.map((name) => [name, sheet(name)]));
}

/** Every rule of every stylesheet, with its file. */
export function allRules(): (CssRule & { readonly file: string })[] {
  return [...allSheets()].flatMap(([file, css]) => rulesOf(css).map((rule) => ({ ...rule, file })));
}

/** The value of `property` in a rule's body, its last declaration. */
export function declared(body: string, property: string): string | undefined {
  const all = [...body.matchAll(new RegExp(`(?:^|[;{\\s])${property}:\\s*([^;]+);?`, 'g'))];
  return all.at(-1)?.[1]?.trim();
}

/** The media features of an `@media` prelude, as `name: value` strings. */
const featuresOf = (prelude: string): string[] => [...prelude.matchAll(/\(([^()]+)\)/g)].map((m) => m[1]?.trim() ?? '');

/**
 * The value of the custom property `name` on `:root` when the media features `active` hold (`prefers-contrast:
 * more`, `prefers-reduced-transparency: reduce`…), read from `files` in the order the page loads them: the last applicable
 * declaration wins, as in the cascade.
 */
export function rootToken(name: string, active: readonly string[], files = ['tokens.css', 'phone.css']): string {
  let value: string | undefined;
  for (const file of files) {
    for (const rule of rulesOf(sheet(file))) {
      const applies = rule.selector === ':root' && rule.at.every((m) => featuresOf(m).every((f) => active.includes(f)));
      value = (applies && declared(rule.body, name)) || value;
    }
  }
  if (!value) throw new Error(`no ${name} for ${active.join(', ') || 'the default'}`);
  return value;
}
