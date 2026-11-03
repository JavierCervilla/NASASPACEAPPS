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
 * Which graticule labels show and where (VENT-50), each frame. A label
 * shows while its point faces the camera (hidden behind the limb like any
 * point of the globe, marker-layer.ts), moved in from the limb until its
 * box lies inside the Moon (disk.ts), while that box is whole inside the
 * globe's view, and while it keeps a gap from every site marker and ring
 * and from the labels placed before it (clearance.ts). The box is the one
 * the page measures (room.ts), so it grows with the text size. A
 * parallel can stand on any meridian: it takes the one with the widest
 * gap, the farthest from the markers and the selected site's ring, and
 * keeps it while it stays clear, so labels do not hop as the globe turns.
 * Pure.
 */
import { isFacing, latLonToVector, type Vec3 } from '../geo';
import type { Mark, ScreenPoint } from '../marker-cull';
import {
  gapToLabel,
  gapToObstacle,
  LABEL_BOX,
  obstaclesOf,
  type Obstacle,
} from './clearance';
import {
  insideDisk,
  insideView,
  moonDisk,
  type Box,
  type Disk,
} from './disk';
import type { GraticuleLabel } from './labels';

/** The gap a label keeps from a marker, a ring or another label, px. */
export const CLEAR_PX = 3;

/** The room the labels have: their box and the view, px. */
export interface LabelRoom {
  /** The box a label takes: the widest label as the page draws it. */
  readonly box: Box;
  /** The globe's view, from the screen's origin; null: unbounded. */
  readonly view: Box | null;
}

/** The room before the page has measured it. */
const UNMEASURED: LabelRoom = { box: LABEL_BOX, view: null };

/** What a frame shows of the Moon, and the room the labels have. */
export interface LabelFrame extends LabelRoom {
  readonly project: (point: Vec3) => ScreenPoint;
  readonly eye: Vec3;
  readonly disk: Disk;
  readonly obstacles: readonly Obstacle[];
}

/** The frame the labels are placed in, from what the globe drew. */
export function labelFrame(
  project: (point: Vec3) => ScreenPoint,
  eye: Vec3,
  marks: readonly Mark[],
  room: LabelRoom = UNMEASURED,
): LabelFrame {
  const disk = moonDisk(project, eye);
  const obstacles = obstaclesOf(marks);
  return { project, eye, disk, obstacles, box: room.box, view: room.view };
}

/** `frame` with the discs `covers` as obstacles too (VENT-52). */
export function clearOf(
  frame: LabelFrame,
  covers: readonly Obstacle[] = [],
): LabelFrame {
  return { ...frame, obstacles: [...frame.obstacles, ...covers] };
}

/** A label that shows, the longitude it stands at, and its centre, px. */
export interface PlacedLabel {
  readonly id: string;
  readonly lonEast: number;
  readonly at: ScreenPoint;
}

/** Where a label may stand: a longitude, its centre, and its widest gap. */
interface Spot {
  readonly lonEast: number;
  readonly at: ScreenPoint;
  readonly gap: number;
}

/** The spots of `label` that show from the frame's camera. */
function spotsOf(
  label: GraticuleLabel,
  frame: LabelFrame,
  placed: readonly PlacedLabel[],
): Spot[] {
  const spots: Spot[] = [];
  for (const lonEast of label.lonEasts) {
    const point = latLonToVector(label.lat, lonEast);
    if (!isFacing(point, frame.eye)) continue;
    const at = insideDisk(frame.project(point), frame.box, frame.disk);
    if (!at || !insideView(at, frame.box, frame.view)) continue;
    const gaps = [
      ...frame.obstacles.map((o) => gapToObstacle(at, o, frame.box)),
      ...placed.map((other) => gapToLabel(at, other.at, frame.box)),
    ];
    spots.push({ lonEast, at, gap: Math.min(...gaps) });
  }
  return spots;
}

/** The spot to use: the one kept while it is clear, else the widest gap. */
function chosen(spots: readonly Spot[], kept: number | undefined) {
  const stays = spots.find((spot) => spot.lonEast === kept);
  if (stays && stays.gap >= CLEAR_PX) return stays;
  const widest = spots.reduce<Spot | null>(
    (best, spot) => (!best || spot.gap > best.gap ? spot : best),
    null,
  );
  return widest && widest.gap >= CLEAR_PX ? widest : null;
}

/**
 * The labels to show for `frame`, in the order of `labels`. `memory`
 * holds the meridian each label stood on, from one frame to the next.
 */
export function placeLabels(
  labels: readonly GraticuleLabel[],
  frame: LabelFrame,
  memory: Map<string, number>,
): PlacedLabel[] {
  const placed: PlacedLabel[] = [];
  for (const label of labels) {
    const spot = chosen(spotsOf(label, frame, placed), memory.get(label.id));
    if (!spot) continue;
    memory.set(label.id, spot.lonEast);
    placed.push({ id: label.id, lonEast: spot.lonEast, at: spot.at });
  }
  return placed;
}
