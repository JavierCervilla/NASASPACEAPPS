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

// Puts the project header (scripts/file-header.txt) at the top of every code
// file git tracks or would track (new files not yet added), or checks that it
// is there. Symlinks are skipped: they are not code, and writing through one
// could touch a file outside the repo.
//   node scripts/file-header.mjs --write    add or refresh the header
//   node scripts/file-header.mjs --check    exit 1 listing the files without it
//                                           or with a stray copy below it
//   node scripts/file-header.mjs --staged   the same check, staged files only
// The transformation lives in pure functions so the tests can drive it; the
// CLI at the bottom only reads git and the disk.
import { execFileSync } from 'node:child_process';
import { lstatSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/** The code files that carry the header, by extension. */
export const CODE_EXTENSIONS = ['.ts', '.tsx', '.js', '.mjs', '.cjs', '.astro', '.css', '.py', '.sh'];

/** The marker that identifies a copy of the header, current or outdated. */
export const HEADER_MARKER = 'SPDX-License-Identifier';

// Tooling and vendored code keep their own headers; build output and
// dependencies are not ours.
const EXCLUDED_PREFIXES = ['.claude/', '.english-gate/'];
const EXCLUDED_SEGMENTS = ['node_modules', 'dist'];
const EXCLUDED_FILES = ['eslint.anti-slop.mjs'];

const HASH_EXTENSIONS = ['.py', '.sh'];
// PEP 263: the encoding declaration must stay on the first or second line.
const PYTHON_CODING = /^[ \t\f]*#.*?coding[:=][ \t]*[-\w.]+/;
const FRONTMATTER_FENCE = '---';

/**
 * Whether the path is a code file that must carry the header.
 * @param {string} path repo-relative, with forward slashes
 * @returns {boolean}
 */
export function isHeaderTarget(path) {
  if (!CODE_EXTENSIONS.some((ext) => path.endsWith(ext))) return false;
  if (EXCLUDED_PREFIXES.some((prefix) => path.startsWith(prefix))) return false;
  if (EXCLUDED_FILES.includes(path)) return false;
  return !path.split('/').some((segment) => EXCLUDED_SEGMENTS.includes(segment));
}

/**
 * The comment style of a code file.
 * @param {string} path
 * @returns {'hash' | 'block' | 'astro'}
 */
export function styleFor(path) {
  if (HASH_EXTENSIONS.some((ext) => path.endsWith(ext))) return 'hash';
  return path.endsWith('.astro') ? 'astro' : 'block';
}

/**
 * The header body as a comment in the given style, without a final newline.
 * @param {string} body the template text
 * @param {'hash' | 'block' | 'astro'} style
 * @returns {string}
 */
export function renderHeader(body, style) {
  const lines = body.replace(/\n+$/, '').split('\n');
  if (style === 'hash') return lines.map((line) => (line ? `# ${line}` : '#')).join('\n');
  const inner = lines.map((line) => (line ? ` * ${line}` : ' *'));
  return ['/*', ...inner, ' */'].join('\n');
}

/**
 * The lines that must stay above the header: a shebang, and in Python an
 * encoding declaration; in Astro, the opening fence of the frontmatter.
 * @param {string[]} lines
 * @param {'hash' | 'block' | 'astro'} style
 * @param {string} path
 * @returns {number} how many leading lines to keep
 */
function prefixLength(lines, style, path) {
  if (style === 'astro') return lines[0] === FRONTMATTER_FENCE ? 1 : 0;
  let count = lines[0]?.startsWith('#!') ? 1 : 0;
  if (path.endsWith('.py') && PYTHON_CODING.test(lines[count] ?? '')) count += 1;
  return count;
}

/**
 * How many leading lines of `lines` are a copy of the header (recognised
 * by its SPDX line), or 0 when the leading comment is not one.
 * @param {string[]} lines
 * @param {'hash' | 'block' | 'astro'} style
 * @returns {number}
 */
function existingHeaderLength(lines, style) {
  let end = 0;
  if (style === 'hash') {
    while (end < lines.length && lines[end].startsWith('#')) end += 1;
  } else if (lines[0]?.trimStart().startsWith('/*')) {
    end = lines.findIndex((line) => line.includes('*/')) + 1;
  }
  return lines.slice(0, end).some((line) => line.includes(HEADER_MARKER)) ? end : 0;
}

// A comment line's text without its comment prefix, so a copy of the header
// is recognised whatever its indentation or comment style.
function bannerText(line) {
  return line.trim().replace(/^(\/\*|\*\/|\*|#)/, '').trim();
}

// A comment line with no text of its own: `/*`, ` *`, ` */` or `#`.
function isCommentSkeleton(line) {
  return line.trim() !== '' && bannerText(line) === '';
}

/**
 * `lines` without any copy of the header, whole or partial, that a botched
 * edit left behind: each run of comment lines holding at least one line of
 * the template, with one blank line kept where it stood.
 * @param {string[]} lines the code below the leading header
 * @param {string} body the template text
 * @returns {string[]}
 */
function withoutStrayBanners(lines, body) {
  const banner = new Set(body.split('\n').map((line) => line.trim()).filter(Boolean));
  const isBanner = (line) => banner.has(bannerText(line));
  const inRun = (line) => isBanner(line) || isCommentSkeleton(line);
  const out = [...lines];
  for (let hit = out.findIndex(isBanner); hit !== -1; hit = out.findIndex(isBanner)) {
    let start = hit;
    let end = hit + 1;
    while (start > 0 && inRun(out[start - 1])) start -= 1;
    while (end < out.length && inRun(out[end])) end += 1;
    out.splice(start, end - start);
    if (out[start]?.trim() === '' && (start === 0 || out[start - 1].trim() === '')) out.splice(start, 1);
  }
  return out;
}

/**
 * The source with the current header in place: added after any shebang or
 * encoding line (inside the frontmatter for Astro, which gets one if it has
 * none), replacing an outdated copy and dropping any stray copy left further
 * down, with one blank line before the code.
 * Applying it twice gives the same text.
 * @param {string} source
 * @param {string} path
 * @param {string} body the template text
 * @returns {string}
 */
export function applyHeader(source, path, body) {
  const style = styleFor(path);
  const lines = source.split('\n');
  const keep = prefixLength(lines, style, path);
  let rest = lines.slice(keep);
  rest = withoutStrayBanners(rest.slice(existingHeaderLength(rest, style)), body);
  while (rest.length > 0 && rest[0].trim() === '') rest.shift();
  const head = lines.slice(0, keep);
  if (style === 'astro' && keep === 0) {
    head.push(FRONTMATTER_FENCE);
    rest.unshift(FRONTMATTER_FENCE);
  }
  // A frontmatter that holds only the header closes right below it.
  const gap = style === 'astro' && rest[0] === FRONTMATTER_FENCE ? [] : [''];
  const code = rest.length === 0 ? [''] : [...gap, ...rest];
  return [...head, renderHeader(body, style), ...code].join('\n');
}

/**
 * Whether the source already carries the exact current header.
 * @param {string} source
 * @param {string} path
 * @param {string} body
 * @returns {boolean}
 */
export function hasCurrentHeader(source, path, body) {
  return applyHeader(source, path, body) === source;
}

/**
 * The paths among `paths` that are code files without the current header.
 * @param {string[]} paths
 * @param {(path: string) => string} read the file's content
 * @param {string} body
 * @returns {string[]}
 */
export function missingHeaders(paths, read, body) {
  return paths.filter((path) => isHeaderTarget(path) && !hasCurrentHeader(read(path), path, body));
}

/**
 * The code files among `paths`, once each and sorted, keeping only those
 * `isRegularFile` accepts (not symlinks, not missing).
 * @param {string[]} paths repo-relative
 * @param {(path: string) => boolean} isRegularFile
 * @returns {string[]}
 */
export function selectCodeFiles(paths, isRegularFile) {
  const unique = [...new Set(paths)].sort();
  return unique.filter((path) => isHeaderTarget(path) && isRegularFile(path));
}

// Regular files only: a symlink is 120000 and a submodule 160000.
const REGULAR_MODES = ['100644', '100755'];
const STAGED_STATUSES = ['A', 'M', 'T'];

/**
 * The staged code files with their blob ids, from the output of
 * `git diff --cached --raw -z --no-abbrev --no-renames`: added, modified or
 * retyped entries whose new version is a regular file.
 * @param {string} raw
 * @returns {{ path: string, blob: string }[]}
 */
export function parseStagedRaw(raw) {
  const fields = raw.split('\0');
  const staged = [];
  for (let i = 0; i + 1 < fields.length; i += 2) {
    const [, dstMode, , blob, status] = fields[i].replace(/^:/, '').split(' ');
    const path = fields[i + 1];
    if (!STAGED_STATUSES.includes(status?.[0] ?? '')) continue;
    if (REGULAR_MODES.includes(dstMode) && isHeaderTarget(path)) staged.push({ path, blob });
  }
  return staged;
}

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

function gitPaths(args) {
  return git(args).split('\0').filter(Boolean);
}

function report(missing) {
  if (missing.length === 0) return 0;
  console.error(
    `file-header: ${missing.length} code file(s) lack the header from scripts/file-header.txt`
      + ' or carry a stray copy of it:',
  );
  for (const path of missing) console.error(`  ${path}`);
  console.error('Run `npm run headers` to fix them.');
  return 1;
}

function isRegularFile(path) {
  return lstatSync(path, { throwIfNoEntry: false })?.isFile() ?? false;
}

function checkStaged(body) {
  const raw = git(['diff', '--cached', '--raw', '-z', '--no-abbrev', '--no-renames']);
  const staged = parseStagedRaw(raw);
  const blobs = new Map(staged.map(({ path, blob }) => [path, blob]));
  const read = (path) => git(['cat-file', 'blob', blobs.get(path)]);
  return report(missingHeaders([...blobs.keys()], read, body));
}

function run(mode) {
  const root = git(['rev-parse', '--show-toplevel']).trim();
  process.chdir(root);
  const body = readFileSync('scripts/file-header.txt', 'utf8');
  if (mode === '--staged') return checkStaged(body);
  const listed = [
    ...gitPaths(['ls-files', '-z']),
    ...gitPaths(['ls-files', '--others', '--exclude-standard', '-z']),
  ];
  const files = selectCodeFiles(listed, isRegularFile);
  const read = (path) => readFileSync(path, 'utf8');
  if (mode === '--check') return report(missingHeaders(files, read, body));
  for (const path of missingHeaders(files, read, body)) {
    writeFileSync(path, applyHeader(read(path), path, body));
    console.log(`file-header: ${path}`);
  }
  return 0;
}

const entry = process.argv[1] ? realpathSync(process.argv[1]) : null;
if (entry && import.meta.url === pathToFileURL(entry).href) {
  const mode = process.argv[2];
  if (!['--write', '--check', '--staged'].includes(mode ?? '')) {
    console.error('usage: node scripts/file-header.mjs --write | --check | --staged');
    process.exit(2);
  }
  process.exit(run(mode));
}
