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
 * The scene the astronaut's pictures are drawn in: the model on its feet
 * at the origin, an orthographic camera framing it with the feet where
 * {@link PICTURE} says, and a soft key and fill light, so the figure
 * reads on the dark Moon and the dark page alike.
 */
import {
  Box3,
  DirectionalLight,
  Group,
  HemisphereLight,
  OrthographicCamera,
  Scene,
  Vector3,
  type Object3D,
} from 'three';
import { PICTURE, type Pose } from './figure-types';

/** Turn and tilt of each pose, radians (the mocks' «stand» and «carry»). */
const POSE_ANGLES: Readonly<Record<Pose, { turn: number; tilt: number }>> = {
  stand: { turn: -0.45, tilt: 0 },
  carry: { turn: -0.35, tilt: -0.3 },
};
/** The frame is this much taller than the figure. */
const HEADROOM = 1.12;

export interface FigureScene {
  readonly scene: Scene;
  readonly camera: OrthographicCamera;
  /** Turns and tilts the figure about its feet. */
  pose(pose: Pose): void;
}

/** Stands `model` with its feet at the origin; returns its height. */
function standOnOrigin(model: Object3D): number {
  const box = new Box3().setFromObject(model);
  const centre = box.getCenter(new Vector3());
  model.position.set(-centre.x, -box.min.y, -centre.z);
  return box.max.y - box.min.y;
}

/** A soft sky, a key light from the upper left and a cool rim. */
function addLights(scene: Scene): void {
  const key = new DirectionalLight(0xffffff, 2.4);
  key.position.set(-0.6, 0.8, 0.9);
  const rim = new DirectionalLight(0x9fb8ff, 0.9);
  rim.position.set(0.7, 0.3, -0.6);
  scene.add(new HemisphereLight(0xdfe6ff, 0x2a2620, 1.1), key, rim);
}

/** A scene around `model`, with the camera set for {@link PICTURE}. */
export function figureScene(model: Object3D): FigureScene {
  const height = standOnOrigin(model);
  const turn = new Group();
  const tilt = new Group();
  turn.add(model);
  tilt.add(turn);
  const scene = new Scene();
  scene.add(tilt);
  addLights(scene);
  const tall = height * HEADROOM;
  const wide = (tall * PICTURE.width) / PICTURE.height;
  const below = tall * (1 - PICTURE.feetY);
  const camera = new OrthographicCamera(
    -wide / 2, wide / 2, tall - below, -below, -10 * height, 10 * height,
  );
  camera.position.set(0, 0, 5 * height);
  return {
    scene,
    camera,
    pose: (pose) => {
      turn.rotation.y = POSE_ANGLES[pose].turn;
      tilt.rotation.z = POSE_ANGLES[pose].tilt;
    },
  };
}
