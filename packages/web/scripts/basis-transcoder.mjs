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

// three's Basis Universal transcoder for the KTX2 maps (VENT-101): an Astro integration that copies
// `basis_transcoder.js` and `.wasm` from three (Apache-2.0, `examples/jsm/libs/basis/`) into `dist/basis/<three
// version>/` after every build, and serves them there in the dev server; nothing is committed. The worker
// (src/textures/basis-worker.ts) finds the folder by the same version, defined at build as __THREE_VERSION__. The
// folder carries the version, so nginx caches it for good; the files are not precached (the service worker keeps them
// cache first the first time the worker asks).
import { copyFileSync, createReadStream, mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** three's package folder: its main file is `build/three.cjs`. */
const THREE_ROOT = dirname(dirname(createRequire(import.meta.url).resolve('three')));
const SOURCE = join(THREE_ROOT, 'examples/jsm/libs/basis');

export const THREE_VERSION = JSON.parse(readFileSync(join(THREE_ROOT, 'package.json'), 'utf8')).version;
export const TRANSCODER_FILES = ['basis_transcoder.js', 'basis_transcoder.wasm'];

/** The transcoder's folder under the site's root. */
export const basisDir = () => `basis/${THREE_VERSION}/`;

/** Copies the transcoder into `dist`; returns the copied paths under it. */
export function copyTranscoder(dist) {
  mkdirSync(join(dist, basisDir()), { recursive: true });
  return TRANSCODER_FILES.map((file) => {
    copyFileSync(join(SOURCE, file), join(dist, basisDir(), file));
    return `${basisDir()}${file}`;
  });
}

/** The dev server's answer for the transcoder's two files. */
const devFiles = (base) => ({
  name: 'ventana-basis-transcoder-dev',
  configureServer(server) {
    server.middlewares.use((request, response, next) => {
      const file = TRANSCODER_FILES.find((name) => request.url === `${base}${basisDir()}${name}`);
      if (!file) return next();
      response.setHeader('Content-Type', file.endsWith('.wasm') ? 'application/wasm' : 'text/javascript');
      createReadStream(join(SOURCE, file)).pipe(response);
    });
  },
});

/** The Astro integration; list it before the service worker's, which hashes what the build left in dist. */
export function basisTranscoder(base = '/') {
  return {
    name: 'ventana-basis-transcoder',
    hooks: {
      'astro:config:setup': ({ updateConfig }) => {
        updateConfig({
          vite: { define: { __THREE_VERSION__: JSON.stringify(THREE_VERSION) }, plugins: [devFiles(base)] },
        });
      },
      'astro:build:done': ({ dir, logger }) => {
        const copied = copyTranscoder(fileURLToPath(dir));
        logger?.info(`basis transcoder: ${copied.join(', ')}`);
      },
    },
  };
}
