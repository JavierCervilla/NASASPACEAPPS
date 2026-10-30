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

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';
import { cspHeaderLine, policyFor } from '../scripts/csp-header.mjs';

const SCRIPT = fileURLToPath(new URL('../scripts/csp-header.mjs', import.meta.url));

const sha = (text: string): string => `'sha256-${createHash('sha256').update(text, 'utf8').digest('base64')}'`;

let dist: string;
beforeEach(() => {
  dist = mkdtempSync(join(tmpdir(), 'csp-header-'));
});

/** Writes a page under the temp dist, creating its folders. */
function page(path: string, html: string): void {
  const file = join(dist, path);
  mkdirSync(join(file, '..'), { recursive: true });
  writeFileSync(file, html, 'utf8');
}

/** Runs the script the way the web Dockerfile does. */
const runCli = (dir: string) => spawnSync(process.execPath, [SCRIPT, dir], { encoding: 'utf8' });

describe('csp-header', () => {
  it('fails closed when the build has no HTML', () => {
    writeFileSync(join(dist, 'app.js'), 'console.log(1)', 'utf8');
    expect(() => cspHeaderLine(dist)).toThrow(/no HTML/);
    const run = runCli(dist);
    expect(run.status).not.toBe(0);
    expect(run.stdout).toBe('');
  });

  it('still prints the policy when run through a symlink', () => {
    page('index.html', '<p>hi</p>');
    const link = join(mkdtempSync(join(tmpdir(), 'csp-link-')), 'link.mjs');
    symlinkSync(SCRIPT, link);
    const run = spawnSync(process.execPath, [link, dist], { encoding: 'utf8' });
    expect(run.status).toBe(0);
    expect(run.stdout).toMatch(/^add_header Content-Security-Policy /);
  });

  it('reports a missing directory with its own message, not an ENOENT stack', () => {
    const missing = join(dist, 'nope');
    expect(() => cspHeaderLine(missing)).toThrow(/^csp-header: /);
    const run = runCli(missing);
    expect(run.status).toBe(1);
    expect(run.stderr.trim()).toMatch(/^csp-header: .*nope/);
    expect(run.stderr).not.toMatch(/\n\s+at /);
  });

  it('hashes inline scripts, style elements and entity-decoded style attributes', () => {
    page('index.html', '<script>run()</script><script src="/a.js"></script><style>a{color:red}</style>');
    page('deep/page/index.html', `<div style="font-family:&quot;X&quot; &amp; y"></div><p style='top:0'></p>`);
    const line = cspHeaderLine(dist);
    expect(line).toContain(`script-src 'self' ${sha('run()')};`);
    expect(line).toContain(`style-src 'self' ${sha('a{color:red}')};`);
    expect(line).toContain(`style-src-attr 'unsafe-hashes' ${sha('font-family:"X" & y')} ${sha('top:0')};`);
    expect(line).toMatch(/^add_header Content-Security-Policy ".*" always;$/);
    expect(runCli(dist).stdout).toBe(`${line}\n`);
  });

  it('never allows unsafe-inline', () => {
    const policy = policyFor('<script>x()</script><style>b{}</style><i style="c:d"></i>');
    expect(policy).not.toContain("'unsafe-inline'");
  });

  it('falls back to strict defaults with no inline content', () => {
    expect(policyFor('<html><body><script src="/a.js"></script></body></html>')).toBe(
      [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self'",
        "style-src-attr 'none'",
        "img-src 'self' data:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
      ].join('; '),
    );
  });
});
