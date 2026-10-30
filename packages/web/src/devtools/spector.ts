/**
 * Spector.js, the WebGL frame capture tool, started on `#stats-spector`.
 * A dev-only dependency fetched only when asked for: it adds about 1 MB.
 *
 * Split out of dev-tools.ts, ported from GAMESTUDIO's Web starter
 * (`studio/engines/web/scaffold/packages/client/src/engine/dev-tools.ts`).
 */

/** Spies on every canvas from now on and shows Spector.js's capture UI. */
export async function startSpector(): Promise<void> {
  const { Spector } = await import('spectorjs');
  const spector = new Spector();
  spector.spyCanvases();
  spector.displayUI();
}
