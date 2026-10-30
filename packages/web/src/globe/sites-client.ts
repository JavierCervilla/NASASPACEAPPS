/**
 * Loads the landing sites from the API at runtime. Without the API (a local
 * preview, the e2e run, an outage) the globe still works with no markers, so
 * a failure is one console warning, never an error.
 */
import type { GlobeSite } from './markers';

export interface SitesSource {
  readonly fetch: typeof fetch;
  /** Same origin in production: `/api/v1/sites`. */
  readonly url: string;
  readonly warn: (message: string) => void;
}

function isGlobeSite(value: unknown): value is GlobeSite {
  const v = value as Partial<Record<keyof GlobeSite, unknown>> | null;
  return (
    typeof v === 'object' &&
    v !== null &&
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    Number.isFinite(v.lat) &&
    Number.isFinite(v.lonEast) &&
    typeof v.approximate === 'boolean'
  );
}

/** The sites of an API body (`{ sites: Site[] }`), or null if malformed. */
export function parseSiteList(body: unknown): GlobeSite[] | null {
  const sites = (body as { sites?: unknown } | null)?.sites;
  if (!Array.isArray(sites) || !sites.every(isGlobeSite)) return null;
  return sites.map(({ id, name, lat, lonEast, approximate }) => ({
    id,
    name,
    lat,
    lonEast,
    approximate,
  }));
}

/** The sites, or an empty list after one warning when they cannot load. */
export async function loadSites(source: SitesSource): Promise<GlobeSite[]> {
  try {
    const response = await source.fetch(source.url, {
      headers: { accept: 'application/json' },
    });
    const sites = response.ok ? parseSiteList(await response.json()) : null;
    if (sites) return sites;
    source.warn(`Ventana Lunar: no landing sites from ${source.url} (HTTP ${response.status}); the globe shows none.`);
  } catch (error) {
    source.warn(`Ventana Lunar: no landing sites from ${source.url} (${String(error)}); the globe shows none.`);
  }
  return [];
}
