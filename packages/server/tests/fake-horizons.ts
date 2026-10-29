/** A fake `fetch` that answers Horizons requests from the recorded fixtures, and counts the calls. */
import { readFileSync } from 'node:fs';
import type { FetchLike } from '../src/horizons/client.ts';

const DIR = new URL('../../sim/tests/fixtures/horizons/', import.meta.url);

interface ManifestEntry {
  readonly file: string;
  readonly params: Record<string, string>;
}

const manifest = JSON.parse(readFileSync(new URL('manifest.json', DIR), 'utf8')) as ManifestEntry[];

/** Responses keyed by the sorted query string of the request that recorded them. */
const bodies = new Map(
  manifest.map((entry) => [
    new URLSearchParams(Object.entries(entry.params).sort()).toString(),
    readFileSync(new URL(entry.file, DIR), 'utf8'),
  ]),
);

/** A fetch that serves the fixtures; any other request gets a Horizons-style error. `calls` lists every URL. */
export function fixtureFetch(): FetchLike & { calls: string[] } {
  const calls: string[] = [];
  const fake = async (url: string) => {
    calls.push(url);
    const query = new URLSearchParams(new URL(url).search);
    query.sort();
    const body = bodies.get(query.toString());
    if (body === undefined) {
      return { ok: true, status: 200, text: async () => JSON.stringify({ result: 'No ephemeris for target "x"' }) };
    }
    return { ok: true, status: 200, text: async () => body };
  };
  return Object.assign(fake, { calls });
}

/** A fetch that always answers with the given status and body. */
export function fixedFetch(status: number, body: string): FetchLike & { calls: string[] } {
  const calls: string[] = [];
  const fake = async (url: string) => {
    calls.push(url);
    return { ok: status >= 200 && status < 300, status, text: async () => body };
  };
  return Object.assign(fake, { calls });
}
