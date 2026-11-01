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

// Bakes the astronaut's pictures offline (VENT-10) into one sprite sheet the page shows as a plain image:
//
//   node packages/web/scripts/astronaut-figures.mjs [--check]
//
// Two poses (rows: stand, carry) times five visor colours (columns: neutral silver, then the window, Sun, Earth and
// neither signal colours, read from src/styles/tokens.css, where contrast.test.ts holds them theme-independent), each
// cell 180 x 220 px with the feet at 50 % x 95 %, into src/astronaut/figures.webp (lossless) and its manifest
// src/astronaut/figures.json. The model is the build input packages/web/models/astronaut.glb (astronaut.mjs); the page
// never loads it. The pictures used to be drawn on every page load with a second WebGL renderer, which on software GL
// cost each page about a second of CPU.
//
// The drawing runs in Playwright's Chromium pinned to SwiftShader (CPU rasteriser, no GPU in the path), with the
// workspace's three, so two runs give the same bytes; `--check` bakes and fails if the committed files differ.
// PW_CHROMIUM_PATH picks the Chromium binary, as for the e2e suite.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import sharp from 'sharp';

const WEB = fileURLToPath(new URL('..', import.meta.url));
const THREE = join(WEB, '../../node_modules/three');
const SHEET = join(WEB, 'src/astronaut/figures.webp');
const MANIFEST = join(WEB, 'src/astronaut/figures.json');
const ORIGIN = 'http://bake.ventana.test';
/** The cell's size in px and where the feet are in it, as a share of each side (src/astronaut/figure-types.ts). */
const PICTURE = { width: 180, height: 220, feetX: 0.5, feetY: 0.95 };
const POSES = ['stand', 'carry'];
/** The visor's neutral silver: in the dock and off the Moon. */
const IDLE_VISOR = '#a7acb6';
const SIGNALS = { window: '--signal-window', sun: '--signal-sun', earth: '--signal-earth', none: '--signal-none' };
/** SwiftShader through ANGLE: the same CPU rasteriser on every machine. */
const GL_FLAGS = ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader'];

/** Each visor's colour, in column order: silver, then each signal token's value in tokens.css. */
function visorColours() {
  const tokens = readFileSync(join(WEB, 'src/styles/tokens.css'), 'utf8');
  const value = (token) => {
    const match = tokens.match(new RegExp(`${token}:\\s*(#[0-9a-f]{6})\\s*;`, 'i'));
    if (!match) throw new Error(`tokens.css has no ${token}`);
    return match[1].toLowerCase();
  };
  return { idle: IDLE_VISOR, ...Object.fromEntries(Object.entries(SIGNALS).map(([tone, t]) => [tone, value(t)])) };
}

const TYPES = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.glb': 'model/gltf-binary', '.webp': 'image/webp' };
const PAGE = `<!doctype html><meta charset="utf-8"><script type="importmap">${JSON.stringify({
  imports: { three: '/three/build/three.module.js', 'three/addons/': '/three/examples/jsm/' },
})}</script>`;

/** The file a bake page request names: the page, three, the bake module or the model. */
function fileFor(path) {
  if (path.startsWith('/three/')) return join(THREE, path.slice('/three/'.length));
  if (path === '/bake.mjs') return join(WEB, 'scripts/astronaut-figures-page.mjs');
  if (path.startsWith('/models/')) return join(WEB, path);
  return null;
}

/** Every picture as a PNG buffer, `{ [pose]: { [visor]: Buffer } }`, drawn in the pinned Chromium. */
async function drawPictures(colours) {
  const executablePath = process.env.PW_CHROMIUM_PATH || undefined;
  const browser = await chromium.launch({ executablePath, args: GL_FLAGS });
  try {
    const page = await browser.newPage();
    await page.route(`${ORIGIN}/**`, (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path === '/') return route.fulfill({ contentType: 'text/html', body: PAGE });
      const file = fileFor(path);
      if (!file) return route.fulfill({ status: 404, body: '' });
      return route.fulfill({ contentType: TYPES[extname(file)] ?? 'application/octet-stream', body: readFileSync(file) });
    });
    await page.goto(`${ORIGIN}/`);
    const urls = await page.evaluate(async (args) => {
      const { bakeFigures } = await import('/bake.mjs');
      return bakeFigures(args);
    }, { url: '/models/astronaut.glb', picture: PICTURE, poses: POSES, colours });
    const decode = (url) => Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
    return Object.fromEntries(Object.entries(urls).map(([pose, row]) => [pose, Object.fromEntries(
      Object.entries(row).map(([visor, url]) => [visor, decode(url)]))]));
  } finally {
    await browser.close();
  }
}

/** The pictures side by side in one lossless WebP: copied pixel for pixel, never composited (no premultiplying). */
async function sheetOf(pictures, visors) {
  const { width, height } = PICTURE;
  const sheetWidth = width * visors.length;
  const sheet = Buffer.alloc(sheetWidth * height * POSES.length * 4);
  for (const [row, pose] of POSES.entries()) {
    for (const [column, visor] of visors.entries()) {
      const { data, info } = await sharp(pictures[pose][visor]).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      if (info.width !== width || info.height !== height) throw new Error(`${pose}-${visor} is ${info.width}x${info.height}`);
      for (let y = 0; y < height; y += 1) {
        const target = ((row * height + y) * sheetWidth + column * width) * 4;
        data.copy(sheet, target, y * width * 4, (y + 1) * width * 4);
      }
    }
  }
  const raw = { width: sheetWidth, height: height * POSES.length, channels: 4 };
  return sharp(sheet, { raw }).webp({ lossless: true, exact: true, effort: 6 }).toBuffer();
}

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

/** The manifest the page and its tests read the sheet's layout from. */
function manifestOf(sheet, colours) {
  const visors = Object.keys(colours);
  const size = { width: PICTURE.width * visors.length, height: PICTURE.height * POSES.length };
  const cell = PICTURE;
  return `${JSON.stringify({ file: 'figures.webp', ...size, cell, rows: POSES, columns: visors, colours,
    bytes: sheet.byteLength, sha256: sha256(sheet) }, null, 2)}\n`;
}

const check = process.argv.includes('--check');
const colours = visorColours();
const sheet = await sheetOf(await drawPictures(colours), Object.keys(colours));
const manifest = manifestOf(sheet, colours);
if (check) {
  const same = readFileSync(SHEET).equals(sheet) && readFileSync(MANIFEST, 'utf8') === manifest;
  console.log(same ? 'astronaut figures: up to date' : 'astronaut figures: the committed sheet differs from a bake');
  process.exit(same ? 0 : 1);
}
writeFileSync(SHEET, sheet);
writeFileSync(MANIFEST, manifest);
console.log(`${SHEET}: ${sheet.byteLength} bytes, sha256 ${sha256(sheet)}`);
