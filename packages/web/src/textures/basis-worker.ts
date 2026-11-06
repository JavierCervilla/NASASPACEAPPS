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
 * The KTX2 transcoder worker (VENT-101): a classic worker that loads three's
 * Basis Universal transcoder (copied at build to `basis/<three version>/` by
 * scripts/basis-transcoder.mjs) and turns each map it is sent into the GPU's
 * format (basis-transcode.ts), one at a time, answering under the ask's id.
 *
 * The transcoder's glue builds functions with `new Function` (embind), which
 * the page's CSP forbids. A worker runs under the CSP of its own script's
 * response, so nginx gives this file alone `'unsafe-eval'` and
 * `'wasm-unsafe-eval'` (nginx-basis-worker-headers.conf); the page's policy
 * is unchanged. It has no DOM and reads only same-origin files. Where a
 * browser applies the page's policy instead, the transcoder fails to load,
 * every ask is answered with the reason, and the page keeps its JPEG maps.
 */
import type { Ktx2Target } from '../globe/ktx2-target';
import { transcodeKtx2, type BasisModule } from './basis-transcode';
import type { TranscodeAnswer, TranscodeAsk } from './ktx2-image';

/** three's version, set at build (scripts/basis-transcoder.mjs). */
declare const __THREE_VERSION__: string;
/** A classic worker's script loader. */
declare const importScripts: (...urls: string[]) => void;
/** The transcoder's factory, defined by its script. */
declare const BASIS: (options: { wasmBinary: ArrayBuffer }) =>
  Promise<BasisModule & { initializeBasis(): void }>;

/** The worker's own scope, as much of it as is used. */
interface Scope {
  readonly location: { readonly href: string };
  postMessage(answer: TranscodeAnswer, transfer: Transferable[]): void;
  onmessage: ((event: MessageEvent<TranscodeAsk>) => void) | null;
}

const scope = self as unknown as Scope;

/** The transcoder, beside the worker's folder (`_astro/`, `basis/`). */
async function loadTranscoder(): Promise<BasisModule> {
  const dir = new URL(`../basis/${__THREE_VERSION__}/`, scope.location.href);
  importScripts(new URL('basis_transcoder.js', dir).href);
  const wasm = await fetch(new URL('basis_transcoder.wasm', dir));
  if (!wasm.ok) throw new Error(`transcoder wasm: HTTP ${wasm.status}`);
  const basis = await BASIS({ wasmBinary: await wasm.arrayBuffer() });
  basis.initializeBasis();
  return basis;
}

const transcoder = loadTranscoder();
// Each ask reports the failure; untouched, it must not be an error event.
transcoder.catch(() => undefined);

/** Transcodes one ask and answers it, its levels transferred. */
async function answer(id: number, buffer: ArrayBuffer, target: Ktx2Target) {
  try {
    const image = transcodeKtx2(await transcoder, new Uint8Array(buffer),
      target);
    const buffers = image.levels.map((level) => level.data.buffer);
    scope.postMessage({ id, ok: true, image }, buffers as ArrayBuffer[]);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    scope.postMessage({ id, ok: false, error: reason }, []);
  }
}

let queue = Promise.resolve();
scope.onmessage = ({ data }) => {
  queue = queue.then(() => answer(data.id, data.buffer, data.target));
};
