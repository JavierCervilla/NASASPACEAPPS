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
 * The frame every state of the benchmark panel shares (VENT-81): the
 * heading and its meta, a body that scrolls inside the panel with the
 * app's edge fade (use-scroll-fade.ts) so the panel fits the viewport at
 * any text size, and the actions, always in reach under it. A state the
 * person acts on takes the focus to its first action when it shows.
 */
import { useEffect, useRef, type ReactNode } from 'react';
import { useScrollFade } from '../use-scroll-fade';

interface Props {
  readonly title: string;
  readonly meta?: ReactNode;
  readonly actions: ReactNode;
  /** Move the focus to the first action when shown. */
  readonly focus: boolean;
  readonly children: ReactNode;
}

export function BenchFrame({ title, meta, actions, focus, children }: Props) {
  const fade = useScrollFade<HTMLDivElement>();
  const row = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (focus) row.current?.querySelector('button')?.focus();
  }, [focus]);
  return (
    <>
      <div className="bench__head">
        <h2 className="bench__title">{title}</h2>
        {meta}
      </div>
      <div className="bench__body scroll-fade" {...fade}>{children}</div>
      <div className="bench__actions" ref={row}>{actions}</div>
    </>
  );
}
