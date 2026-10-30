// Prints the nginx `add_header Content-Security-Policy` line for a built site. The policy allows the inline scripts,
// inline style elements and style attributes Astro and React put in the HTML by their sha256 hash, never by
// 'unsafe-inline', so it has to be computed from the build: hard-coded hashes would break with the next content change.
// The web Dockerfile runs it after `astro build` and nginx includes its output in every location.
//   node packages/web/scripts/csp-header.mjs packages/web/dist > csp.conf
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const INLINE_SCRIPT = /<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/gi;
const STYLE_ELEMENT = /<style[^>]*>([\s\S]*?)<\/style>/gi;
const STYLE_ATTRIBUTE = /\sstyle=(?:"([^"]*)"|'([^']*)')/gi;
const ENTITIES = { '&amp;': '&', '&quot;': '"', '&#39;': "'", '&#x27;': "'", '&lt;': '<', '&gt;': '>' };

function htmlFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) return htmlFiles(join(dir, entry.name));
    return entry.name.endsWith('.html') ? [join(dir, entry.name)] : [];
  });
}

function hashes(html, pattern, decode) {
  return [...html.matchAll(pattern)].map((match) => {
    const raw = match[1] ?? match[2] ?? '';
    const text = decode ? raw.replace(/&(?:amp|quot|#39|#x27|lt|gt);/g, (e) => ENTITIES[e]) : raw;
    return `'sha256-${createHash('sha256').update(text, 'utf8').digest('base64')}'`;
  });
}

/**
 * The Content-Security-Policy for the given HTML: its inline scripts, style elements and style attributes allowed by
 * hash, everything else held to 'self' or 'none'.
 * @param {string} html
 * @returns {string}
 */
export function policyFor(html) {
  const unique = (list) => [...new Set(list)].join(' ');
  const scripts = unique(hashes(html, INLINE_SCRIPT, false));
  const styles = unique(hashes(html, STYLE_ELEMENT, false));
  const attributes = unique(hashes(html, STYLE_ATTRIBUTE, true));
  return [
    "default-src 'self'",
    `script-src 'self' ${scripts}`.trim(),
    `style-src 'self' ${styles}`.trim(),
    attributes ? `style-src-attr 'unsafe-hashes' ${attributes}` : "style-src-attr 'none'",
    "img-src 'self' data:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

/**
 * The nginx `add_header Content-Security-Policy` line for the built site in `dist`.
 * @param {string | undefined} dist
 * @returns {string}
 * @throws {Error} with a `csp-header:` message when `dist` is missing or holds no HTML: fail closed, an image without
 *   its policy must not build.
 */
export function cspHeaderLine(dist) {
  const isDir = dist ? statSync(dist, { throwIfNoEntry: false })?.isDirectory() : false;
  if (!isDir) throw new Error(`csp-header: build directory "${dist ?? ''}" is missing or not a directory`);
  const pages = htmlFiles(dist);
  if (pages.length === 0) throw new Error(`csp-header: no HTML under "${dist}"`);
  const html = pages.map((file) => readFileSync(file, 'utf8')).join('\n');
  return `add_header Content-Security-Policy "${policyFor(html)}" always;`;
}

// Compare real paths: Node resolves symlinks in import.meta.url, so a run
// through a symlink would otherwise skip the CLI and exit 0 with no policy.
const entry = process.argv[1] ? realpathSync(process.argv[1]) : null;
if (entry && import.meta.url === pathToFileURL(entry).href) {
  try {
    console.log(cspHeaderLine(process.argv[2]));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
