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
import { useEffect, useRef, useState, type RefObject } from 'react';
import { createPush, type PushMotion } from '../../lib/push-motion';

/**
 * Springs `el` to the page while `pushed`; whether it rests on the list,
 * so the page can leave the tree only once it is out of sight.
 */
export function usePush(
  el: RefObject<HTMLElement | null>,
  pushed: boolean,
): boolean {
  const [home, setHome] = useState(true);
  const motion = useRef<PushMotion | null>(null);
  useEffect(() => {
    const node = el.current;
    if (!node) return undefined;
    const push = createPush({
      frame: (callback) => requestAnimationFrame(callback),
      cancel: (id) => cancelAnimationFrame(id),
      onValue: (value) => {
        node.style.setProperty('--push', String(value));
        setHome(value === 0);
      },
    });
    motion.current = push;
    return push.dispose;
  }, [el]);
  useEffect(() => motion.current?.to(pushed ? 1 : 0), [pushed]);
  return home;
}
