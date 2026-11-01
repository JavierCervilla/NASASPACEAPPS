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

// The browser half of the astronaut's offline bake (astronaut-figures.mjs, VENT-10): it runs inside a pinned headless
// Chromium on SwiftShader and draws the model into the page's pictures, one per pose and visor colour, as PNG data
// URLs. The scene, lights, tone mapping and picture size are the ones the page drew at runtime until the pictures were
// baked, so the figure looks the same. `three` resolves through the bake page's import map to the workspace's three.
import {
  ACESFilmicToneMapping,
  Box3,
  DirectionalLight,
  Group,
  HemisphereLight,
  OrthographicCamera,
  SRGBColorSpace,
  Scene,
  TextureLoader,
  Vector3,
  WebGLRenderer,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/** Turn and tilt of each pose, radians (the canvas' «stand» and «carry»). */
const POSE_ANGLES = {
  stand: { turn: -0.45, tilt: 0 },
  carry: { turn: -0.35, tilt: -0.3 },
};
/** The frame is this much taller than the figure. */
const HEADROOM = 1.12;

/** The material named `name` in `model`; throws if the model build changed. */
function materialOf(model, name) {
  let found = null;
  model.traverse((node) => {
    if (node.material?.name === name) found = node.material;
  });
  if (!found) throw new Error(`the model has no ${name}`);
  return found;
}

/** The model at `url` with its suit texture, which the model build keeps beside it. */
async function loadModel(url) {
  const [gltf, suit] = await Promise.all([
    new GLTFLoader().loadAsync(url),
    new TextureLoader().loadAsync(url.replace(/\.glb$/, '-suit.webp')),
  ]);
  suit.flipY = false;
  suit.colorSpace = SRGBColorSpace;
  const material = materialOf(gltf.scene, 'suit');
  material.map = suit;
  material.needsUpdate = true;
  return gltf.scene;
}

/** Stands `model` with its feet at the origin; returns its height. */
function standOnOrigin(model) {
  const box = new Box3().setFromObject(model);
  const centre = box.getCenter(new Vector3());
  model.position.set(-centre.x, -box.min.y, -centre.z);
  return box.max.y - box.min.y;
}

/** A soft sky, a key light from the upper left and a cool rim. */
function addLights(scene) {
  const key = new DirectionalLight(0xffffff, 2.4);
  key.position.set(-0.6, 0.8, 0.9);
  const rim = new DirectionalLight(0x9fb8ff, 0.9);
  rim.position.set(0.7, 0.3, -0.6);
  scene.add(new HemisphereLight(0xdfe6ff, 0x2a2620, 1.1), key, rim);
}

/** A scene around `model`, an orthographic camera framing it with the feet where `picture` says, and its poses. */
function figureScene(model, picture) {
  const height = standOnOrigin(model);
  const turn = new Group();
  const tilt = new Group();
  turn.add(model);
  tilt.add(turn);
  const scene = new Scene();
  scene.add(tilt);
  addLights(scene);
  const tall = height * HEADROOM;
  const wide = (tall * picture.width) / picture.height;
  const below = tall * (1 - picture.feetY);
  const camera = new OrthographicCamera(-wide / 2, wide / 2, tall - below, -below, -10 * height, 10 * height);
  camera.position.set(0, 0, 5 * height);
  const pose = (name) => {
    turn.rotation.y = POSE_ANGLES[name].turn;
    tilt.rotation.z = POSE_ANGLES[name].tilt;
  };
  return { scene, camera, pose };
}

/**
 * Every picture of the model at `url`: `{ [pose]: { [visor]: dataUrl } }`, the visor in `colours` (silver `idle`
 * glows less than a state's colour).
 */
export async function bakeFigures({ url, picture, poses, colours }) {
  const canvas = document.createElement('canvas');
  Object.assign(canvas, { width: picture.width, height: picture.height });
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = ACESFilmicToneMapping;
  const model = await loadModel(url);
  const visor = materialOf(model, 'visor');
  const figure = figureScene(model, picture);
  const out = {};
  for (const pose of poses) {
    out[pose] = {};
    for (const [tone, colour] of Object.entries(colours)) {
      figure.pose(pose);
      visor.color.set(colour);
      visor.emissive?.set(colour);
      visor.emissiveIntensity = tone === 'idle' ? 0.08 : 0.35;
      renderer.render(figure.scene, figure.camera);
      out[pose][tone] = canvas.toDataURL('image/png');
    }
  }
  renderer.dispose();
  return out;
}
