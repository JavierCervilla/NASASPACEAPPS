import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// The web image's server config (Dockerfile copies it to nginx's conf.d).
const CONF = readFileSync(new URL('../../../nginx.conf', import.meta.url), 'utf8');

/** The body of each `location <path> { ... }` block, by path. */
function locations(conf: string): Map<string, string> {
  const blocks = conf.matchAll(/location\s+(\S+)\s*\{([^}]*)\}/g);
  return new Map([...blocks].map((match) => [match[1] ?? '', match[2] ?? '']));
}

describe('nginx.conf', () => {
  const blocks = locations(CONF);

  // add_header in a location drops every header set above it, so each one re-includes the snippet.
  it('sends the security headers from every location', () => {
    expect(blocks.size).toBeGreaterThanOrEqual(3);
    for (const body of blocks.values()) {
      expect(body).toContain('include /etc/nginx/snippets/security-headers.conf;');
    }
  });

  it('caches the Moon maps for a day, not forever: they are not fingerprinted', () => {
    const textures = blocks.get('/textures/') ?? '';
    expect(textures).toContain('add_header Cache-Control "public, max-age=86400";');
    expect(textures).not.toContain('immutable');
  });
});
