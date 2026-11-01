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
 * A tiny synthetic terrain for the tests (VENT-40): grids written to a
 * temporary directory and their catalogue. Never a real LOLA download.
 */
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { TerrainCatalogue, Tier } from '../src/terrain/catalogue.ts';

export const R = 1_737_400;
/** The observer of the crater tests, near the south pole. */
export const CRATER = { lat: -89.99, lonEast: 30, heightM: 2 };
/** Side of the polar fixture, pixels of 20 m. */
const SIDE = 600;
const POLE = (SIDE - 1) / 2;
/** The globe fixture: 2 x 4 tiles of 256 x 256, 1024 / 360 px per degree. */
const GLOBE_PPD = 1024 / 360;

function file(name: string, bytes: number, row = 0, col = 0) {
  return { file: name, url: `https://example.invalid/${name}`, label: '', labelSha256: '', bytes, sha256: null, row, col };
}

/** The polar fixture's pixel of the crater observer. */
function observerPixel(): [number, number] {
  const lat = (CRATER.lat * Math.PI) / 180;
  const lon = (CRATER.lonEast * Math.PI) / 180;
  const rho = 2 * R * Math.tan(Math.PI / 4 + lat / 2);
  return [POLE - (rho * Math.cos(lon)) / 20, POLE + (rho * Math.sin(lon)) / 20];
}

/** A 500 m wall 1 km around the crater observer, flat inside. */
function craterBytes(): Buffer {
  const [ol, os] = observerPixel();
  const buf = Buffer.alloc(SIDE * SIDE * 2);
  for (let i = 0; i < SIDE * SIDE; i++) {
    const m = Math.hypot(Math.floor(i / SIDE) - ol, (i % SIDE) - os) * 20;
    buf.writeInt16LE(m > 1_000 ? 1_000 : 0, i * 2);
  }
  return buf;
}

export const SOUTH: Tier = {
  id: 'south-20m', resolutionM: 20, coverage: { minLatDeg: -90, maxLatDeg: -89.8 },
  lines: SIDE, samples: SIDE, metresPerDn: 0.5, radiusM: R,
  projection: { kind: 'polar', pole: 'south', poleLine: POLE, poleSample: POLE, metresPerPixel: 20 },
  tileLines: SIDE, tileSamples: SIDE, files: [file('south.img', SIDE * SIDE * 2)],
};

export const GLOBE: Tier = {
  id: 'globe-coarse', resolutionM: 10_000, coverage: { minLatDeg: -90, maxLatDeg: 90 },
  lines: 512, samples: 1024, metresPerDn: 0.5, radiusM: R,
  projection: { kind: 'cylindrical', pixelsPerDeg: GLOBE_PPD, lineOffset: 90 * GLOBE_PPD - 0.5, sampleOffset: 180 * GLOBE_PPD - 0.5, centerLonDeg: 180 },
  tileLines: 256, tileSamples: 256,
  files: [0, 1].flatMap((row) => [0, 1, 2, 3].map((col) => file(`globe_${row}_${col}.img`, 256 * 256 * 2, row, col))),
};

/** The DN every pixel of a globe tile holds: 10 x its number. */
export const tileDn = (row: number, col: number): number => 10 * (row * 4 + col + 1);

export const CATALOGUE: TerrainCatalogue = {
  bands: [
    { untilM: 5_000, stepM: 20, tiers: ['south-20m', 'globe-coarse'] },
    { untilM: 200_000, stepM: 2_000, tiers: ['globe-coarse'] },
  ],
  tiers: [SOUTH, GLOBE],
};

/** A temporary directory with every fixture file written. */
export async function terrainDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'terrain-'));
  await writeFile(join(dir, 'south.img'), craterBytes());
  for (const f of GLOBE.files) {
    const buf = Buffer.alloc(f.bytes);
    for (let i = 0; i < f.bytes; i += 2) buf.writeInt16LE(tileDn(f.row, f.col), i);
    await writeFile(join(dir, f.file), buf);
  }
  return dir;
}
