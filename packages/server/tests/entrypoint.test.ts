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
 * The API image's entrypoint (VENT-43, VENT-44): its `allowed` guard, run
 * alone under dash (the image's /bin/sh) and bash, never the whole script,
 * which would change owners on this machine.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const script = readFileSync(join(import.meta.dirname, '..', 'docker-entrypoint.sh'), 'utf8');
const guard = /^allowed\(\) \{\n[\s\S]*?^\}$/m.exec(script)?.[0] ?? '';

/** Whether `shell` lets `path` through the guard. */
function allowedBy(shell: string, path: string): boolean {
  const code = `${guard}\nif allowed "$1"; then echo yes; else echo no; fi`;
  return execFileSync(shell, ['-c', code, 'sh', path], { encoding: 'utf8' }).trim() === 'yes';
}

describe.each(['dash', 'bash'])('docker-entrypoint.sh allowed() under %s', (shell) => {
  it('finds the guard in the script', () => {
    expect(guard).toContain('allowed()');
  });

  it.each(['/data/terrain', '/data/terrain/', '/var/cache/horizons', '/data/terrain/tiles'])('accepts %s', (path) => {
    expect(allowedBy(shell, path)).toBe(true);
  });

  it.each(['/data//', '/data/./', '/data/.', '/data/..', '/data/../etc', '/var/cache//', '/var/cache/./', '/data/', '/data', '/', '/etc', '', 'data/terrain', '/data/terrain/../..'])(
    'refuses %j',
    (path) => {
      expect(allowedBy(shell, path)).toBe(false);
    },
  );
});
