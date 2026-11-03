# Web Mobile Performance

How a Web game (`engine.name: Web`) that ships on phones keeps inside a phone GPU's limits, and how to find out what
broke when it does not. Read it before the first slice of a mobile-first Web game, and again before adding a render
target, an environment map, a post effect or a large instanced mesh.

**Mobile-first** here means `engine.name` is `Web` and `platform.targets` in `project.yaml` lists `Mobile`. When
`platform.targets` is unset, ask once whether the game targets phones; do not read unset as "no".

Owners: `web-specialist` (budgets and the department's rules), `threejs-specialist` (renderer, assets, disposal),
`technical-artist` (texture formats and the asset pipeline), `capacitor-specialist` (native builds on devices),
`performance-analyst` (measuring and the report). The API details for loaders and decoders are in
`docs/engine-reference/web/modules/rendering.md`; this file does not repeat them.

## Why this exists: the museum and the Pixel

The studio's first Web game, «Óleo de Ánimas» (javiercervilla/museum, three.js `WebGLRenderer`, WebGL 2), ran at
120 fps on a Mac and lost its WebGL context on every load on a Pixel phone whose GPU string read **PowerVR D-Series
DXT-48-1536**. The team bisected it blind from screenshots for some twenty commits. What its git log records
(branch `claude/3d-museum-halloween-experience-ic0fhr`, read on 2026-10-29):

| Commit | What the phone showed | What it taught |
|---|---|---|
| `9d3adea` | A phone test build with a performance readout | Desktop and CI never show a phone's limits: build a phone test build from the first slice |
| `83e0b74` | A blank page in an Android in-app viewer | Some in-app viewers give a page no WebGL2 context: detect it and tell the player to open the link in Chrome or Safari |
| `7005dbb` | 60 fps, **0 draw calls**, blank canvas | The signature of a lost context. About 270 MB of decoded textures before models, environment and shadow maps: textures were capped per tier (512 / 1024 / 4096 px for materials) |
| `236b982` | The GPU process crashed on the title screen; after a few crashes the browser stopped giving the site WebGL | Record each step in `localStorage` (breadcrumbs): it survives the crash and the reload |
| `5323333`, `f913db1` | Low quality crashed too | Rules out MSAA, bloom and shadows as the only cause |
| `914260f`, `d9ffa7a` | Runs that survived had no point sprites | The dust was `THREE.Points` with size attenuation: unbounded point size near the camera, negative behind it. Replaced by 320 quads in one `InstancedMesh` |
| `30c5d4f`, `f04eabd`, `5582885` | The whole museum drawn in the first frame crashed every time; revealed one material family at a time it reached all 23 | **Fixed:** a staged warm-up after `compileAsync`, so no frame uploads every texture and draws every new material at once. Glass `KHR_materials_transmission` dropped (see the table below) |
| `34a78e6`, `158faf5` | The 8-bit post target crashed like the half-float one | The post chain's format was not the cause there. A "ladder" switches one part on every 5 s to name the rung that crashes |
| `6dd7598` | 107 MB of textures at low (367 MB at medium and high), and the context still lost a few seconds after load whatever was on screen | Losses that come seconds after load regardless of content act like a GPU watchdog on a hung job. The one GPU job left on every load was the reflection probes' PMREM (six cube renders and a blur loop). **Open at the time of writing** |

Three lessons this guide turns into rules: measure on the phone from the first slice; never let one frame upload and
compile a whole scene; and treat transmission, half-float targets, point sprites, PMREM and big instanced meshes as
unproven on a phone until a run on one says otherwise.

## Budgets per scene

**Starting values to tune per game, not official figures.** No vendor publishes a WebGL memory limit; MDN says WebGL
"doesn't offer APIs to query the maximum amount of video memory". Each value comes with its reasoning so the team can
move it with evidence. A scene is what is resident at once: the level plus anything preloaded behind it.

**Tiers** are a starting guess from the GPU string (`WEBGL_debug_renderer_info`'s unmasked renderer), corrected by
measuring on each test device. Starting assignment:

- **Low**: any GPU not yet measured on a real phone, software renderers (SwiftShader, llvmpipe), PowerVR (the
  museum's D-Series DXT-48-1536 lost its context even at the museum's low tier), Adreno 6xx, Mali-G5x and older Mali.
- **Medium**: Adreno 7xx, Mali-G7xx, Apple GPUs. Expect generic strings: Safari can report «Apple GPU» without the
  model (the museum's detector matches that string), so record what each device actually reports.
- **High**: Adreno 8xx, Mali Immortalis, and desktop. A phone reaches high only after it has held medium on a real run.

| Per scene | Low | Medium | High | Reasoning |
|---|---|---|---|---|
| Texture memory, GPU estimate with mips | 64 MB | 128 MB | 256 MB | The only failing figures we have are the museum's 107 MB (low) and ~270–367 MB. 64 MB leaves headroom under the lowest one. KTX2 is how a scene fits: see the sizes below |
| Largest texture side | 1024 (materials 512) | 2048 (materials 1024) | 4096 | The museum's caps per tier (`7005dbb`). MDN: effectively every system supports `MAX_TEXTURE_SIZE` 4096, so 4096 is the ceiling everywhere |
| Draw calls per frame | 100 | 200 | 400 | No source gives a phone figure; each call costs main-thread CPU. Halve when the readout's frame time is over budget with the GPU idle |
| Triangles per frame | 150 k | 400 k | 1 M | A guess to tune. `renderer.info.render.triangles` counts instances (`instanceCount × count / 3` in r186 `WebGLInfo.js`) |
| Render targets besides the canvas | 2, 8-bit, no MSAA | 3; one half-float once proven; MSAA ≤ 2 | 4; half-float; MSAA 4 | Every full-screen target costs `width × height × bytes per pixel × samples` (below) |
| Render scale (device pixel ratio cap) | 1.25 | 1.75 | 2 | The museum's values. A 1080×2400 phone at full ratio draws 2.6 MP per target; at 1.25 a fraction of that |
| Shadow maps | none | one 1024 | one 2048 | `rendering.md`: each shadow-casting light redraws the casters; a point light does it 6 times |
| Environment lighting | baked lightmaps or none | one PMREM at load, cube 256 | same | PMREM is on the "prove first" list below |

**Sizes to budget with** (glTF-Transform 4.5.1 `inspect`, column `gpuSize`, on the museum's `marble_bust_01.glb`,
run on 2026-10-29): a 1024×1024 texture takes **5.59 MB** as RGBA with mips, **0.70 MB** as KTX2 ETC1S and **1.40 MB**
as KTX2 UASTC. The museum's 107 MB at low would be about 13–27 MB in KTX2. A half-float RGBA target is 8 bytes a pixel,
an 8-bit one 4; MSAA multiplies by the sample count; MDN says to assume depth and stencil round up to 4 bytes a pixel.
At 1080×2400 a half-float target with MSAA 4 is about 83 MB before depth; at render scale 0.5 of that resolution,
about a quarter.

**Cross-check with MDN's per-pixel budget**: decide the VRAM budget on one device, divide by its pixels
(`innerWidth × dpr × innerHeight × dpr`), and keep caches under that constant times the current pixels.

### Prove on a real phone before building on it

Each of these is a switch the test build can turn off from the address (the museum used hash flags such as
`#stats-low-noprobe`), and a rung on the ladder, until a run on the lowest target phone keeps it.

| Technique | What three r186 does (source read) | Museum outcome |
|---|---|---|
| Refraction / transmission (`KHR_materials_transmission`, `MeshPhysicalMaterial.transmission`) | Per camera, a render target the viewport's size (× `transmissionResolutionScale`, default 1), **half-float** when `EXT_color_buffer_half_float`/`_float` exist, **mipmapped**, `samples: max(4, capabilities.samples)`; the opaque scene is drawn into it every frame (`WebGLRenderer.js`) | Dropped for plain transparency (`5582885`) |
| Half-float render targets (post chains, HDR) | MDN: on WebGL 2 `EXT_color_buffer_float` covers float32 and float16 rendering; float32 targets fail on "most mobile systems"; float16 blending is always supported | Not the cause there (8-bit crashed too), still on the ladder |
| Point sprites (`THREE.Points`, `gl.POINTS`) | Size attenuation scales `gl_PointSize` by distance; MDN lists only `ALIASED_POINT_SIZE_RANGE: [1,100]` as safe | Replaced by an instanced quad mesh (`d9ffa7a`) |
| PMREM / environment generation | `fromScene` renders 6 cube faces and blurs; targets are **half-float**, `3 × max(cube, 112)` by `4 × cube` (cube 256 → 768×1024); `fromEquirectangular` takes `cube = width / 4`, so a 1024×512 HDR gives 256 (`PMREMGenerator.js`) | Last open suspect (`6dd7598`). Run it once behind a faded screen, one generator, dispose it; on low prefer baked light |
| Large instanced meshes | One draw call, but every instance's triangles are drawn and counted | Grass at 16 k / 30 k / 90 k blades per tier: measure the triangle count on the phone |
| The first frame of a scene | `compileAsync` uses `KHR_parallel_shader_compile`; textures still upload on first use (`initTexture` uploads one ahead) | **The fix that held**: compile, then reveal in stages (`5582885`) |

## Debugging WebGL on a real Android phone

**Chrome remote debugging over USB** (developer.chrome.com, «Remote debug Android devices»):

1. On the phone, enable Developer options, then **USB debugging**. Connect it directly by cable (no hub).
2. On the computer, open `chrome://inspect#devices` with **Discover USB devices** checked; accept the prompt on the
   phone. The model name appears when connected.
3. Open the game in Chrome on the phone and click **Inspect**: the console, network and performance panels are the
   phone's. **Toggle Screencast** mirrors the screen but lowers the frame rate: turn it off to measure.
4. To load the dev server from the phone, **Port forwarding** on the same page maps a phone port to
   `localhost:<port>` on the computer; open `localhost:<port>` on the phone.

**After a context loss**, open `chrome://gpu` on the phone (or in its inspected tab). Its feature status says whether
WebGL is still enabled for the browser, and its «Log Messages» at the bottom hold the GPU process's errors. Chromium's
WebGL lead on the graphics-dev list: context loss "will typically only happen if Chromium's GPU process crashes" (or a
GPU hang), the `webglcontextlost` event carries little detail, and the about:gpu page is what to collect. Copy that
section into the evidence; after repeated crashes the browser may stop giving the site WebGL (the museum saw this,
`236b982`): note it, since every later run of that session proves nothing.

**`webglcontextlost`.** three's `WebGLRenderer` listens for it, calls `preventDefault()` (so a restore can follow)
and logs «Context Lost» (r186 `WebGLRenderer.js`). The game adds its own listener on the canvas that records a
breadcrumb with the scene and step, and shows the loss in the debug panel. Exercise that path on desktop with
`renderer.forceContextLoss()` or the `WEBGL_lose_context` extension (MDN).

**Spector.js** (0.9.33) captures one frame: every WebGL call, draw call, texture, render target and state.
On desktop, the Chrome or Firefox extension. On the phone, `#stats-spector` in the address loads it in dev and test
builds only (a separate chunk, never in the production bundle) and shows its UI (`new SPECTOR.Spector()`, `displayUI()`, `captureCanvas(canvas)`). A phone that crashes
within a second rarely lets a capture finish: capture the same tier on desktop first, then on the phone before the
step the breadcrumbs name.

**The starter's on-device tooling**, ported from the museum:

- **Debug panel** (`packages/client/src/debug-panel/`, set up by `engine/perf-hud.ts`): a draggable pill with fps,
  draw calls and a status dot that opens a sheet with frame time and the slowest frame, a frame-time graph, triangles,
  texture memory in MB (a KTX2 texture counted as stored), the GPU string, the quality tier and the game's switches
  (staged until «Reiniciar con N cambios», which restarts with them in the hash), both sessions' trails and the errors.
  «Copiar informe» copies all of it as text: ask the human to paste it instead of describing screenshots. The
  component has no dependencies and nothing game-specific; it follows the `apple-design` skill
  (github.com/emilkowalski/skills).
- **Breadcrumbs** in `localStorage`: each step (boot, loads, compile, warm-up groups, frames 1/2/10/60…, context lost)
  with its time. They survive the GPU crash and the reload, and the debug panel shows the previous session's trail.
- **Staged warm-up**: after `compileAsync`, a scene reveals one material family every few frames behind a faded
  screen, so no single frame uploads and draws everything.
- **Test-build packager**: builds the client with the debug panel on into a folder a phone can open from a link.

Where they are in the starter (`packages/client/src/engine/`, the panel in `packages/client/src/debug-panel/`): `perf-hud.ts`, `breadcrumbs.ts`, `warmup.ts`,
`texture-memory.ts`, `quality.ts` (tier detection and per-tier settings, starting values) and `dev-tools.ts`, which
starts them. They load in `npm run dev` and in a test build (`npm run build:perf -w @game/client`, i.e.
`vite build --mode perf`); the production build drops them, and CI's Web job checks it. The address hash drives them:
`#stats` shows the panel, `#stats-low`, `-medium`, `-high` force a tier (`?quality=low` also does), a switch word
the game defines (e.g. `-nopost`) turns a suspect off, `-spector` adds Spector.js; combine them, e.g. `#stats-low-nopost-spector`. Tap the pill to open the sheet; drag the sheet down to close it.
`npm run artifact` (`tools/web/artifact.ts`) packages a test build as a claude.ai Artifact page plus `files.json`
(binary assets as base64 text, 64 MB cap), the museum's way of getting a build onto a phone without a server.
Warm-up (`prepareScene`, `Warmup`) runs in every build: it is what kept the museum's PowerVR phone alive; only its
breadcrumbs are dev/test.

**iOS.** Safari Web Inspector (Apple, «Inspecting iOS and iPadOS»): on the iPhone, Settings > Apps > Safari >
Advanced > **Web Inspector**; connect it to a Mac by cable, trust the Mac, and pick the page from Safari's **Develop**
menu on the Mac. After the first cable connection, **Connect via Network** works over Wi-Fi.

## Compressing assets: KTX2 textures and meshopt geometry

A PNG, JPEG or WebP is decoded to RGBA in GPU memory; a KTX2 texture stays compressed there (Khronos KTX Artist
Guide). Android: ETC2 is supported by every OpenGL ES 3.0 device (Android developers, «Target texture compression
formats»), and `KTX2Loader` transcodes Basis to the best format the GPU has (ASTC, ETC2/ETC1, BC7, BC1/3, PVRTC), or
to uncompressed RGBA when none (r186 `KTX2Loader.js`).

**Tools** (pinned in the Web set, `docs/engine-reference/web/VERSION.md`): glTF-Transform CLI 4.5.1, whose `etc1s` and
`uastc` commands spawn KTX-Software's **`ktx create`** and need **4.4.0+**; `bash studio/web/install-ktx.sh` installs
the pinned 4.4.2 under `~/.gamestudio/` and prints `KTX_BIN=<dir>` as its last line. gltfpack 1.3.0 (meshoptimizer)
for geometry.

```bash
export PATH="<KTX_BIN>:$PATH"                         # from install-ktx.sh's last line
npx gltf-transform png  model.glb tmp1.glb --formats webp     # only if textures are WebP: see below
npx gltf-transform uastc tmp1.glb tmp2.glb --slots "normalTexture"
npx gltf-transform etc1s tmp2.glb tmp3.glb --slots "{baseColorTexture,metallicRoughnessTexture,occlusionTexture,emissiveTexture}"
npx gltfpack -i tmp3.glb -o model.opt.glb -cc         # meshopt geometry; keeps the KTX2 textures
npx gltf-transform inspect model.opt.glb              # gpuSize per texture
```

Verified on 2026-10-29 on the museum's `marble_bust_01.glb` with `ktx` 4.4.2: three 1024² textures from 16.8 MB to
2.8 MB of GPU memory. Points that run will trip over:

- **WebP is skipped**: glTF-Transform compresses only PNG and JPEG («Skipping, unsupported texture type
  "image/webp"»). Convert first with `png --formats webp`, or better, keep PNG sources and compress from those.
- **ETC1S vs UASTC.** ETC1S for base colour, emissive and UI or flat-colour art (smaller; Khronos: "especially good
  with … interface assets"). UASTC for normal maps and packed ORM maps (Khronos: "less aggressive compression" for
  them); glTF-Transform also turns RDO off for normal maps itself. UI text that must stay crisp: UASTC, or keep it
  out of textures (HTML/CSS).
- **Mipmaps** are on by default (`--generate-mipmap`); turn them off (`--mipmaps false`) only for 2D art never shown
  smaller, as MDN advises.
- **Sizes.** glTF-Transform rounds every side up to a multiple of 4 (required by `KHR_texture_basisu`); `--resize 1024`
  fits within 1024 at a power of two. Khronos: "power-of-two dimensions are almost always required"; in three, only
  the PVRTC fallback needs it.
- **Loose textures** (not inside a .glb): `ktx create --format R8G8B8_SRGB --assign-tf srgb --assign-primaries bt709
  --encode basis-lz --generate-mipmap in.png out.ktx2` for colour; `--format R8G8B8_UNORM --assign-tf linear
  --assign-primaries none --encode uastc --uastc-quality 2 --zstd 18` for data maps (both verified with 4.4.2;
  `ktx info out.ktx2` validates). `KTX2Loader` sets the colour space from the file; compressed textures cannot be
  flipped on upload (`CompressedTexture.flipY` is `false`), so build UVs for glTF's top-left origin.
- **gltfpack**: `-cc` meshopt compression, `-si R` simplifies to a triangle ratio (verified: `-si 0.5` took the bust
  from 8,728 to 4,364 triangles), `-mi` instancing, `-kn`/`-km` keep named nodes and materials the code looks up. LODs:
  one `-si` export per level, swapped by `THREE.LOD`. Run it on source exports: it warns that repacking an already
  quantized file adds error. The npm build passes KTX2 textures through but does not compress textures (its README:
  native binaries "support texture compression"); compress with glTF-Transform.

In the starter: `npm run assets:ktx2 -- in.glb out.glb` (`gltf-transform etc1s`; `assets:ktx2:uastc` for normal and
ORM maps) and then `npm run assets:pack -- -i out.glb -o final.glb` (`gltfpack -cc`), in that order: gltfpack keeps
`KHR_texture_basisu` textures as they are. Put `ktx` on the PATH first: `bash studio/web/install-ktx.sh` prints
`KTX_BIN=<dir>`.

**Loading in three r186** (paths read from the r186 source; set-up rules in `rendering.md`). The starter's
`packages/client/src/engine/gltf.ts` (`createGltfLoader`, `loadGltf`) does this, and its Vite config serves and
emits the Basis transcoder under `basis/`:

```ts
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { KTX2Loader } from "three/addons/loaders/KTX2Loader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

const ktx2 = new KTX2Loader().setTranscoderPath("/basis/").detectSupport(renderer); // one instance for the game
const gltf = new GLTFLoader().setKTX2Loader(ktx2).setMeshoptDecoder(MeshoptDecoder);
```

`GLTFLoader` throws if a file needs a decoder that was not set. Serve `libs/basis/` from the game, not a CDN
(`rendering.md`, «Studio rule»).

## The real-phone rule

**A mobile-first Web game is tested on a real phone at the end of every story** that changes something a player can
see, not only in desktop Chrome or in CI's software WebGL (SwiftShader), which share none of a phone GPU's limits. The
desktop capture of `.claude/docs/run-and-observe.md` stays; the phone run is added to it.

Record it in `production/qa/evidence/[story-slug]/`:

- `phone-<device>.png`: a screenshot of the scene the story touched, with the debug panel open.
- `phone-<device>.md`: device model, OS and browser version, the GPU string as the debug panel shows it (or paste its «Copiar informe»), the tier it ran at,
  fps (average and slowest frame), draw calls, triangles, texture MB, the breadcrumb trail (the previous session's
  trail too after a crash), and any context loss with the `chrome://gpu` «Log Messages».
- The `Run result:` line names the phone: `OBSERVED — <what was on screen>, on <device> (<GPU>), <fps> fps, <MB>`.

No phone run: `Run result: NOT VERIFIED — not run on a real phone`, which `/story-done` flags at the story type's
gate level. Run on the lowest phone the game targets; a new technique from the "prove first" table needs a run on it
before another story builds on it.

## Sources

- three.js r186 source, https://github.com/mrdoob/three.js/tree/r186 (read 2026-10-29): `src/renderers/WebGLRenderer.js`
  (transmission target, `onContextLost`, `compileAsync`, `initTexture`, `forceContextLoss`),
  `src/renderers/webgl/WebGLInfo.js`, `src/extras/PMREMGenerator.js`, `src/textures/CompressedTexture.js`,
  `examples/jsm/loaders/KTX2Loader.js`, `examples/jsm/loaders/GLTFLoader.js`, `examples/jsm/libs/meshopt_decoder.module.js`,
  `src/objects/LOD.js`, `package.json` (`./addons/*` export)
- MDN, WebGL best practices: https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices;
  `webglcontextlost`: https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/webglcontextlost_event
- Khronos, KTX Artist Guide: https://github.com/KhronosGroup/3D-Formats-Guidelines/blob/main/KTXArtistGuide.md
- Android developers, texture compression formats: https://developer.android.com/guide/playcore/asset-delivery/texture-compression
- Imagination, «Introduction to PowerVR for Developers» (rules «Do Use Texture Compression», «Do Not Use Alpha Blend
  Unnecessarily»): https://docs.imgtec.com/starter-guides/powervr-architecture/html/index.html
- Chrome DevTools, remote debugging and port forwarding: https://developer.chrome.com/docs/devtools/remote-debugging,
  https://developer.chrome.com/docs/devtools/remote-debugging/local-server
- Chromium graphics-dev, «Do Chromium logs contain information related to WebGL context lost events?»:
  https://groups.google.com/a/chromium.org/g/graphics-dev/c/RvY8ECMlrCw
- Apple, Inspecting iOS and iPadOS: https://developer.apple.com/documentation/safari-developer-tools/inspecting-ios
- glTF-Transform CLI 4.5.1 `dist/cli.mjs` (npm); gltfpack README at meshoptimizer v1.3:
  https://github.com/zeux/meshoptimizer/blob/v1.3/gltf/README.md; Spector.js 0.9.33 `readme.md` (npm)
- The museum: https://github.com/javiercervilla/museum, branch `claude/3d-museum-halloween-experience-ic0fhr`, commits
  `9d3adea` to `6dd7598`, and `packages/client/src/engine/{quality,texture-memory,warmup,breadcrumbs}.ts`

Not read: Qualcomm's Adreno and Arm's current Mali best-practice guides (their pages render only with JavaScript).
Nothing here is taken from them.
