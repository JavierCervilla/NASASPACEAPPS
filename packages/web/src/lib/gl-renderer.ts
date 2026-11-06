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
 * The one place the page makes a WebGL renderer (VENT-69), so the marks of
 * gl-memory.ts are kept the same for the globe and the on-foot view: a made
 * context marks `ventana.glWorked`, a lost one `ventana.glLostAt` (a context
 * the page frees on purpose does not), and one that cannot be made throws a
 * {@link GlUnavailableError} that says whether the browser blocked it,
 * with the browser's own message kept for the report. Three checks each
 * shader it links only where the dev tools run (VENT-93): reading the info
 * logs right after the link makes the driver finish the compile on the
 * spot, 1.47 s on the VENT-80 phone profile, and stalls the on-foot view's
 * programs that `compileAsync` does not reach (its ring meshes) the same way.
 */
import { WebGLRenderer, type WebGLRendererParameters } from 'three';
import { devToolsWanted } from './dev-tools-loader';
import { GL_LOST_KEY, GL_WORKED_KEY, glStorage, markGl } from './gl-marks';
import {
  GlUnavailableError,
  classifyGlFailure,
  hasGlConstructors,
} from './gl-memory';

/** The lost-context mark of each canvas, so a release can take it off. */
const lossMarks = new WeakMap<HTMLCanvasElement, () => void>();

/** What the browser's `webglcontextcreationerror` event carries. */
type CreationError = Event & { readonly statusMessage?: string | undefined };

/** A renderer on a new canvas; throws {@link GlUnavailableError}. */
export function createGlRenderer(
  parameters: WebGLRendererParameters,
): WebGLRenderer {
  const canvas = document.createElement('canvas');
  let statusMessage: string | undefined;
  canvas.addEventListener('webglcontextcreationerror', (event) => {
    statusMessage = (event as CreationError).statusMessage;
  });
  const storage = glStorage();
  try {
    const renderer = new WebGLRenderer({ ...parameters, canvas });
    renderer.debug.checkShaderErrors = devToolsWanted();
    markGl(storage, GL_WORKED_KEY, Date.now());
    const lost = (): void => markGl(storage, GL_LOST_KEY, Date.now());
    canvas.addEventListener('webglcontextlost', lost);
    lossMarks.set(canvas, () =>
      canvas.removeEventListener('webglcontextlost', lost));
    return renderer;
  } catch (error) {
    const kind = classifyGlFailure({ constructors: hasGlConstructors(),
      storage });
    throw new GlUnavailableError(kind, statusMessage, error);
  }
}

/** Frees `renderer` and its context on purpose: that is no loss to mark. */
export function releaseRenderer(renderer: WebGLRenderer): void {
  lossMarks.get(renderer.domElement)?.();
  renderer.dispose();
  renderer.forceContextLoss();
}
