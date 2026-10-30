/**
 * The draggable bottom sheet (apple-design: direct manipulation, velocity
 * hand-off, momentum projection, rubber band, interruptible). The physics
 * live in src/sheet/; this binds them to the element and gives the
 * grabber, a button that cycles the detents from the keyboard.
 */
import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import type { DetentName } from '../../sheet/sheet-physics';
import { mountSheet, type MountedSheet } from '../../sheet/sheet-mount';
import { grabberLabel, nextDetent } from '../../sheet/sheet-view';

interface Props {
  readonly label: string;
  readonly detent: DetentName;
  readonly onDetent: (detent: DetentName) => void;
  /** Each frame, how far open past half the sheet is (0 to 1). */
  readonly onOpenness: (value: number) => void;
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
    const start = reported.current;
    sheet.current = mountSheet(node, {
      start, reducedMotion, onDetent, onOpenness, canDrag,
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
  return (
    <section ref={el} className="sheet" aria-label={label}>
      <button
        type="button"
        className="sheet__grabber"
        aria-label={grabberLabel(detent)}
        aria-expanded={detent === 'full'}
        onClick={() => onDetent(nextDetent(detent))}
      >
        <span className="sheet__bar" />
      </button>
      {children}
    </section>
  );
}
