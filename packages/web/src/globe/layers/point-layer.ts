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
 * A ready-made renderer for a layer of points (VENT-37): one real button
 * per point over the canvas, so each is focusable, named for assistive
 * technology and clickable, the same size at every zoom, hidden behind
 * the limb (which also takes it out of the tab order). Its look is the
 * caller's class; `globe-point` (saved.css) gives the 44 px target. Where
 * targets overlap, a click goes to the point nearest the pointer, as for
 * the site markers (marker-hit.ts). The buttons are kept by point id, so a
 * focused one survives new points.
 */
import type { LatLon } from '../../lib/polar-projection';
import { nearestMarker, type PlacedMarker } from '../marker-hit';
import type {
  LayerContext,
  LayerCover,
  LayerFrame,
  LayerRenderer,
} from './registry';

/** A point a layer draws. */
export interface LayerPoint extends LatLon {
  /** Unique within the layer. */
  readonly id: string;
  /** The button's accessible name. */
  readonly label: string;
}

export interface PointLayerOptions {
  /** The class of each button, beside `globe-point`. */
  readonly className: string;
  /** Hears a clicked point's id. */
  readonly onPick?: (id: string) => void;
  /**
   * The radius, px, of what each shown point draws: the graticule's
   * labels keep clear of it (VENT-52). Without it the layer covers nothing.
   */
  readonly coverPx?: number;
}

export interface PointLayer extends LayerRenderer {
  /** Replaces the points drawn (before or after the globe mounts). */
  setPoints(points: readonly LayerPoint[]): void;
}

/** A hidden button for a point, until a frame places it. */
function pointButton(
  point: LayerPoint,
  onClick: (event: MouseEvent) => void,
): HTMLButtonElement {
  const el = document.createElement('button');
  el.type = 'button';
  el.dataset['pointId'] = point.id;
  el.hidden = true;
  el.addEventListener('click', onClick);
  return el;
}

interface Drawn {
  points: readonly LayerPoint[];
  context: LayerContext | null;
  /** Where the last frame put each shown point, px in the root. */
  placed: PlacedMarker[];
  readonly buttons: Map<string, HTMLButtonElement>;
  readonly options: PointLayerOptions;
}

/** Puts each button where `frame` shows its point, and keeps where. */
function placeAll(drawn: Drawn, frame: LayerFrame): void {
  drawn.placed = [];
  for (const point of drawn.points) {
    const el = drawn.buttons.get(point.id);
    if (!el) continue;
    const at = frame.project(point);
    if (el.hidden !== !at) el.hidden = !at;
    if (!at) continue;
    el.style.transform = `translate3d(${at.x}px, ${at.y}px, 0)`;
    drawn.placed.push({ id: point.id, at });
  }
}

/**
 * Hands `options.onPick` the point a click on `own`'s button means: the
 * nearest shown point under the pointer, or its own from the keyboard.
 */
function pick(drawn: Drawn, own: string, event: MouseEvent): void {
  const root = drawn.context?.root;
  let id = own;
  if (root && event.detail !== 0) {
    const box = root.getBoundingClientRect();
    const at = { x: event.clientX - box.left, y: event.clientY - box.top };
    id = nearestMarker(drawn.placed, at)?.id ?? own;
  }
  drawn.options.onPick?.(id);
}

/** One button per point while mounted, none otherwise; then a frame. */
function syncButtons(drawn: Drawn): void {
  const { points, context, buttons, options } = drawn;
  const ids = new Set(points.map(({ id }) => id));
  for (const [id, el] of buttons) {
    if (ids.has(id) && context) continue;
    el.remove();
    buttons.delete(id);
  }
  if (!context) return;
  for (const point of points) {
    const el = buttons.get(point.id) ??
      pointButton(point, (event) => pick(drawn, point.id, event));
    el.className = `globe-point ${options.className}`;
    el.setAttribute('aria-label', point.label);
    if (!buttons.has(point.id)) context.root.append(el);
    buttons.set(point.id, el);
  }
  context.invalidate();
}

/** A renderer drawing `setPoints`' points as buttons styled by `options`. */
export function pointLayer(options: PointLayerOptions): PointLayer {
  const buttons = new Map<string, HTMLButtonElement>();
  const drawn: Drawn = {
    points: [], context: null, placed: [], buttons, options,
  };
  const setPoints = (next: readonly LayerPoint[]): void => {
    drawn.points = next;
    syncButtons(drawn);
  };
  const mount = (context: LayerContext): void => {
    drawn.context = context;
    syncButtons(drawn);
  };
  const unmount = (): void => {
    drawn.context = null;
    syncButtons(drawn);
  };
  const place = (frame: LayerFrame): void => placeAll(drawn, frame);
  const radius = options.coverPx;
  const covers = (): LayerCover[] => radius === undefined ? [] :
    drawn.placed.map(({ at }) => ({ at, radius }));
  return { setPoints, mount, unmount, place, covers };
}
