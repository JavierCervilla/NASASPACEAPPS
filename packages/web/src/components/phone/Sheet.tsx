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
 * The draggable bottom sheet (apple-design: direct manipulation, velocity
 * hand-off, momentum projection, rubber band, interruptible). The physics
 * live in src/sheet/; this binds them to the element and gives the
 * grabber, a button that cycles the detents from the keyboard. Closed, the
 * sheet is inert; the tab bar's edge drags it back open.
 */
import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import type { DetentName } from '../../sheet/sheet-physics';
import { mountSheet, type MountedSheet } from '../../sheet/sheet-mount';
import { Grabber } from './Grabber';

interface Props {
  readonly label: string;
  readonly detent: DetentName;
  readonly onDetent: (detent: DetentName) => void;
  /** Each frame, how far open past half the sheet is (0 to 1). */
  readonly onOpenness: (value: number) => void;
  /** Each frame, the sheet's top edge in px from the viewport's top. */
  readonly onEdge: (top: number) => void;
  /** Where a drag up opens the closed sheet (the tab bar). */
  readonly edge: RefObject<HTMLElement | null>;
  /** The top bar the full sheet stays under. */
  readonly bar: RefObject<HTMLElement | null>;
  /** The foot's row (tab bar and dock) that half and peek stay above. */
  readonly foot: RefObject<HTMLElement | null>;
  readonly children: ReactNode;
}

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
const reducedMotion = (): boolean => matchMedia(REDUCED_MOTION).matches;

/** A press inside the list that scrolls never drags the sheet. */
const canDrag = (event: PointerEvent): boolean =>
  !(event.target as Element | null)?.closest('[data-sheet-scroll]');

/** Mounts the physics on `el` once; the handle, for later moves. */
function useMountedSheet(
  el: RefObject<HTMLElement | null>,
  latest: RefObject<Props>,
  reported: RefObject<DetentName>,
): RefObject<MountedSheet | null> {
  const sheet = useRef<MountedSheet | null>(null);
  useEffect(() => {
    const node = el.current;
    if (!node) return undefined;
    const onDetent = (detent: DetentName): void => {
      reported.current = detent;
      latest.current.onDetent(detent);
    };
    const onOpenness = (v: number): void => latest.current.onOpenness(v);
    const onEdge = (top: number): void => latest.current.onEdge(top);
    const start = reported.current;
    const { edge, bar, foot } = latest.current;
    sheet.current = mountSheet(node, {
      start, reducedMotion, onDetent, onOpenness, onEdge, canDrag,
      edge: edge.current, bar: bar.current, foot: foot.current,
    });
    return sheet.current.dispose;
  }, [el, latest, reported]);
  return sheet;
}

/** The physics follow `props.detent` when the page changes it. */
function useSheetMotion(el: RefObject<HTMLElement | null>, props: Props) {
  const latest = useRef(props);
  const reported = useRef(props.detent);
  useEffect(() => {
    latest.current = props;
  });
  const sheet = useMountedSheet(el, latest, reported);
  useEffect(() => {
    if (props.detent !== reported.current) {
      sheet.current?.motion.moveTo(props.detent);
    }
  }, [props.detent, sheet]);
}

export function Sheet(props: Props) {
  const el = useRef<HTMLElement>(null);
  useSheetMotion(el, props);
  const { label, detent, onDetent, children } = props;
  // Closed, the sheet is off-screen: out of the accessibility tree and
  // out of the tab order, so nothing reads or focuses what is not there.
  return (
    <section
      ref={el}
      className="sheet"
      aria-label={label}
      data-detent={detent}
      inert={detent === 'closed'}
    >
      <Grabber detent={detent} onDetent={onDetent} />
      {children}
    </section>
  );
}
