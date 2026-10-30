/**
 * The elements of the readout's panel: the panel itself, the readout button
 * that folds it, the region it folds, the previous session's trail and the
 * error box.
 *
 * Split out of perf-hud.ts, ported from GAMESTUDIO's Web starter
 * (`studio/engines/web/scaffold/packages/client/src/engine/perf-hud.ts`).
 */
import { HUD_MARKER, PERF_TEXT } from './perf-text';

/** The panel, carrying the marker the production build check looks for. */
export function hudPanel(): HTMLElement {
  const panel = document.createElement('aside');
  panel.className = HUD_MARKER;
  panel.dataset['devtools'] = HUD_MARKER;
  panel.setAttribute('aria-label', PERF_TEXT.label);
  return panel;
}

/** Id of the region the readout button folds. */
const DETAILS_ID = `${HUD_MARKER}-details`;
/** Id of the readout's live text, the button's description. */
const TEXT_ID = `${HUD_MARKER}-text`;

/** The readout button and the element that holds its live text. */
export interface Readout {
  readonly button: HTMLButtonElement;
  readonly text: HTMLElement;
}

/**
 * The readout's text, as a button: a tap folds the panel. Its accessible name
 * stays short; the live numbers are its description, so a screen reader does
 * not read them as the name of a control.
 */
export function readoutButton(onClick: () => void): Readout {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `${HUD_MARKER}__readout`;
  button.setAttribute('aria-label', PERF_TEXT.label);
  button.setAttribute('aria-describedby', TEXT_ID);
  button.setAttribute('aria-controls', DETAILS_ID);
  button.setAttribute('aria-expanded', 'true');
  button.addEventListener('click', onClick);
  const text = document.createElement('span');
  text.id = TEXT_ID;
  button.append(text);
  return { button, text };
}

/** The region the readout button folds: everything but its text and errors. */
export function detailsRegion(): HTMLElement {
  const details = document.createElement('div');
  details.id = DETAILS_ID;
  return details;
}

/** Appends the previous session's trail to `parent`, when there is one. */
export function appendPreviousTrail(
  parent: HTMLElement,
  previous: readonly string[],
): void {
  if (previous.length === 0) return;
  const trail = document.createElement('div');
  trail.className = `${HUD_MARKER}__trail`;
  trail.textContent = `${PERF_TEXT.previousTrail}\n${previous.join('\n')}`;
  parent.append(trail);
}

/** The box under the readout where errors are shown. */
export function errorBox(): HTMLElement {
  const box = document.createElement('div');
  box.className = `${HUD_MARKER}__errors`;
  box.setAttribute('role', 'status');
  return box;
}
