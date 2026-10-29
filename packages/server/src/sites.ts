/** The landing sites file: metadata of every site the API knows by id. */
import { readFile } from 'node:fs/promises';
import type { Site, SourceRef } from '@ventana/sim';

/** Default location of the sites file, next to the compiled or source code: `packages/server/data/sites.json`. */
export const DEFAULT_SITES_FILE = new URL('../data/sites.json', import.meta.url);

function isString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function isSource(value: unknown): value is SourceRef {
  const v = value as Partial<SourceRef> | null;
  return typeof v === 'object' && v !== null && isString(v.label) && isString(v.url);
}

function checkSite(value: unknown, index: number): Site {
  const v = value as Partial<Record<keyof Site, unknown>> | null;
  const fail = (field: string): never => {
    throw new TypeError(`sites file: entry ${index} has an invalid "${field}"`);
  };
  if (typeof v !== 'object' || v === null) return fail('entry');
  for (const field of ['id', 'name', 'mission', 'agency', 'status', 'coordinateNote'] as const) {
    if (!isString(v[field])) fail(field);
  }
  if (!/^[a-z0-9-]+$/.test(v.id as string)) fail('id');
  if (typeof v.lat !== 'number' || v.lat < -90 || v.lat > 90) fail('lat');
  if (typeof v.lonEast !== 'number' || v.lonEast < -180 || v.lonEast > 360) fail('lonEast');
  if (!Array.isArray(v.sources) || !v.sources.every(isSource)) fail('sources');
  return v as Site;
}

/**
 * Checks the parsed content of a sites file: an array of {@link Site} with unique ids.
 *
 * @throws TypeError naming the first invalid entry and field.
 */
export function parseSites(json: unknown): Site[] {
  if (!Array.isArray(json)) throw new TypeError('sites file: the top level must be an array');
  const sites = json.map(checkSite);
  const ids = new Set(sites.map((site) => site.id));
  if (ids.size !== sites.length) throw new TypeError('sites file: ids must be unique');
  return sites;
}

/** Reads and checks a sites file. */
export async function loadSites(path: URL | string): Promise<Site[]> {
  return parseSites(JSON.parse(await readFile(path, 'utf8')));
}
