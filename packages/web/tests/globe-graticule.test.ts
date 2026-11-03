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
 * The globe's graticule (VENT-50): the lines on the sphere, where the labels
 * stand, which of them show from a camera, and the words they wear.
 */
import { PerspectiveCamera, Vector3 } from 'three';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { graticuleText } from '../src/globe/graticule/text';
import { isFacing, latLonToVector, vectorToLatLon, type Vec3 } from '../src/globe/geo';
import { cameraPosition, FOV_DEG, SOUTH_POLE_VIEW, type OrbitPose } from '../src/globe/framing';
import { aimCamera } from '../src/globe/stage';
import {
  GRATICULE_RADIUS,
  MERIDIANS_EAST_DEG,
  PARALLELS_DEG,
  graticuleGeometry,
} from '../src/globe/graticule/lines';
import { gapToLabel, gapToObstacle, LABEL_BOX, obstaclesOf, RING_RADIUS_PX } from '../src/globe/graticule/clearance';
import { insideDisk, LIMB_MARGIN_PX, moonDisk } from '../src/globe/graticule/disk';
import { graticuleLabels, PARALLEL_STEP_DEG } from '../src/globe/graticule/labels';
import { CLEAR_PX, labelFrame, placeLabels, type PlacedLabel } from '../src/globe/graticule/place';
import type { Mark } from '../src/globe/marker-cull';
import { EN, i18nOf } from './i18n-factories';

/** Where the camera at `pose` puts a point of the Moon on a `width` x `height` px canvas. */
function projectorOf(pose: OrbitPose, width: number, height: number) {
  const camera = new PerspectiveCamera(FOV_DEG, width / height, 0.1, 100);
  aimCamera(camera, pose);
  return (point: Vec3) => {
    const v = new Vector3(point.x, point.y, point.z).project(camera);
    return { x: ((v.x + 1) / 2) * width, y: ((1 - v.y) / 2) * height };
  };
}

const vertex = (positions: Float32Array, i: number): Vec3 => ({
  x: positions[3 * i]!,
  y: positions[3 * i + 1]!,
  z: positions[3 * i + 2]!,
});

describe('the graticule\'s lines', () => {
  const { positions, index } = graticuleGeometry();
  const count = positions.length / 3;
  const all = Array.from({ length: count }, (_, i) => vertex(positions, i));

  it('has the parallels at 85°, 80° and 70° S and the meridians at 0°, 45° and 90° east and west', () => {
    expect(PARALLELS_DEG).toEqual([-85, -80, -70]);
    expect([...MERIDIANS_EAST_DEG].sort((a, b) => a - b)).toEqual([-90, -45, 0, 45, 90]);
  });

  it('keeps to a few hundred vertices and to whole segments', () => {
    expect(count).toBeGreaterThan(200);
    expect(count).toBeLessThan(1000);
    expect(index.length % 2).toBe(0);
    expect(Math.max(...index)).toBeLessThan(count);
  });

  it('lies a hair above the sphere, so no chord of a line dips under the Moon', () => {
    expect(GRATICULE_RADIUS).toBeGreaterThan(1);
    for (let i = 0; i < index.length; i += 2) {
      const [a, b] = [vertex(positions, index[i]!), vertex(positions, index[i + 1]!)];
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 };
      expect(Math.hypot(mid.x, mid.y, mid.z)).toBeGreaterThan(1);
      expect(Math.hypot(a.x, a.y, a.z)).toBeCloseTo(GRATICULE_RADIUS, 6);
    }
  });

  it('draws each parallel as a closed ring on its own latitude', () => {
    for (const lat of PARALLELS_DEG) {
      const ring = all.filter((v) => Math.abs(vectorToLatLon(v).latDeg - lat) < 1e-4);
      expect(ring.length).toBeGreaterThanOrEqual(60);
      const around = new Set(ring.map((v) => Math.round(vectorToLatLon(v).lonEastDeg)));
      expect(around.size).toBeGreaterThanOrEqual(60);
    }
  });

  it('runs each meridian from the south pole through its own longitude', () => {
    for (const lon of MERIDIANS_EAST_DEG) {
      const onIt = all.filter((v) => {
        const at = vectorToLatLon(v);
        return Math.abs(at.latDeg) < 89.9 && Math.abs(((at.lonEastDeg - lon + 540) % 360) - 180) < 1e-4;
      });
      expect(onIt.length).toBeGreaterThan(30);
      expect(Math.min(...onIt.map((v) => vectorToLatLon(v).latDeg))).toBeLessThan(-80);
    }
    expect(all.some((v) => vectorToLatLon(v).latDeg < -89.9)).toBe(true);
  });
});

const SITES = JSON.parse(readFileSync(new URL('../../server/data/sites.json', import.meta.url), 'utf8')) as {
  sites?: { id: string; lat: number; lonEast: number }[];
};
const SITE_LIST = Array.isArray(SITES) ? (SITES as { id: string; lat: number; lonEast: number }[]) : (SITES.sites ?? []);
const SELECTED = 'im2-athena';

/** The frame the labels are placed in for a camera at `pose` on a `width` x `height` px canvas, with `marks`. */
function frameOf(pose: OrbitPose, width: number, height: number, marks: readonly Mark[] = []) {
  return labelFrame(projectorOf(pose, width, height), cameraPosition(pose), marks);
}

/** Where every curated site's marker lands from `pose`, as the marker layer reports it (those facing the camera). */
function marksOf(pose: OrbitPose, width: number, height: number): Mark[] {
  const [project, eye] = [projectorOf(pose, width, height), cameraPosition(pose)];
  return SITE_LIST.map((site) => ({ point: latLonToVector(site.lat, site.lonEast), selected: site.id === SELECTED }))
    .filter(({ point }) => isFacing(point, eye))
    .map(({ point, selected }) => ({ at: project(point), selected }));
}

const idsOf = (placed: readonly PlacedLabel[]): string[] => placed.map(({ id }) => id).sort();
const place = (frame: ReturnType<typeof frameOf>, memory = new Map<string, number>()) => placeLabels(graticuleLabels(), frame, memory);

/** The views the rules are held in: the opening one on a desktop and on a phone, the phone zoomed out, and a turned one. */
const VIEWS: readonly (readonly [string, OrbitPose, number, number])[] = [
  ['desktop opening', SOUTH_POLE_VIEW, 1050, 540],
  ['phone opening', SOUTH_POLE_VIEW, 390, 554],
  ['phone zoomed out', { ...SOUTH_POLE_VIEW, distance: 8 }, 390, 554],
  ['turned to 150° E', { latDeg: -70, lonEastDeg: 150, distance: 4 }, 1050, 540],
];

describe('the graticule\'s labels', () => {
  const labels = graticuleLabels();

  it('names each of the three parallels and each of the five meridians once', () => {
    expect(labels.filter(({ kind }) => kind === 'parallel').map(({ lat }) => lat).sort((a, b) => a - b)).toEqual([-85, -80, -70]);
    expect(
      labels.filter(({ kind }) => kind === 'meridian').map(({ lonEasts }) => lonEasts[0]).sort((a, b) => (a ?? 0) - (b ?? 0)),
    ).toEqual([-90, -45, 0, 45, 90]);
    expect(new Set(labels.map(({ id }) => id)).size).toBe(8);
  });

  it('stands a meridian\'s label on its own line, and lets a parallel\'s stand on any meridian every 15°', () => {
    for (const label of labels) {
      if (label.kind === 'meridian') {
        expect(label.lonEasts).toHaveLength(1);
        expect(MERIDIANS_EAST_DEG).toContain(label.lonEasts[0]);
      } else {
        expect(PARALLELS_DEG).toContain(label.lat);
        expect(label.lonEasts).toHaveLength(360 / PARALLEL_STEP_DEG);
      }
    }
  });

  it('shows all eight labels from the opening view on a desktop with no marker in the way', () => {
    expect(idsOf(place(frameOf(SOUTH_POLE_VIEW, 1100, 700)))).toEqual(labels.map(({ id }) => id).sort());
  });

  it('keeps the meridians first when a small phone\'s zoomed-out globe has no room for every label', () => {
    const frame = frameOf({ ...SOUTH_POLE_VIEW, distance: 8 }, 390, 554);
    const meridians = labels.filter(({ kind }) => kind === 'meridian');
    const alone = idsOf(placeLabels(meridians, frame, new Map()));
    const all = idsOf(place(frame));
    // The parallels, placed after, never take the room a meridian would have had.
    expect(all.filter((id) => id.startsWith('meridian'))).toEqual(alone);
    expect(alone.length).toBeGreaterThanOrEqual(4);
  });

  it('hides a label behind the limb: looking down on the north, the southern labels are gone', () => {
    const northPose = { latDeg: 60, lonEastDeg: 0, distance: 5 };
    for (const label of labels) {
      for (const lon of label.lonEasts) expect(isFacing(latLonToVector(label.lat, lon), cameraPosition(northPose))).toBe(false);
    }
    expect(place(frameOf(northPose, 1100, 700))).toEqual([]);
  });

  it('shows only labels whose point the camera sees, from any side', () => {
    const pose = { latDeg: -30, lonEastDeg: 90, distance: 5 };
    const placed = place(frameOf(pose, 1100, 700));
    expect(placed.length).toBeGreaterThan(0);
    for (const { id, lonEast } of placed) {
      const label = labels.find((l) => l.id === id)!;
      expect(isFacing(latLonToVector(label.lat, lonEast), cameraPosition(pose))).toBe(true);
    }
  });

  it('never lets two labels touch, even where the polar cap is a few pixels across', () => {
    for (const [name, pose, width, height] of VIEWS) {
      const placed = place(frameOf(pose, width, height));
      for (const [i, one] of placed.entries()) {
        for (const other of placed.slice(i + 1)) expect(gapToLabel(one.at, other.at), name).toBeGreaterThanOrEqual(CLEAR_PX);
      }
    }
  });
});

describe('the graticule\'s labels inside the limb', () => {
  const disk = { at: { x: 500, y: 300 }, radius: 200 };

  it('finds the Moon\'s disc: its centre, and the tangent point of the outline at the camera\'s distance', () => {
    const found = moonDisk(projectorOf(SOUTH_POLE_VIEW, 1000, 600), cameraPosition(SOUTH_POLE_VIEW));
    expect(found.at.x).toBeCloseTo(500, 6);
    expect(found.at.y).toBeCloseTo(300, 6);
    // f / sqrt(d² - 1) for a 600 px tall canvas at 35° and 5 radii.
    const f = 600 / 2 / Math.tan((FOV_DEG / 2) * (Math.PI / 180));
    expect(found.radius).toBeCloseTo(f / Math.sqrt(24), 3);
  });

  it('leaves a label that already fits where it is', () => {
    expect(insideDisk({ x: 520, y: 310 }, LABEL_BOX, disk)).toEqual({ x: 520, y: 310 });
  });

  it('moves a label at the edge straight in until its whole box is inside the margin', () => {
    for (const edge of [{ x: 700, y: 300 }, { x: 300, y: 300 }, { x: 500, y: 100 }, { x: 640, y: 160 }]) {
      const moved = insideDisk(edge, LABEL_BOX, disk)!;
      expect(moved).not.toEqual(edge);
      const corner = { x: Math.abs(moved.x - 500) + LABEL_BOX.width / 2, y: Math.abs(moved.y - 300) + LABEL_BOX.height / 2 };
      expect(Math.hypot(corner.x, corner.y)).toBeCloseTo(200 - LIMB_MARGIN_PX, 6);
      // Straight toward the centre: the same bearing.
      expect((moved.x - 500) * (edge.y - 300)).toBeCloseTo((moved.y - 300) * (edge.x - 500), 6);
    }
  });

  it('gives up on a disc too small for the box', () => {
    expect(insideDisk({ x: 10, y: 10 }, LABEL_BOX, { at: { x: 0, y: 0 }, radius: 20 })).toBeNull();
  });

  it('keeps every placed label\'s whole box inside the disc, in every view', () => {
    for (const [name, pose, width, height] of VIEWS) {
      const frame = frameOf(pose, width, height);
      for (const { at } of place(frame)) {
        const corners = [-1, 1].flatMap((sx) => [-1, 1].map((sy) => ({ x: at.x + (sx * LABEL_BOX.width) / 2, y: at.y + (sy * LABEL_BOX.height) / 2 })));
        for (const corner of corners) {
          expect(Math.hypot(corner.x - frame.disk.at.x, corner.y - frame.disk.at.y), name).toBeLessThanOrEqual(frame.disk.radius - LIMB_MARGIN_PX + 1e-6);
        }
      }
    }
  });

  it('moves the «90° W» label of the opening view in from the limb it would hang over', () => {
    const frame = frameOf(SOUTH_POLE_VIEW, 1050, 540);
    const west = place(frame).find(({ id }) => id === 'meridian:-90')!;
    const anchor = frame.project(latLonToVector(-60, -90));
    expect(Math.hypot(west.at.x - anchor.x, west.at.y - anchor.y)).toBeGreaterThan(1);
  });
});

describe('the graticule\'s labels clear of the site markers', () => {
  it('hides a meridian\'s label a marker\'s dot would touch', () => {
    const frame = frameOf(SOUTH_POLE_VIEW, 1100, 700);
    const meridian = place(frame).find(({ id }) => id === 'meridian:45')!;
    const covered = frameOf(SOUTH_POLE_VIEW, 1100, 700, [{ at: { x: meridian.at.x + 20, y: meridian.at.y }, selected: false }]);
    expect(idsOf(place(covered))).not.toContain('meridian:45');
  });

  it('moves a parallel\'s label to another meridian when the selected site\'s ring covers the one it stood on', () => {
    const open = frameOf(SOUTH_POLE_VIEW, 1100, 700);
    const first = place(open).find(({ id }) => id === 'parallel:-85')!;
    const ring = frameOf(SOUTH_POLE_VIEW, 1100, 700, [{ at: first.at, selected: true }]);
    const moved = place(ring).find(({ id }) => id === 'parallel:-85')!;
    expect(moved.lonEast).not.toBe(first.lonEast);
    expect(gapToObstacle(moved.at, ring.obstacles[0]!)).toBeGreaterThanOrEqual(CLEAR_PX);
  });

  it('takes the meridian with the widest gap from the markers, not just a clear one', () => {
    const ringAt = place(frameOf(SOUTH_POLE_VIEW, 1100, 700)).find(({ id }) => id === 'parallel:-70')!.at;
    const frame = frameOf(SOUTH_POLE_VIEW, 1100, 700, [{ at: ringAt, selected: true }]);
    const chosen = place(frame).find(({ id }) => id === 'parallel:-70')!;
    const gapOf = (at: PlacedLabel['at']): number => Math.min(...frame.obstacles.map((o) => gapToObstacle(at, o)));
    for (const lon of graticuleLabels().find(({ id }) => id === 'parallel:-70')!.lonEasts) {
      const point = latLonToVector(-70, lon);
      if (!isFacing(point, frame.eye)) continue;
      const at = insideDisk(frame.project(point), LABEL_BOX, frame.disk);
      if (at) expect(gapOf(chosen.at)).toBeGreaterThanOrEqual(Math.min(gapOf(at), gapOf(chosen.at)));
    }
    expect(gapOf(chosen.at)).toBeGreaterThan(CLEAR_PX);
  });

  it('keeps a parallel\'s meridian from frame to frame while it stays clear, so labels do not hop as the globe turns', () => {
    const memory = new Map<string, number>();
    const first = place(frameOf(SOUTH_POLE_VIEW, 1100, 700), memory).find(({ id }) => id === 'parallel:-85')!;
    const nudged = { ...SOUTH_POLE_VIEW, lonEastDeg: SOUTH_POLE_VIEW.lonEastDeg + 4 };
    const again = place(frameOf(nudged, 1100, 700), memory).find(({ id }) => id === 'parallel:-85')!;
    expect(again.lonEast).toBe(first.lonEast);
    // Covered, it moves.
    const covered = frameOf(nudged, 1100, 700, [{ at: again.at, selected: true }]);
    expect(place(covered, memory).find(({ id }) => id === 'parallel:-85')!.lonEast).not.toBe(first.lonEast);
  });

  it('never touches a site marker or the selected ring, with every curated site on the Moon, in every view', () => {
    expect(SITE_LIST.length).toBeGreaterThan(20);
    for (const [name, pose, width, height] of VIEWS) {
      const marks = marksOf(pose, width, height);
      const frame = frameOf(pose, width, height, marks);
      const obstacles = obstaclesOf(marks);
      expect(obstacles.some((o) => o.radius === RING_RADIUS_PX) || !marks.some((m) => m.selected), name).toBe(true);
      for (const { at, id } of place(frame)) {
        for (const obstacle of obstacles) expect(gapToObstacle(at, obstacle), `${name} ${id}`).toBeGreaterThanOrEqual(CLEAR_PX);
      }
    }
  });

  it('leaves the 85° S label out while the polar cap is too small for it to clear the sites, and shows it once zoomed in', () => {
    // Eight curated sites stand within 5° of the pole: at the opening zoom the 85° parallel is a circle 15 px across.
    const label = (distance: number): string[] => {
      const pose = { ...SOUTH_POLE_VIEW, distance };
      return idsOf(place(frameOf(pose, 1050, 540, marksOf(pose, 1050, 540))));
    };
    expect(label(5)).toEqual(expect.arrayContaining(['parallel:-80', 'parallel:-70', 'meridian:0', 'meridian:45']));
    expect(label(5)).not.toContain('parallel:-85');
    expect(label(3.2)).toContain('parallel:-85');
  });
});

describe('the graticule\'s words', () => {
  it('writes the parallels and meridians through the interface\'s own angle format', () => {
    const text = graticuleText(EN);
    expect(text.parallel(-85)).toBe('85° S');
    expect(text.parallel(-70)).toBe('70° S');
    expect(text.meridian(90)).toBe('90° E');
    expect(text.meridian(-45)).toBe('45° W');
    expect(text.meridian(0)).toBe('0°');
  });

  it('writes West as O in Spanish, as the polar map does', () => {
    const text = graticuleText(i18nOf('es'));
    expect(text.meridian(-90)).toBe('90° O');
    expect(text.meridian(90)).toBe('90° E');
    expect(text.parallel(-85)).toBe('85° S');
  });
});
