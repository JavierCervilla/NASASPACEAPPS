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
 * Fetches the LOLA tiers of the terrain catalogue (data/terrain-catalogue.json, VENT-40) into the terrain volume, for
 * the server's TERRAIN_DIR and for terrain-horizons.ts. Nothing goes into git or the image. Resumable: a file being
 * fetched is `<name>.part`, and a run continues it with an HTTP Range request. Each file is checked against its
 * catalogued size and, where the catalogue pins one, its sha256; a file whose sha256 is not pinned yet is kept and its
 * hash printed, to pin in the catalogue. Tiers not asked for are skipped; a complete file is not fetched again.
 *
 *   node packages/server/scripts/fetch-terrain.ts --dir /data/terrain                 # every tier (about 48.6 GB)
 *   node packages/server/scripts/fetch-terrain.ts --dir /data/terrain --tiers polar-south-20m,polar-south-80m
 *   node packages/server/scripts/fetch-terrain.ts --list                                # tiers and sizes
 *   NODE_USE_ENV_PROXY=1 ...                                                            # behind a proxy
 */
import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, rename, stat, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { parseArgs } from 'node:util';
import { DEFAULT_CATALOGUE_FILE, loadCatalogue, type TierFile } from '../src/terrain/catalogue.ts';

const GB = 1e9;
const RETRIES = 20;

const { values } = parseArgs({
  options: { dir: { type: 'string' }, tiers: { type: 'string' }, list: { type: 'boolean', default: false } },
});
const catalogue = await loadCatalogue(DEFAULT_CATALOGUE_FILE);

const sizeOf = (path: string): Promise<number> => stat(path).then((s) => s.size, () => -1);

async function sha256Of(path: string): Promise<string> {
  const hash = createHash('sha256');
  await pipeline(createReadStream(path), hash);
  return hash.digest('hex');
}

/** Appends the rest of `file` to `part`, from where it stopped. */
async function download(file: TierFile, part: string): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    const have = Math.max(0, await sizeOf(part));
    if (have === file.bytes) return;
    try {
      const response = await fetch(file.url, { headers: { Range: `bytes=${have}-` } });
      if (response.status !== 206 || !response.body) throw new Error(`HTTP ${response.status}`);
      await pipeline(Readable.fromWeb(response.body), createWriteStream(part, { flags: 'a' }));
    } catch (error) {
      if (attempt >= RETRIES) throw error;
      process.stdout.write(`  ${file.file}: ${(error as Error).message}; resuming (${attempt})\n`);
      await new Promise((resolve) => setTimeout(resolve, 5_000));
    }
  }
}

/** Fetches and checks one file; true when it ends complete. */
async function fetchFile(dir: string, file: TierFile): Promise<void> {
  const path = join(dir, file.file);
  if ((await sizeOf(path)) === file.bytes) {
    process.stdout.write(`  ${file.file}: present\n`);
    return;
  }
  const part = `${path}.part`;
  await download(file, part);
  const sha = await sha256Of(part);
  if (file.sha256 !== null && sha !== file.sha256) {
    await unlink(part);
    throw new Error(`${file.file}: sha256 ${sha} is not the pinned ${file.sha256}; deleted`);
  }
  await rename(part, path);
  const note = file.sha256 === null ? ' (not pinned yet: pin it in the catalogue)' : ' (matches the pin)';
  process.stdout.write(`  ${file.file}: sha256 ${sha}${note}\n`);
}

if (values.list) {
  for (const tier of catalogue.tiers) {
    const bytes = tier.files.reduce((sum, f) => sum + f.bytes, 0);
    process.stdout.write(`${tier.id.padEnd(18)} ${String(tier.resolutionM).padStart(6)} m  ${(bytes / GB).toFixed(2)} GB  ${tier.files.length} file(s)\n`);
  }
} else {
  if (!values.dir) throw new Error('usage: fetch-terrain.ts --dir <terrain dir> [--tiers a,b] | --list');
  const wanted = values.tiers?.split(',').map((t) => t.trim()) ?? catalogue.tiers.map((t) => t.id);
  const unknown = wanted.filter((id) => !catalogue.tiers.some((t) => t.id === id));
  if (unknown.length > 0) throw new Error(`unknown tiers: ${unknown.join(', ')}`);
  await mkdir(values.dir, { recursive: true });
  for (const tier of catalogue.tiers.filter((t) => wanted.includes(t.id))) {
    process.stdout.write(`${tier.id}\n`);
    for (const file of tier.files) await fetchFile(values.dir, file);
  }
}
