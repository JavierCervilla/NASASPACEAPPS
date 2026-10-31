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
 * One line of text that shows the longest of its `lines` that fits its
 * width, so a narrow pill shortens its words instead of cutting them
 * with an ellipsis (QA, PR #16). It asks for the longest line's width, so
 * a pill with room shows it whole; every line is measured off-screen in
 * a zero-size box, and a ResizeObserver re-picks on any resize, a font
 * size change included.
 */
import { useLayoutEffect, useRef, useState } from 'react';

interface Props {
  readonly lines: readonly string[];
  readonly className: string;
  /** The signal state it speaks of, for its colour. */
  readonly tone: string;
}

/** The first of `box`'s measured lines no wider than `box`; else the last. */
function pickLine(box: HTMLElement): number {
  const tries = [...box.querySelectorAll<HTMLElement>('.fit-line__try')];
  const fits = tries.findIndex((el) => el.offsetWidth <= box.clientWidth);
  return fits === -1 ? tries.length - 1 : fits;
}

/** Which of the lines `box` shows, re-picked whenever it resizes. */
function usePickedLine(lines: readonly string[]) {
  const box = useRef<HTMLSpanElement>(null);
  const [picked, setPicked] = useState(0);
  const key = lines.join('\n');
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const observer = new ResizeObserver(() => setPicked(pickLine(el)));
    observer.observe(el);
    return () => observer.disconnect();
  }, [key]);
  return { box, line: lines[Math.min(picked, lines.length - 1)] ?? '' };
}

export function FitLine({ lines, className, tone }: Props) {
  const { box, line } = usePickedLine(lines);
  return (
    <span ref={box} className={`fit-line ${className}`} data-tone={tone}>
      <span className="fit-line__size" aria-hidden="true">{lines[0]}</span>
      <span className="fit-line__measure" aria-hidden="true">
        {lines.map((text) => (
          <span key={text} className="fit-line__try">{text}</span>
        ))}
      </span>
      <span className="fit-line__shown">{line}</span>
    </span>
  );
}
