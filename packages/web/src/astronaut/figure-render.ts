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
 * Draws the astronaut's pictures from the model (public/models/
 * astronaut.glb, built by scripts/astronaut.mjs) once, with a WebGL
 * renderer of its own that is released as soon as they are drawn: one
 * picture per pose and visor colour (figure-types.ts). This module, with
 * the glTF loader, loads only when the page asks for the pictures
 * (figure-load.ts), and the model needs no decoder (the CSP allows no
 * WebAssembly). Each picture waits for its own slice (`slice`), so the
 * work never blocks the page in one piece. The time it takes is measured
 * as «astronaut-figures» (Performance API).
 */
import {
  ACESFilmicToneMapping,
  SRGBColorSpace,
  TextureLoader,
  WebGLRenderer,
  type Material,
  type Mesh,
  type Object3D,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { figureScene, type FigureScene } from './figure-scene';
import {
  PICTURE,
  POSES,
  VISORS,
  type FigureImages,
  type Visor,
} from './figure-types';

/** The visor's material: named `visor` by the build. */
type Tintable = Material & {
  color: { set(css: string): void };
  emissive?: { set(css: string): void };
  emissiveIntensity?: number;
};

/** The material named `name` in `model`; throws if the build changed. */
function materialOf(model: Object3D, name: 'suit' | 'visor'): Tintable {
  let found: Tintable | null = null;
  model.traverse((node) => {
    const material = (node as Mesh).material as Tintable | undefined;
    if (material?.name === name) found = material;
  });
  if (!found) throw new Error(`the model has no ${name}`);
  return found;
}

/**
 * The model at `url` with its suit texture, which the build keeps beside
 * it (a texture inside a GLB would load through a blob: URL, which the
 * CSP does not allow).
 */
async function loadModel(url: string): Promise<Object3D> {
  const [gltf, suit] = await Promise.all([
    new GLTFLoader().loadAsync(url),
    new TextureLoader().loadAsync(url.replace(/\.glb$/, '-suit.webp')),
  ]);
  suit.flipY = false;
  suit.colorSpace = SRGBColorSpace;
  const material = materialOf(gltf.scene, 'suit') as Tintable & { map: unknown };
  material.map = suit;
  material.needsUpdate = true;
  return gltf.scene;
}

/** What draws the pictures: the renderer, the figure and its visor. */
interface Painter {
  readonly renderer: WebGLRenderer;
  readonly figure: FigureScene;
  readonly visor: Tintable;
}

/** Every picture, drawn by `painter`, each in a slice of its own. */
async function drawAll(
  { renderer, figure, visor }: Painter,
  colours: Readonly<Record<Visor, string>>,
  slice: () => Promise<void>,
): Promise<FigureImages> {
  const canvas = renderer.domElement;
  const draw = async (pose: (typeof POSES)[number]) => {
    const row: Partial<Record<Visor, string>> = {};
    for (const tone of VISORS) {
      await slice();
      figure.pose(pose);
      visor.color.set(colours[tone]);
      visor.emissive?.set(colours[tone]);
      visor.emissiveIntensity = tone === 'idle' ? 0.08 : 0.35;
      renderer.render(figure.scene, figure.camera);
      row[tone] = canvas.toDataURL('image/png');
    }
    return row as Record<Visor, string>;
  };
  const stand = await draw('stand');
  return { stand, carry: await draw('carry') };
}

/** Frees what the model holds on the GPU, and the renderer's context. */
function release(model: Object3D | null, renderer: WebGLRenderer): void {
  model?.traverse((node) => {
    const mesh = node as Mesh;
    mesh.geometry?.dispose();
    const material = mesh.material as Material | undefined;
    const map = (material as { map?: { dispose(): void } } | undefined)?.map;
    map?.dispose();
    material?.dispose();
  });
  renderer.dispose();
  renderer.forceContextLoss();
}

/**
 * The pictures of the model at `url`, its visor in `colours`, one per
 * `slice`. Rejects when the browser has no WebGL or the model does not
 * load.
 */
export async function renderFigures(
  url: string,
  colours: Readonly<Record<Visor, string>>,
  slice: () => Promise<void>,
): Promise<FigureImages> {
  performance.mark('astronaut-figures-start');
  const canvas = document.createElement('canvas');
  Object.assign(canvas, { width: PICTURE.width, height: PICTURE.height });
  const options = { canvas, alpha: true, antialias: true };
  const renderer = new WebGLRenderer(options);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = ACESFilmicToneMapping;
  let model: Object3D | null = null;
  try {
    model = await loadModel(url);
    const visor = materialOf(model, 'visor');
    const painter = { renderer, figure: figureScene(model), visor };
    const images = await drawAll(painter, colours, slice);
    performance.measure('astronaut-figures', 'astronaut-figures-start');
    return images;
  } finally {
    release(model, renderer);
  }
}
