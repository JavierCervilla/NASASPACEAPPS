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

/**
 * The few DOM calls the performance readout makes, in memory: the web package has no DOM test environment
 * (happy-dom, jsdom), and the readout only creates elements, sets attributes and text, and listens for clicks.
 */
import { vi } from 'vitest';

export class FakeElement {
  readonly tagName: string;
  readonly children: FakeElement[] = [];
  readonly dataset: Record<string, string> = {};
  readonly attributes = new Map<string, string>();
  private readonly listeners = new Map<string, (() => void)[]>();
  className = '';
  id = '';
  type = '';
  hidden = false;
  textContent: string | null = '';

  constructor(tagName: string) {
    this.tagName = tagName.toUpperCase();
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  addEventListener(type: string, listener: () => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  append(...children: FakeElement[]): void {
    this.children.push(...children);
  }

  click(): void {
    for (const listener of this.listeners.get('click') ?? []) listener();
  }

  /** This element and every element under it, depth first. */
  all(): FakeElement[] {
    return [this, ...this.children.flatMap((child) => child.all())];
  }

  /** The element under this one whose id is `id`, if any. */
  byId(id: string): FakeElement | undefined {
    return this.all().find((element) => element.id === id);
  }
}

/** Installs a fake `document` and `window`; returns the body the readout appends its panel to. */
export function installFakeDom(): FakeElement {
  const body = new FakeElement('body');
  // The head takes the readout's stylesheet link (perf-hud.ts links its CSS on mount, VENT-49).
  const head = new FakeElement('head');
  vi.stubGlobal('document', { head, body, createElement: (tag: string) => new FakeElement(tag) });
  vi.stubGlobal('window', { addEventListener: () => undefined });
  return body;
}
