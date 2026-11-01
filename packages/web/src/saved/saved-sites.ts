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
 * The sites saved on this device (VENT-37), newest first. Another tab may
 * change them at any time, so every change starts from what storage holds
 * then (merged by id: a change touches only its own site) and `refresh`
 * takes in another tab's change (the page calls it on `storage` events).
 * A save names a point of the Moon, snapped to the server's grid, so a
 * saved site is the custom point there under a name; a point is saved
 * once. Storage can be missing or refuse access: then the sites hold for
 * this page only and nothing breaks.
 */
import type { ChoiceStorage } from '../i18n/choice';
import type { LatLon } from '../lib/polar-projection';
import {
  createWatchedValue,
  type WatchedValue,
} from '../lib/watched-value';
import { customId, snapPoint } from '../pin/custom-point';
import {
  cleanName,
  parseSaved,
  SAVED_CAP,
  serializeSaved,
  type SavedSite,
} from './saved-schema';

/** Where the sites are kept. */
export const SAVED_KEY = 'ventana.savedSites';

export type SaveResult =
  | { readonly kind: 'saved' | 'exists'; readonly site: SavedSite }
  | { readonly kind: 'full' | 'invalid' };

/** A deleted site and where it stood, so it can be put back. */
export interface Removed {
  readonly site: SavedSite;
  readonly index: number;
}

export interface SavedSites extends Pick<
  WatchedValue<readonly SavedSite[]>,
  'get' | 'subscribe'
> {
  /** The saved site `id` (a custom point's id), if there is one. */
  find(id: string): SavedSite | null;
  save(point: LatLon, name: string): SaveResult;
  /** Renames `id`; an empty name keeps the old one. */
  rename(id: string, name: string): void;
  /** Deletes `id`; null when it is not saved. */
  remove(id: string): Removed | null;
  /** Puts a deleted site back where it was; false when it cannot be. */
  restore(removed: Removed): boolean;
  /** Reads storage again: another tab may have changed it. */
  refresh(): void;
}

/**
 * A watched list over `storage`: `fresh` is the latest list (storage's,
 * or this page's when storage cannot be read) and `set` keeps a new one.
 */
function keptList(storage: ChoiceStorage | null) {
  // Null when there is no storage or it refuses.
  const readKept = (): SavedSite[] | null => {
    if (!storage) return null;
    try {
      return parseSaved(storage.getItem(SAVED_KEY));
    } catch {
      return null;
    }
  };
  const list = createWatchedValue<readonly SavedSite[]>(readKept() ?? []);
  const fresh = (): readonly SavedSite[] => {
    const kept = readKept();
    const same = kept && serializeSaved(kept) === serializeSaved(list.get());
    if (kept && !same) list.set(kept);
    return list.get();
  };
  const set = (sites: readonly SavedSite[]): void => {
    list.set(sites);
    try {
      storage?.setItem(SAVED_KEY, serializeSaved(sites));
    } catch {
      // Refused storage: the sites hold for this page only.
    }
  };
  return { get: list.get, subscribe: list.subscribe, fresh, set };
}

type KeptList = ReturnType<typeof keptList>;

/**
 * Saves `point` as `name` at the head of `list`, unless it cannot be: a
 * list at the cap (or past it, from older storage) takes no new site.
 */
function saveIn(
  list: KeptList,
  point: LatLon,
  name: string,
  now: () => number,
): SaveResult {
  const snapped = snapPoint(point);
  const clean = cleanName(name);
  if (!snapped || !clean) return { kind: 'invalid' };
  const id = customId(snapped);
  const sites = list.fresh();
  const known = sites.find((site) => site.id === id);
  if (known) return { kind: 'exists', site: known };
  if (sites.length >= SAVED_CAP) return { kind: 'full' };
  const site = { id, name: clean, ...snapped, savedAt: now() };
  list.set([site, ...sites]);
  return { kind: 'saved', site };
}

/**
 * Puts `removed` back at its place in `list`, if its point is free. An
 * undo is never refused for the cap: it gives back what was there.
 */
function restoreIn(list: KeptList, { site, index }: Removed): boolean {
  const sites = list.fresh();
  if (sites.some(({ id }) => id === site.id)) return false;
  list.set([...sites.slice(0, index), site, ...sites.slice(index)]);
  return true;
}

/** Deletes `id` from `list`; null when it is not saved. */
function removeIn(list: KeptList, id: string): Removed | null {
  const sites = list.fresh();
  const index = sites.findIndex((site) => site.id === id);
  const site = sites[index];
  if (!site) return null;
  list.set(sites.filter((s) => s.id !== id));
  return { site, index };
}

/** The saved sites in `storage`; `now` stamps each save. */
export function createSavedSites(
  storage: ChoiceStorage | null,
  now: () => number = Date.now,
): SavedSites {
  const list = keptList(storage);
  const find = (id: string): SavedSite | null =>
    list.get().find((site) => site.id === id) ?? null;
  const save = (point: LatLon, name: string) => saveIn(list, point, name, now);
  const rename = (id: string, name: string): void => {
    const clean = cleanName(name);
    const sites = list.fresh();
    if (!clean || !sites.some((s) => s.id === id)) return;
    list.set(sites.map((s) => (s.id === id ? { ...s, name: clean } : s)));
  };
  const remove = (id: string) => removeIn(list, id);
  const restore = (removed: Removed) => restoreIn(list, removed);
  const refresh = (): void => void list.fresh();
  const { get, subscribe } = list;
  return { get, subscribe, find, save, rename, remove, restore, refresh };
}
