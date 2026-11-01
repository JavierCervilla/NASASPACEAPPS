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
 * The sites saved on this device (VENT-37): read once from storage, newest
 * first, kept again on every change. A save names a point of the Moon,
 * snapped to the server's grid, so a saved site is the custom point there
 * under a name; a point is saved once. Storage can be missing or refuse
 * access: then the sites hold for this page only and nothing breaks.
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
}

function readSaved(storage: ChoiceStorage | null): SavedSite[] {
  try {
    return parseSaved(storage?.getItem(SAVED_KEY) ?? null);
  } catch {
    return [];
  }
}

/** A watched list that keeps each new value in `storage`, if it can. */
function keptList(storage: ChoiceStorage | null) {
  const list = createWatchedValue<readonly SavedSite[]>(readSaved(storage));
  const set = (sites: readonly SavedSite[]): void => {
    list.set(sites);
    try {
      storage?.setItem(SAVED_KEY, serializeSaved(sites));
    } catch {
      // Refused storage: the sites hold for this page only.
    }
  };
  return { ...list, set };
}

/** Saves `point` as `name` at the head of `list`, unless it cannot be. */
function saveIn(
  list: ReturnType<typeof keptList>,
  point: LatLon,
  name: string,
  now: () => number,
): SaveResult {
  const snapped = snapPoint(point);
  const clean = cleanName(name);
  if (!snapped || !clean) return { kind: 'invalid' };
  const id = customId(snapped);
  const known = list.get().find((site) => site.id === id);
  if (known) return { kind: 'exists', site: known };
  if (list.get().length >= SAVED_CAP) return { kind: 'full' };
  const site = { id, name: clean, ...snapped, savedAt: now() };
  list.set([site, ...list.get()]);
  return { kind: 'saved', site };
}

/** Puts `removed` back at its place in `list`, if its point is free. */
function restoreIn(
  list: ReturnType<typeof keptList>,
  { site, index }: Removed,
): boolean {
  const sites = list.get();
  const taken = sites.some(({ id }) => id === site.id);
  if (taken || sites.length >= SAVED_CAP) return false;
  list.set([...sites.slice(0, index), site, ...sites.slice(index)]);
  return true;
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
    if (!clean || !find(id)) return;
    list.set(list.get().map((s) => (s.id === id ? { ...s, name: clean } : s)));
  };
  const remove = (id: string): Removed | null => {
    const index = list.get().findIndex((site) => site.id === id);
    const site = list.get()[index];
    if (!site) return null;
    list.set(list.get().filter((s) => s.id !== id));
    return { site, index };
  };
  const restore = (removed: Removed) => restoreIn(list, removed);
  const { get, subscribe } = list;
  return { get, subscribe, find, save, rename, remove, restore };
}
