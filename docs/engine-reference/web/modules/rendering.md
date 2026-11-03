# three.js Rendering — Quick Reference

Last verified: 2026-10-20 | Engine: three 0.186.1 (r186), set `2026.10` in `../VERSION.md`

Shadows, environment lighting, transparency, skinned animation and compressed glTF. Each entry cites the r186 source
file it was read from (paths under https://github.com/mrdoob/three.js/tree/r186, read on 2026-10-20) or an official
page (see Sources). Read `../breaking-changes.md` and `../deprecated-apis.md` first; what is not here is
`NOT SOURCEABLE — <API> is not covered by docs/engine-reference/web/`.

**Renderer scope.** Checked against `WebGLRenderer`, which the manual recommends for pure WebGL 2 apps.
`WebGPURenderer` (`three/webgpu`) is experimental with its own code paths: an entry that does not name it is not
verified for it (`../current-best-practices.md`, «three.js»).

## Shadows

Three switches, all off by default (shadows manual): `renderer.shadowMap.enabled = true` (default `false` in
`src/renderers/webgl/WebGLShadowMap.js`, and also in `WebGPURenderer`'s `src/renderers/common/Renderer.js`),
`light.castShadow = true` per light, and `mesh.castShadow` / `mesh.receiveShadow` per mesh.

- **Type.** Default `PCFShadowMap`, soft since r182. `PCFSoftShadowMap` was removed in r186: the constant remains and
  `WebGLShadowMap` warns and switches to `PCFShadowMap`. Others: `BasicShadowMap`, `VSMShadowMap`.
  — `src/renderers/webgl/WebGLShadowMap.js`, `src/constants.js`
- **DirectionalLight's shadow camera is an `OrthographicCamera`**, default box `left -5, right 5, top 5, bottom -5,
  near 0.5, far 500`. Shadows exist only inside it: fit it to what the player sees, call
  `light.shadow.camera.updateProjectionMatrix()` after changing it, check it with `new CameraHelper(light.shadow.camera)`.
  A bigger box gives blockier shadows. — `src/lights/DirectionalLightShadow.js`, shadows manual
- **DirectionalLight aims at `light.target`**, not by rotation; to move the target, add it to the scene (or point
  `target` at an object in it). A light following the player moves light and target together. — `src/lights/DirectionalLight.js`
- **`shadow.mapSize`** defaults to 512×512; larger costs memory and time, capped by
  `renderer.capabilities.maxTextureSize`. — `src/lights/LightShadow.js`, shadows manual
- **Acne / peter-panning.** `shadow.bias` (default `0`; the source suggests steps around `0.0001`) offsets the depth
  compare. `shadow.normalBias` (default `0`) offsets along the normal, helps with acne at grazing angles on large
  scenes, and can distort shadows. Tune per light, keep the values in data. `shadow.biasNode` replaces `bias` only on
  `WebGPURenderer`. — `src/lights/LightShadow.js`
- **`shadow.radius`** (default `1`) blurs edges, not with `BasicShadowMap`; `shadow.blurSamples` (default `8`) is
  VSM only. **Static shadows:** `shadow.autoUpdate = false` and `shadow.needsUpdate = true` when something moves, or
  `renderer.shadowMap.autoUpdate = false` for all lights. — `src/lights/LightShadow.js`, `WebGLShadowMap.js`
- **Cost.** Each shadow-casting light redraws every caster from its viewpoint. A `PointLight` shadow is a cube map:
  `WebGLShadowMap` renders all **6 faces**, so the casters are drawn 6 times for that light. The manual advises one
  shadow-casting directional light, the rest without shadows, and baked lightmaps/AO or a blob texture under objects.
  — shadows manual, `src/renderers/webgl/WebGLShadowMap.js`, `src/lights/PointLightShadow.js`

## Environment lighting: PMREMGenerator + RoomEnvironment

```ts
import { PMREMGenerator } from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
const pmrem = new PMREMGenerator(renderer);
const room = new RoomEnvironment();
scene.environment = pmrem.fromScene(room, 0.04).texture; // sigma (blur, radians): a tuning knob
room.dispose(); // frees the room's geometries and materials
```

- `fromScene(scene, sigma = 0, near = 0.1, far = 100, options = {})` returns a render target (`options.size`
  defaults to 256); its `.texture` goes to `scene.environment` or a material's `envMap`. Keep the target until the
  environment is replaced, then `dispose()` it. — `src/extras/PMREMGenerator.js`, `examples/jsm/environments/RoomEnvironment.js`
- **One generator is enough:** disposing one instance makes any other unusable. — `src/extras/PMREMGenerator.js`
- HDR sky: `HDRLoader` (not `RGBELoader`) and `pmrem.fromEquirectangular(texture)`, ideal input 1024×512. r181 made
  rough materials brighter than older tutorials show. — `src/extras/PMREMGenerator.js`, `../breaking-changes.md`
- `three/webgpu` exports its own `PMREMGenerator` (`src/renderers/common/extras/PMREMGenerator.js`, same `fromScene`
  signature). Output parity with the WebGL one is NOT SOURCEABLE here.

## Transparency: `alphaTest` vs `transparent` and `depthWrite`

Source: `src/materials/Material.js`, `examples/jsm/loaders/GLTFLoader.js`.

- **Cut-out (foliage, fences, hard-edged sprites): `alphaTest`** (default `0`). Fragments below it are not drawn;
  the material stays opaque, writes depth and sorts as opaque. `alphaToCoverage = true` smooths the edges when the
  renderer has `antialias: true`.
- **Blended (glass, fades, smoke): `transparent = true`.** Drawn after opaque objects; overlapping transparent
  surfaces can sort wrongly. For flat overlays, `depthWrite = false` stops them hiding what is behind (the manual's
  blob-shadow plane uses both). **`alphaHash = true`** avoids sorting at the cost of grain.
- **GLTFLoader maps `alphaMode` itself:** `BLEND` → `transparent = true` + `depthWrite = false`; `MASK` →
  `alphaTest = alphaCutoff` (0.5 if absent); `OPAQUE` → neither. Fix the mode in Blender, not in code.

## Skinned animation: AnimationMixer

Source: `src/animation/AnimationMixer.js`, `src/animation/AnimationAction.js`.

- **One `AnimationMixer` per animated root** (per character instance). `mixer.clipAction(clip)` gives the action;
  call `mixer.update(dt)` every frame, `dt` in seconds from `Timer` (`Clock` is deprecated, `../deprecated-apis.md`).
- **Cross-fade:** `current.crossFadeTo(next, duration, warp = false)` only schedules weights; `next` must be playing
  (`next.reset().play()` first: `play()` is what activates an action).
- **One-shot (attack, death):** `setLoop(LoopOnce, 1)` plus `clampWhenFinished = true` holds the last frame; with
  `false` the action disables itself at the end. Clamping does not apply if the action is interrupted.
- **End of a one-shot:** the mixer dispatches `"finished"` with `{ action, direction }` (`"loop"` on each repeat);
  listen on the mixer and filter by `event.action`. **Teardown:** `stopAllAction()`, then `uncacheRoot(root)`.
- Gameplay timing (hit frames, cooldowns) comes from the sim; the mixer only shows it (`.claude/docs/coding-standards.md`).

## Reusing a loaded model: `SkeletonUtils.clone`

Source: `examples/jsm/utils/SkeletonUtils.js`, `src/core/Object3D.js`.

- `object.clone()` on a model with a `SkinnedMesh` leaves the copy bound to the **original** bones.
  `import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js"`; `SkeletonUtils.clone(gltf.scene)` clones
  the bones too (they must be descendants of the cloned object) and rebinds each skeleton. Give each clone its mixer.
- **Geometries and materials (and so their textures) are reused by reference** in every clone. Disposing one
  instance's geometry, material or texture breaks the others and the source: count references, free on the last
  user (to tint one instance, clone its material and dispose that clone with it). `Object3D.dispose()` (new in
  r186) fires the `dispose` event, and the renderers listen for it: `WebGLRenderer` frees an `InstancedMesh`'s
  instance buffers (`src/renderers/webgl/WebGLObjects.js:24-26`) and `WebGPURenderer` drops the object's
  `RenderObject` (`src/renderers/common/RenderObject.js:358`). Neither frees its geometry, material or texture.

## Compressed glTF: DRACO, KTX2, Meshopt — decoders served locally

- `GLTFLoader` takes `setDRACOLoader`, `setKTX2Loader` and `setMeshoptDecoder` before loading files with those
  extensions; all three throw if missing (DRACO: `No DRACOLoader instance provided`, `GLTFLoader.js:1951`, as soon
  as the file lists the extension in `extensionsUsed`). — `examples/jsm/loaders/GLTFLoader.js`
- **DRACO:** files in `node_modules/three/examples/jsm/libs/draco/` (`draco_decoder.wasm`, `draco_wasm_wrapper.js`,
  `draco_decoder.js`, plus a `gltf/` variant); `setDecoderPath(dir)` resolves those names under `dir`.
  `setDecoderConfig()` is deprecated, removal in r194. — `examples/jsm/loaders/DRACOLoader.js`
- **KTX2:** `libs/basis/` (`basis_transcoder.js`, `basis_transcoder.wasm`); `setTranscoderPath(dir)`, then
  `detectSupport(renderer)` before loading (with `WebGPURenderer`, after `await renderer.init()`;
  `detectSupportAsync()` is deprecated). Use one `KTX2Loader`: each instance spawns its own transcoder and workers.
  — `examples/jsm/loaders/KTX2Loader.js`
- **Meshopt:** `import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js"`; the WASM is embedded,
  nothing to serve. — `examples/jsm/libs/meshopt_decoder.module.js`
- **Defaults changed in r185:** an empty path used to mean the page's folder; now DRACOLoader and KTX2Loader default
  to `new URL("../libs/…", import.meta.url)`. Vite rewrites that pattern for static strings at build time; whether
  it does for code in `node_modules` (dev pre-bundling and build) is NOT SOURCEABLE — the Vite assets page does not
  say. — both loaders, r184 vs r185
- **Studio rule: serve them from the game.** Copy the folders to `packages/client/public/draco/` and `public/basis/`
  (Vite serves `public/` at `/` as-is) and call `setDecoderPath("/draco/")` / `setTranscoderPath("/basis/")`. A CDN
  path breaks the game offline: an installed PWA must precache these files, and Capacitor ships the built web
  bundle inside the native project (`npx cap sync`). Re-copy on every three update: decoder and loader must match.
- **Producing the files** (glTF-Transform `etc1s`/`uastc` with KTX-Software's `ktx`, gltfpack) and the per-tier
  texture budgets for phones: `.claude/docs/web-mobile-performance.md`.

## glTF node names

`GLTFLoader` passes node, mesh, camera, light and scene names through `PropertyBinding.sanitizeNodeName`:
**whitespace becomes `_`** and **`[ ] . : /`** are removed (reserved for animation track paths); a repeated name
gets `_1`, `_2`…; a node keeps its original glTF name in `node.userData.name`. Blender's `MK_enemigo.001` arrives as
`MK_enemigo001` and `Spawn Point` as `Spawn_Point`: look nodes up by the sanitized name or by `userData.name`.
GLTFLoader also sets `SRGBColorSpace` on colour textures itself. — `src/animation/PropertyBinding.js`,
`examples/jsm/loaders/GLTFLoader.js` (`createUniqueName`, `loadNode`, `assignTexture`)

## Common Mistakes

- `castShadow` without `renderer.shadowMap.enabled`, or the reverse: all three switches are needed
- The DirectionalLight shadow box left at ±5 for a large level, or made huge and blurry
- Shadow-casting PointLights on mobile: 6 shadow renders each
- `transparent = true` on foliage that only needs `alphaTest`, then fighting sorting artefacts
- `model.clone()` on a skinned character; one mixer shared by several characters
- Disposing a clone's geometry or material and breaking every other instance
- Decoder paths on a CDN in a PWA or Capacitor build; several `KTX2Loader` instances
- Finding a glTF node by a Blender name with a dot or a space in it

## Sources

- three.js r186 source: https://github.com/mrdoob/three.js/tree/r186 (files named on each entry)
- Shadows manual: https://threejs.org/manual/pages/shadows.html
- Vite static assets and `public/`: https://vite.dev/guide/assets
- Capacitor workflow (`npx cap sync`): https://capacitorjs.com/docs/basics/workflow
