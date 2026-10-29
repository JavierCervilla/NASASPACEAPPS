/**
 * The seam between the dev tools and a WebGL renderer. The tools never import a renderer library: whoever owns the
 * renderer hands them a `RendererAdapter`, so the same readout serves Three.js today and could serve CesiumJS later.
 * Without an adapter the readout still shows frame rate, frame time, the trail and errors.
 */

/** What a renderer drew in its last frame. */
export interface RendererReading {
  readonly calls: number;
  readonly triangles: number;
  readonly pixelRatio: number;
  /** Drawing buffer size, in device pixels. */
  readonly width: number;
  readonly height: number;
  /** Textures the renderer holds on the GPU, when it counts them. */
  readonly textures?: number;
}

export interface RendererAdapter {
  /** The canvas the renderer draws to, watched for a lost WebGL context. */
  readonly canvas: EventTarget;
  /** The totals of the frame just drawn; called once per page frame. */
  read(): RendererReading;
  /** Starts the next frame's totals; omit it when the renderer resets them itself. */
  reset?(): void;
  /** Estimated GPU bytes of the textures on screen; it may walk a scene, so it is called only every few frames. */
  textureBytes?(): number;
}

/** The part of a `THREE.WebGLRenderer` the adapter reads, typed by shape so Three.js stays out of this module. */
export interface ThreeRendererLike {
  readonly domElement: HTMLCanvasElement;
  readonly info: {
    autoReset: boolean;
    readonly render: { readonly calls: number; readonly triangles: number };
    readonly memory: { readonly textures: number };
    reset(): void;
  };
  getPixelRatio(): number;
}

export interface ThreeAdapterOptions {
  /** Estimated texture bytes of the scene on screen, for the readout's texture line. */
  readonly textureBytes?: () => number;
}

/**
 * Adapts a Three.js renderer. It turns off `info.autoReset`, so the counts add up every render call of a frame
 * (a globe with a second pass still reads as one frame), and resets them after each reading.
 */
export function threeAdapter(renderer: ThreeRendererLike, options: ThreeAdapterOptions = {}): RendererAdapter {
  renderer.info.autoReset = false;
  const adapter: RendererAdapter = {
    canvas: renderer.domElement,
    read: () => ({
      calls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      pixelRatio: renderer.getPixelRatio(),
      width: renderer.domElement.width,
      height: renderer.domElement.height,
      textures: renderer.info.memory.textures,
    }),
    reset: () => renderer.info.reset(),
  };
  return options.textureBytes ? { ...adapter, textureBytes: options.textureBytes } : adapter;
}
