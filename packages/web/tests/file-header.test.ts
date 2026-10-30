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
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  applyHeader,
  hasCurrentHeader,
  isHeaderTarget,
  missingHeaders,
  renderHeader,
} from '../../../scripts/file-header.mjs';

const SCRIPT = fileURLToPath(new URL('../../../scripts/file-header.mjs', import.meta.url));
const TEMPLATE = fileURLToPath(new URL('../../../scripts/file-header.txt', import.meta.url));

// A small stand-in for the template: a title, a blank line and the SPDX line.
const BODY = 'Title\n\nSPDX-License-Identifier: MIT\n';
const OLD_BODY = 'Old title\nSPDX-License-Identifier: MIT\n';
const BLOCK = '/*\n * Title\n *\n * SPDX-License-Identifier: MIT\n */';
const HASH = '# Title\n#\n# SPDX-License-Identifier: MIT';

describe('renderHeader', () => {
  it('writes a block comment with a bare star on blank lines', () => {
    expect(renderHeader(BODY, 'block')).toBe(BLOCK);
  });

  it('writes hash comments with a bare hash on blank lines', () => {
    expect(renderHeader(BODY, 'hash')).toBe(HASH);
  });
});

describe('applyHeader', () => {
  it('puts a block header first, one blank line above the code', () => {
    expect(applyHeader('export const a = 1;\n', 'a.ts', BODY)).toBe(`${BLOCK}\n\nexport const a = 1;\n`);
  });

  it('uses the block style for CSS', () => {
    expect(applyHeader(':root {}\n', 'a.css', BODY)).toBe(`${BLOCK}\n\n:root {}\n`);
  });

  it('uses hash comments for Python and shell', () => {
    expect(applyHeader('import os\n', 'a.py', BODY)).toBe(`${HASH}\n\nimport os\n`);
    expect(applyHeader('echo hi\n', 'a.sh', BODY)).toBe(`${HASH}\n\necho hi\n`);
  });

  it('keeps a shebang on the first line', () => {
    const source = '#!/usr/bin/env bash\nset -eu\n';
    expect(applyHeader(source, 'a.sh', BODY)).toBe(`#!/usr/bin/env bash\n${HASH}\n\nset -eu\n`);
    const node = '#!/usr/bin/env node\nrun();\n';
    expect(applyHeader(node, 'a.mjs', BODY)).toBe(`#!/usr/bin/env node\n${BLOCK}\n\nrun();\n`);
  });

  it('keeps a Python shebang and encoding line above the header', () => {
    const source = '#!/usr/bin/env python3\n# -*- coding: utf-8 -*-\nimport os\n';
    const expected = `#!/usr/bin/env python3\n# -*- coding: utf-8 -*-\n${HASH}\n\nimport os\n`;
    expect(applyHeader(source, 'a.py', BODY)).toBe(expected);
  });

  it('puts the header inside an existing Astro frontmatter', () => {
    const source = '---\nimport A from "./A";\n---\n<A />\n';
    expect(applyHeader(source, 'a.astro', BODY)).toBe(`---\n${BLOCK}\n\nimport A from "./A";\n---\n<A />\n`);
  });

  it('adds a frontmatter to an Astro file without one', () => {
    expect(applyHeader('<p>hi</p>\n', 'a.astro', BODY)).toBe(`---\n${BLOCK}\n---\n<p>hi</p>\n`);
  });

  it('is idempotent for every style', () => {
    const cases: [string, string][] = [
      ['export {};\n', 'a.ts'],
      ['#!/usr/bin/env bash\necho\n', 'a.sh'],
      ['---\nconst a = 1;\n---\n<p />\n', 'a.astro'],
      ['<p />\n', 'b.astro'],
      ['', 'empty.ts'],
    ];
    for (const [source, path] of cases) {
      const once = applyHeader(source, path, BODY);
      expect(applyHeader(once, path, BODY)).toBe(once);
      expect(hasCurrentHeader(once, path, BODY)).toBe(true);
    }
  });

  it('replaces an outdated header instead of stacking a second one', () => {
    const old = applyHeader('/** Doc. */\nexport {};\n', 'a.ts', OLD_BODY);
    expect(applyHeader(old, 'a.ts', BODY)).toBe(`${BLOCK}\n\n/** Doc. */\nexport {};\n`);
    const oldPy = applyHeader('#!/usr/bin/env python3\nimport os\n', 'a.py', OLD_BODY);
    expect(applyHeader(oldPy, 'a.py', BODY)).toBe(`#!/usr/bin/env python3\n${HASH}\n\nimport os\n`);
  });

  it('leaves a leading comment that is not the header in place', () => {
    const source = '# a comment\nimport os\n';
    expect(applyHeader(source, 'a.py', BODY)).toBe(`${HASH}\n\n# a comment\nimport os\n`);
  });
});

describe('missingHeaders', () => {
  it('lists the code files without the exact current header', () => {
    const files: Record<string, string> = {
      'ok.ts': applyHeader('export {};\n', 'ok.ts', BODY),
      'old.ts': applyHeader('export {};\n', 'old.ts', OLD_BODY),
      'none.css': 'a {}\n',
      'README.md': 'no header needed\n',
    };
    expect(missingHeaders(Object.keys(files), (path) => files[path] ?? '', BODY)).toEqual(['old.ts', 'none.css']);
  });

  it('skips tooling, vendored code, dependencies and build output', () => {
    for (const path of ['.claude/a.sh', '.english-gate/a.mjs', 'eslint.anti-slop.mjs', 'x/node_modules/a.js', 'x/dist/a.js']) {
      expect(isHeaderTarget(path)).toBe(false);
    }
    expect(isHeaderTarget('packages/web/src/a.tsx')).toBe(true);
  });
});

describe('the CLI on a git repo', () => {
  const git = (cwd: string, ...args: string[]) => spawnSync('git', args, { cwd, encoding: 'utf8' });
  const cli = (cwd: string, mode: string) => spawnSync(process.execPath, [join(cwd, 'scripts/file-header.mjs'), mode], { cwd, encoding: 'utf8' });

  function repoWithNewFile(): string {
    const dir = mkdtempSync(join(tmpdir(), 'file-header-'));
    mkdirSync(join(dir, 'scripts'));
    copyFileSync(SCRIPT, join(dir, 'scripts/file-header.mjs'));
    copyFileSync(TEMPLATE, join(dir, 'scripts/file-header.txt'));
    writeFileSync(join(dir, 'new.ts'), 'export const a = 1;\n');
    git(dir, 'init', '-q');
    git(dir, 'add', 'new.ts');
    return dir;
  }

  it('fails --check and --staged on a new file without the header, then passes after --write', () => {
    const dir = repoWithNewFile();
    const check = cli(dir, '--check');
    expect(check.status).toBe(1);
    expect(check.stderr).toContain('new.ts');
    expect(cli(dir, '--staged').status).toBe(1);
    expect(cli(dir, '--write').status).toBe(0);
    expect(readFileSync(join(dir, 'new.ts'), 'utf8')).toContain('SPDX-License-Identifier: MIT');
    expect(cli(dir, '--check').status).toBe(0);
    git(dir, 'add', 'new.ts');
    expect(cli(dir, '--staged').status).toBe(0);
  });

  it('rejects an unknown mode', () => {
    expect(cli(repoWithNewFile(), '--nope').status).toBe(2);
  });
});
