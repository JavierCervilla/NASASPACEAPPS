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
 * Fetches the LOLA relief the hero film is built on into a local cache
 * (cache/tiles/, git-ignored): the levelled polar-south tiles of Ventana
 * Lunar's API (docs/terrain-api.md) in the squares `sites.mjs` names, two
 * at a time, honouring 429 and 503 with their Retry-After. A tile already in
 * the cache under the current version token is not asked again, so a second
 * run costs one request.
 *
 *   node packages/landing/media-src/moon-scene/scripts/fetch-tiles.mjs [--site im2]
 *
 * Source: NASA LRO LOLA gridded elevation (PDS LRO-L-LOLA-4-GDR-V1.0), as the
 * API's tiers list it; public domain, credit NASA/GSFC, the LOLA team.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { API, levelsOf, siteOf } from './sites.mjs';

const CACHE = fileURLToPath(new URL('../cache/tiles/', import.meta.url));
const AT_ONCE = 2;
const TRIES = 8;

const pause = (ms) => new Promise((done) => setTimeout(done, ms));

async function getJson(url) {
  for (let attempt = 1; attempt <= TRIES; attempt++) {
    const res = await fetch(url, { headers: { accept: 'application/json' } });
    if (res.ok) return res.json();
    if (res.status !== 429 && res.status !== 503) throw new Error(`${res.status} for ${url}`);
    const after = Number(res.headers.get('retry-after')) || 2;
    await pause(Math.min(30, after * attempt) * 1000);
  }
  throw new Error(`gave up on ${url}`);
}

async function currentVersion(site) {
  const q = `lat=${site.latDeg}&lon=${site.lonEastDeg}&levels=1`;
  const ring = await getJson(`${API}/api/v1/terrain/tiles?${q}`);
  return ring.version;
}

function pathOf(level, { x, y }) {
  return `${CACHE}${level}/${x}_${y}.json`;
}

function cached(path, version) {
  if (!existsSync(path)) return false;
  return JSON.parse(readFileSync(path, 'utf8')).version === version;
}

async function fetchAll(jobs, version) {
  let next = 0;
  let fetched = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const { level, key, path } = jobs[next++];
      const url = `${API}/api/v1/terrain/tiles/polar-south/${level}/${key.x}/${key.y}?v=${version}`;
      writeFileSync(path, JSON.stringify(await getJson(url)));
      fetched++;
      if (fetched % 20 === 0) process.stdout.write(`  ${fetched}/${jobs.length}\n`);
    }
  };
  await Promise.all(Array.from({ length: AT_ONCE }, worker));
  return fetched;
}

const site = siteOf();
const version = await currentVersion(site);
const jobs = [];
for (const lv of levelsOf(site)) {
  mkdirSync(`${CACHE}${lv.level}`, { recursive: true });
  for (const key of lv.keys) {
    const path = pathOf(lv.level, key);
    if (!cached(path, version)) jobs.push({ level: lv.level, key, path });
  }
}
process.stdout.write(`version ${version}: ${jobs.length} tiles to fetch\n`);
const n = await fetchAll(jobs, version);
writeFileSync(`${CACHE}version.json`, JSON.stringify({ version, api: API, fetchedAt: new Date().toISOString() }));
process.stdout.write(`fetched ${n}, cache ${CACHE}\n`);
