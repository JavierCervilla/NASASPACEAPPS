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
 * One request for a levelled tile (VENT-46): from the disk, joined to a
 * computation in flight, or computed under the client's slot.
 */
import type { DiskCache } from '../horizons/disk-cache.ts';
import type { InFlight } from '../horizons/in-flight.ts';
import type { LodAnswer } from './lod-answer.ts';
import { underSlot, type SlotTaker } from './lod-slot.ts';

/** What one request for a tile works with. */
export interface LodRequest {
  readonly disk: DiskCache;
  readonly inFlight: InFlight<LodAnswer>;
  readonly file: string;
  readonly compute: () => Promise<LodAnswer>;
}

async function stored(disk: DiskCache, file: string) {
  const hit = await disk.lookup(file);
  return hit === null ? null : (JSON.parse(hit) as LodAnswer);
}

/**
 * A hit and a join cost no slot and no miss; only the request that starts the
 * computation pays both, and after a wait for its slot it looks again, since
 * the tile may have been stored or started meanwhile.
 */
export async function answerRequest(
  { disk, inFlight, file, compute }: LodRequest,
  onMiss?: () => void,
  slot?: SlotTaker,
): Promise<LodAnswer> {
  const hit = await stored(disk, file);
  if (hit) return hit;
  if (inFlight.has(file)) return inFlight.share(file, compute);
  return underSlot(async () => {
    const meanwhile = await stored(disk, file);
    if (meanwhile) return meanwhile;
    if (!inFlight.has(file)) onMiss?.();
    return inFlight.share(file, compute);
  }, slot);
}
