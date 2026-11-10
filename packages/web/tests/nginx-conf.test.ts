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

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// The web image's server config (Dockerfile copies it to nginx's conf.d).
const CONF = readFileSync(new URL('../../../nginx.conf', import.meta.url), 'utf8');
const DOCKERFILE = readFileSync(new URL('../../../Dockerfile', import.meta.url), 'utf8');

/** The body of each `location [~] <pattern> { ... }` block, by pattern, nested `if` blocks included. */
function locations(conf: string): Map<string, string> {
  const found = new Map<string, string>();
  for (const match of conf.matchAll(/location\s+(?:~\s+)?(\S+)\s*\{/g)) {
    let depth = 1;
    let at = (match.index ?? 0) + match[0].length;
    const start = at;
    while (depth > 0 && at < conf.length) {
      if (conf[at] === '{') depth += 1;
      if (conf[at] === '}') depth -= 1;
      at += 1;
    }
    found.set(match[1] ?? '', conf.slice(start, at - 1));
  }
  return found;
}

describe('nginx.conf', () => {
  const blocks = locations(CONF);

  // add_header in a location drops every header set above it, so each one re-includes the snippet.
  it('sends the security headers from every location', () => {
    expect(blocks.size).toBeGreaterThanOrEqual(10);
    for (const [pattern, body] of blocks) {
      // The transcoder's worker takes its own snippet, the same headers but the CSP (VENT-101, below).
      if (pattern.includes('basis-worker')) continue;
      expect(body, pattern).toContain('include /etc/nginx/snippets/security-headers.conf;');
    }
  });

  it('caches the Moon maps for a day, not forever: they are not fingerprinted', () => {
    const textures = blocks.get('^/(app/)?textures/') ?? '';
    expect(textures).toContain('add_header Cache-Control "public, max-age=86400";');
    expect(textures).not.toContain('immutable');
  });

  // VENT-96: without a Cache-Control the browser guessed a lifetime from Last-Modified.
  it.each(['^/(app/)?thumbs/', '^/(app/)?icons/', '^/media/', '^/(app/)?site-films/'])('caches %s for a day and then revalidates: the names carry no hash', (path) => {
    const body = blocks.get(path) ?? '';
    expect(body).toContain('include /etc/nginx/snippets/security-headers.conf;');
    expect(body).toContain('add_header Cache-Control "public, max-age=86400";');
    expect(body).not.toContain('immutable');
  });
});

describe('the locale routes (VENT-35)', () => {
  it('serves each locale’s folder: /es/ is es/index.html', () => {
    expect(locations(CONF).get('/') ?? '').toMatch(/try_files \$uri \$uri\/ /);
  });

  it('builds the production image without the pseudo-locale page', () => {
    expect(DOCKERFILE).toMatch(/SITE_BASE=\/app PSEUDO_LOCALE=0 npm run build -w @ventana\/web/);
  });
});

describe('the installable app (VENT-28)', () => {
  /** The body of the regex location whose pattern is `pattern`. */
  const regexBlock = (pattern: string): string => {
    const at = CONF.indexOf(`location ~ ${pattern} {`);
    expect(at).toBeGreaterThanOrEqual(0);
    return CONF.slice(at, CONF.indexOf('\n  }', at));
  };

  it('serves the service worker uncached, with the security headers', () => {
    const block = regexBlock('(^|/)sw\\.js$');
    expect(block).toContain('add_header Cache-Control "no-cache";');
    expect(block).toContain('include /etc/nginx/snippets/security-headers.conf;');
  });

  it('serves the manifests as application/manifest+json, with the security headers', () => {
    const block = regexBlock('\\.webmanifest$');
    expect(block).toMatch(/types \{ \}\s+default_type application\/manifest\+json;/);
    expect(block).toContain('include /etc/nginx/snippets/security-headers.conf;');
  });
});

describe('the web image', () => {
  it('builds for the primary domain, nasa.universelle.io (VENT-76)', () => {
    expect(DOCKERFILE).toMatch(/^ARG SITE_URL=https:\/\/nasa\.universelle\.io$/m);
    expect(DOCKERFILE).toMatch(/SITE_URL="\$SITE_URL" SITE_BASE=\/app PSEUDO_LOCALE=0 npm run build -w @ventana\/web/);
    expect(DOCKERFILE).toMatch(/SITE_URL="\$SITE_URL" npm run build -w @ventana\/landing/);
  });
});

describe('the KTX2 maps and their transcoder (VENT-101)', () => {
  const WORKER_SNIPPET = readFileSync(new URL('../../../nginx-basis-worker-headers.conf', import.meta.url), 'utf8');
  const PAGE_SNIPPET = readFileSync(new URL('../../../nginx-security-headers.conf', import.meta.url), 'utf8');
  const regexBlock = (pattern: string): string => {
    const at = CONF.indexOf(`location ~ ${pattern} {`);
    expect(at, pattern).toBeGreaterThanOrEqual(0);
    return CONF.slice(at, CONF.indexOf('\n  }', at));
  };
  const headers = (snippet: string): string[] =>
    snippet.split('\n').filter((line) => line.startsWith('add_header') && !line.includes('Content-Security-Policy'));

  it('gzips the transcoder\'s wasm (527 kB, 245 kB gzipped), not the KTX2 maps, which gain nothing', () => {
    const types = /gzip_types ([^;]+);/.exec(CONF)?.[1]?.split(/\s+/) ?? [];
    expect(types).toContain('application/wasm');
    expect(types).not.toContain('image/ktx2');
  });

  it('caches the transcoder for good: its folder carries three\'s version', () => {
    const body = locations(CONF).get('^/(app/)?basis/') ?? '';
    expect(body).toContain('include /etc/nginx/snippets/security-headers.conf;');
    expect(body).toContain('add_header Cache-Control "public, max-age=31536000, immutable";');
  });

  it('serves the transcoder\'s worker under its own CSP, never the page\'s', () => {
    const pattern = '^/(app/)?_astro/basis-worker-[A-Za-z0-9_-]+\\.js$';
    const block = regexBlock(pattern);
    // Anchored at both ends: only the built worker file takes the eval-allowing CSP, never a map or a longer path.
    const matches = (path: string) => new RegExp(pattern).test(path);
    expect(matches('/_astro/basis-worker-QNbRvZpx.js')).toBe(true);
    expect(matches('/app/_astro/basis-worker-QNbRvZpx.js')).toBe(true);
    for (const path of ['/_astro/basis-worker-QNbRvZpx.js.map', '/_astro/basis-worker-a/b.js', '/_astro/basis-worker.js', '/x/_astro/basis-worker-a.js']) {
      expect(matches(path), path).toBe(false);
    }
    expect(block).toContain('include /etc/nginx/snippets/basis-worker-headers.conf;');
    expect(block).not.toContain('security-headers.conf');
    expect(block).toContain('add_header Cache-Control "public, max-age=31536000, immutable";');
    expect(WORKER_SNIPPET).toContain(
      `add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval'" always;`,
    );
    expect(WORKER_SNIPPET).not.toMatch(/^include /m);
  });

  it('gives the worker the same headers as every other response, but the CSP', () => {
    expect(headers(WORKER_SNIPPET)).toEqual(headers(PAGE_SNIPPET));
    expect(headers(PAGE_SNIPPET).length).toBeGreaterThanOrEqual(4);
  });

  it.each([
    ['^/(app/)?textures/.+\\.ktx2$', 'public, max-age=86400'],
    ['^/(app/)?_astro/.+\\.ktx2$', 'public, max-age=31536000, immutable'],
  ])('serves %s as image/ktx2, cached as its folder is', (pattern, cache) => {
    const block = regexBlock(pattern);
    expect(block).toMatch(/types \{ \}\s+default_type image\/ktx2;/);
    expect(block).toContain(`add_header Cache-Control "${cache}";`);
    expect(block).toContain('include /etc/nginx/snippets/security-headers.conf;');
  });

  it('puts the worker\'s snippet in the image', () => {
    expect(DOCKERFILE).toContain('COPY nginx-basis-worker-headers.conf /etc/nginx/snippets/basis-worker-headers.conf');
  });
});

describe('the landing at the root and the app under /app (VENT-109)', () => {
  const blocks = locations(CONF);
  const pages = blocks.get('^/((es|fr|de|it)/)?$') ?? '';

  it('caches the fingerprinted files of both builds for a year', () => {
    const body = blocks.get('^/(app/)?_astro/') ?? '';
    expect(body).toContain('add_header Cache-Control "public, max-age=31536000, immutable";');
    const pattern = new RegExp('^/(app/)?_astro/');
    expect(pattern.test('/_astro/landing.Ab12.js')).toBe(true);
    expect(pattern.test('/app/_astro/page.Ab12.js')).toBe(true);
  });

  it('keeps the transcoder worker and the KTX2 maps ahead of the generic _astro rule: nginx takes the first regex', () => {
    const at = (pattern: string) => CONF.indexOf(`location ~ ${pattern} {`);
    expect(at('^/(app/)?_astro/basis-worker-[A-Za-z0-9_-]+\\.js$')).toBeLessThan(at('^/(app/)?_astro/'));
    expect(at('^/(app/)?_astro/.+\\.ktx2$')).toBeLessThan(at('^/(app/)?_astro/'));
  });

  it('sends an old link that carries the app\'s place to the app, same locale and query', () => {
    expect(pages).toContain('if ($arg_site != "") { return 302 /app$uri$is_args$args; }');
    expect(pages).toContain('if ($arg_lat != "") { return 302 /app$uri$is_args$args; }');
    const pattern = new RegExp('^/((es|fr|de|it)/)?$');
    for (const path of ['/', '/es/', '/it/']) expect(pattern.test(path), path).toBe(true);
    for (const path of ['/app/', '/en-xa/', '/es/x', '//evil.test/']) expect(pattern.test(path), path).toBe(false);
  });

  it('serves the landing at the root and the app under /app, one CSP over both', () => {
    expect(DOCKERFILE).toContain('cp -R packages/landing/dist/. /site/ && cp -R packages/web/dist /site/app');
    expect(DOCKERFILE).toContain('node packages/web/scripts/csp-header.mjs /site > /app/csp.conf');
    expect(DOCKERFILE).toContain('COPY --from=build /site /usr/share/nginx/html');
  });

  it('redirects with relative locations, never naming nginx\'s own port', () => {
    expect(CONF).toMatch(/^\s*absolute_redirect off;$/m);
  });
});
