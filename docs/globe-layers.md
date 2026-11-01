# Globe layers (VENT-37)

The globe draws through a **layer registry**: every set of things on the Moon (Ventana's landing sites, approximate
zones and saved sites, or another team's rovers, tracks or areas) is a layer with an id, a stacking order and a
visible flag. The registry holds no Ventana interface: the Layers key and the phone's «Layers» group are only one
reader of it. Code: `packages/web/src/globe/layers/`.

## The pieces

| File | What |
|---|---|
| `registry.ts` | `createLayerRegistry(kept?)`: the registry, pure (no DOM, no Three.js) |
| `bind.ts` | `bindLayers(registry, host)`: mounts the registry on the running globe (the globe does this for you) |
| `point-layer.ts` | `pointLayer(options)`: a ready-made renderer for points as buttons over the canvas |
| `site-layers.ts` | Ventana's «Landing sites» and «Approximate zones», as layers over the site marker layer |
| `ids.ts` | Ventana's ids and z values: `landing-sites` (20), `approximate-zones` (10), `saved-sites` (30) |
| `kept-flags.ts` | `readFlags(storage)`, `keepFlags(registry, storage)`: the flags kept on the device (`ventana.layers`) |

## The API

```ts
interface LayerRegistry {
  register(layer: GlobeLayer): () => void;          // throws on a taken or malformed id; returns its unregister
  unregister(id: string): void;                     // the layer goes; its flag is kept
  setVisible(id: string, visible: boolean): void;   // works before the layer registers too
  isVisible(id: string): boolean;                   // true for an id never set
  list(): readonly LayerState[];                    // lowest z first, ties in registration order
  subscribe(listener: (change: LayerChange) => void): () => void;  // 'added' | 'removed' | 'visibility'
}

interface GlobeLayer {
  readonly id: string;            // lowercase words and hyphens: 'ghost-rovers'
  readonly z: number;             // higher paints over lower
  readonly visible?: boolean;     // default true, unless a kept flag says otherwise
  readonly renderer?: LayerRenderer;  // none: a flag only, which views read (the polar map does)
}

interface LayerRenderer {        // every method optional
  mount?(context: LayerContext): void;   // { root, scene, invalidate }: your element over the canvas, the Three.js scene
  place?(frame: LayerFrame): void;       // every drawn frame while shown; frame.project({ lat, lonEast }) → px or null
  show?(visible: boolean): void;         // the root is already hidden or shown for you
  unmount?(): void;                      // the globe is going (it may mount you again later)
}

function pointLayer(options: { className: string; onPick?: (id: string) => void }): LayerRenderer & {
  setPoints(points: readonly { id: string; lat: number; lonEast: number; label: string }[]): void;
};
```

How it behaves:

- **The page owns the registry** and passes it to the globe (`Globe.tsx` → `GlobeOptions.layers`). The globe mounts it
  from its first drawn frame and registers the two site layers on it while it runs. Register your layer whenever you
  like, before or after the globe starts; it is mounted as soon as both exist.
- **Each layer gets its own root** (`div.globe-layer[data-layer=<id>]`) over the canvas, in `z` order, hidden while
  the layer is. The roots let clicks through (`pointer-events: none`); give your markers `pointer-events: auto`
  (`.globe-point` does). Each root is its own stacking context at z-index 0, so the Layers key and every floating
  panel still paint over your markers.
- **Positions**: `frame.project(point)` gives CSS px from the canvas's top left, or `null` behind the limb. Move your
  elements with `transform` only; call `invalidate()` after changing what you draw so a frame comes.
- **Three.js objects**: add them to `context.scene` in `mount`, toggle their `visible` in `show`, remove them in
  `unmount`. The globe's Moon has radius 1 (`src/globe/geo.ts`, `latLonToVector`).
- **Flags**: `setVisible` is what the switches call; Ventana keeps every change in `localStorage` (`ventana.layers`), so
  a layer switched off stays off on the next visit. The polar map reads the same flags for its markers.
- **The site layers** («Landing sites», «Approximate zones») share Ventana's one marker layer, which culls zones over
  other markers and routes a click to the nearest dot across both kinds; their element stays first over the canvas,
  under every other root. A hidden layer never hides the **selected** site's marker.

## Example: a layer of rovers

```ts
import { pointLayer } from '../globe/layers/point-layer';

// `layers` is the page's registry (in Ventana: useSavedKit().layers, made in components/saved/use-saved-kit.ts).
const rovers = pointLayer({
  className: 'rover-marker',                 // your CSS: the look inside the 44 px target
  onPick: (id) => console.info('picked', id),
});
const unregister = layers.register({ id: 'ghost-rovers', z: 40, renderer: rovers });
rovers.setPoints([
  { id: 'yutu-2', lat: -45.44, lonEast: 177.6, label: 'Yutu-2 rover' },
]);

layers.setVisible('ghost-rovers', false);    // hide it (a switch would do this)
unregister();                                // take it away
```

A layer with nothing to draw on the globe (a flag the polar map or a list reads) registers without a renderer:
`layers.register({ id: 'traverses', z: 15 })`.

## Ventana's own layers

- `landing-sites` and `approximate-zones`: registered by the globe (`site-layers.ts`) while it runs.
- `saved-sites`: the sites saved on this device, silver pins (look C), registered by the page
  (`components/saved/use-saved-layer.ts`) with `pointLayer`; the selected one is left to the standing pin.

Tests: `packages/web/tests/globe-layers.test.ts` (registry, site layers, kept flags, two tabs on one storage),
`packages/web/tests/globe-layer-bind.test.ts` (the binder's mount, `z` order, flags, frames and teardown; the point
layer's buttons, placing, clicks and unmount) and
`tests/e2e/saved-sites.spec.ts` (each switch on the globe and the polar map, kept across a reload).
