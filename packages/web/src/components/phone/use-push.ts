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
 * The push spring (lib/push-motion.ts) bound to an element: each frame
 * writes how far the page is pushed in to its `--push`, which the
 * styles turn into the slide (or, under reduced motion, a cross-fade).
 */
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from 'react';
import { createPush, type PushMotion } from '../../lib/push-motion';

/** Where the push rests: on the list, on the page, or between them. */
export type PushAt = 'root' | 'page' | 'moving';

const restOf = (value: number): PushAt => {
  if (value === 0) return 'root';
  return value === 1 ? 'page' : 'moving';
};

/**
 * Springs `el` to the page while `pushed`; where it rests, so the page
 * leaves the tree, and the list hides, only once out of sight.
 */
export function usePush(
  el: RefObject<HTMLElement | null>,
  pushed: boolean,
): PushAt {
  const [at, setAt] = useState<PushAt>('root');
  const motion = useRef<PushMotion | null>(null);
  useEffect(() => {
    const node = el.current;
    if (!node) return undefined;
    const push = createPush({
      frame: (callback) => requestAnimationFrame(callback),
      cancel: (id) => cancelAnimationFrame(id),
      onValue: (value) => {
        node.style.setProperty('--push', String(value));
        setAt(restOf(value));
      },
    });
    motion.current = push;
    return push.dispose;
  }, [el]);
  useEffect(() => motion.current?.to(pushed ? 1 : 0), [pushed]);
  return at;
}

/**
 * Gives the focus back to `el` (the control that pushed the page) once
 * the page is popped and the list under it is no longer inert.
 */
export function useFocusOnReturn(
  el: RefObject<HTMLElement | null>,
  pushed: boolean,
): void {
  const was = useRef(pushed);
  useEffect(() => {
    if (was.current && !pushed) el.current?.focus();
    was.current = pushed;
  }, [el, pushed]);
}

/** A key handler for a pushed page: Escape goes `back` one page. */
export function escapeTo(back: () => void) {
  return (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    back();
  };
}
