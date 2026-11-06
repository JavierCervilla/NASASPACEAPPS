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
 * Whether an element is cut by its parent's box (VENT-100): the phone's
 * band over the 3D view clips what it has no room for, and a notice is
 * better hidden than cut. Measured again whenever the parent or any of its
 * children changes size, or a child comes or goes (the caption, the far
 * chip), since any of them moves it; and whenever the stage writes a new
 * band. An element that would sit under one of the stage's `avoid` (the
 * compass, VENT-106) counts as cut too, measured again when that moves or
 * hides.
 */
import { useLayoutEffect, useState, type RefObject } from 'react';

const SLACK_PX = 0.5;

/** Whether two boxes share more than an edge. */
function meet(a: DOMRect, b: DOMRect): boolean {
  return a.left < b.right - SLACK_PX && b.left < a.right - SLACK_PX &&
    a.top < b.bottom - SLACK_PX && b.top < a.bottom - SLACK_PX;
}

/**
 * Whether `el`'s box reaches past `parent`'s top or bottom, or meets one
 * of `avoid` that shows.
 */
function outside(el: Element, parent: Element, avoid: Element[]): boolean {
  const own = el.getBoundingClientRect();
  const room = parent.getBoundingClientRect();
  return own.top < room.top - SLACK_PX ||
    own.bottom > room.bottom + SLACK_PX ||
    avoid.some((other) => getComputedStyle(other).visibility !== 'hidden' &&
      meet(own, other.getBoundingClientRect()));
}

/**
 * Calls `measure` when the stage's band (its style) changes, a child comes
 * or goes, or one of `avoid` moves or hides; returns what stops it.
 */
function watchStage(stage: Element, avoid: string, measure: () => void) {
  const moves = new MutationObserver((records) => {
    const target = (r: MutationRecord): boolean => r.target === stage ||
      (r.target instanceof Element && r.target.matches(avoid));
    if (records.some(target)) measure();
  });
  moves.observe(stage, { childList: true, subtree: true, attributes: true,
    attributeFilter: ['style', 'data-covered'] });
  return () => moves.disconnect();
}

/**
 * Calls `measure` when `parent` or any of its children changes size, or a
 * child comes or goes; returns what stops it.
 */
function watchParent(parent: Element, measure: () => void) {
  const sizes = new ResizeObserver(measure);
  const watch = (): void => {
    sizes.disconnect();
    sizes.observe(parent);
    for (const child of parent.children) sizes.observe(child);
  };
  const children = new MutationObserver(watch);
  children.observe(parent, { childList: true });
  watch();
  return () => {
    sizes.disconnect();
    children.disconnect();
  };
}

export function useCut(
  ref: RefObject<HTMLElement | null>,
  avoid = ':not(*)',
): boolean {
  const [cut, setCut] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    const parent = el?.parentElement;
    const stage = parent?.parentElement;
    if (!el || !parent || !stage) return undefined;
    const measure = (): void => setCut(outside(el, parent,
      [...stage.querySelectorAll(avoid)]));
    const stops = [watchStage(stage, avoid, measure),
      watchParent(parent, measure)];
    return () => {
      for (const stop of stops) stop();
    };
  }, [ref, avoid]);
  return cut;
}
