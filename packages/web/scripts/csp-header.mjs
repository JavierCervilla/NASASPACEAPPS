// Prints the nginx `add_header Content-Security-Policy` line for a built site. The policy allows the inline scripts,
// inline style elements and style attributes Astro and React put in the HTML by their sha256 hash, never by
// 'unsafe-inline', so it has to be computed from the build: hard-coded hashes would break with the next content change.
// The web Dockerfile runs it after `astro build` and nginx includes its output in every location.
//   node packages/web/scripts/csp-header.mjs packages/web/dist > csp.conf
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

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

const dist = process.argv[2];
const pages = dist ? htmlFiles(dist) : [];
if (pages.length === 0) {
  // Fail closed: an image without its policy must not build.
  console.error(`csp-header: no HTML under "${dist ?? ''}"`);
  process.exit(1);
}
const html = pages.map((file) => readFileSync(file, 'utf8')).join('\n');
const unique = (list) => [...new Set(list)].join(' ');
const scripts = unique(hashes(html, INLINE_SCRIPT, false));
const styles = unique(hashes(html, STYLE_ELEMENT, false));
const attributes = unique(hashes(html, STYLE_ATTRIBUTE, true));

const policy = [
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
console.log(`add_header Content-Security-Policy "${policy}" always;`);
