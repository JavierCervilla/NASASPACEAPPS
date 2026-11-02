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
 * Where the terrain stands, tier by tier (VENT-43), for
 * `GET /api/v1/terrain/status`: installed, being fetched with its bytes,
 * queued, missing or failed, and whether a fetch runs. Ids and numbers
 * only: no path, no URL and no error text reach the answer.
 */
import { tierBytes, type Tier } from './catalogue.ts';

export type TierState =
  | 'installed'
  | 'fetching'
  | 'queued'
  | 'missing'
  | 'failed';

/** Why a fetch stopped before the end. */
export type StopReason = 'disk' | 'notWritable' | 'locked';

export type FetchState = 'off' | 'running' | 'done' | 'stopped';

export interface TierStatus {
  readonly id: string;
  readonly state: TierState;
  readonly bytesDone: number;
  readonly bytesTotal: number;
}

export interface TerrainStatusBody {
  readonly fetch: FetchState;
  readonly reason?: StopReason;
  readonly tiers: readonly TierStatus[];
}

interface Entry {
  state: TierState;
  bytesDone: number;
  readonly bytesTotal: number;
}

/** The state of every tier of a catalogue, changed as the fetch goes. */
export class FetchStatus {
  private readonly tiers = new Map<string, Entry>();
  private fetch: FetchState = 'off';
  private reason: StopReason | undefined;

  constructor(tiers: readonly Tier[], present: readonly string[]) {
    for (const tier of tiers) {
      const bytesTotal = tierBytes(tier);
      const installed = present.includes(tier.id);
      this.tiers.set(tier.id, {
        state: installed ? 'installed' : 'missing',
        bytesDone: installed ? bytesTotal : 0,
        bytesTotal,
      });
    }
  }

  /** Marks tier `id` as `state`, its bytes done when installed. */
  set(id: string, state: TierState): void {
    const entry = this.tiers.get(id);
    if (!entry) return;
    entry.state = state;
    if (state === 'installed') entry.bytesDone = entry.bytesTotal;
  }

  /** The bytes of tier `id` on disk so far. */
  bytes(id: string, done: number): void {
    const entry = this.tiers.get(id);
    if (entry) entry.bytesDone = Math.min(done, entry.bytesTotal);
  }

  /**
   * The fetch as a whole; `reason` when it stopped early, and then the
   * tiers it had not finished are missing again.
   */
  run(state: FetchState, reason?: StopReason): void {
    this.fetch = state;
    this.reason = reason;
    if (state !== 'stopped') return;
    for (const entry of this.tiers.values()) {
      const pending = entry.state === 'queued' || entry.state === 'fetching';
      if (pending) entry.state = 'missing';
    }
  }

  snapshot(): TerrainStatusBody {
    const tiers = [...this.tiers].map(([id, e]) => ({ id, ...e }));
    const base = { fetch: this.fetch, tiers };
    return this.reason ? { ...base, reason: this.reason } : base;
  }
}
