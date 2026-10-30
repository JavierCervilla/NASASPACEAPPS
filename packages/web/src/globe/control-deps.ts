/** What the input handlers need from the globe around them. */
export interface ControlDeps {
  /** Asks the render loop for a frame. */
  readonly invalidate: () => void;
  /** Read at each gesture, so a change of the setting applies at once. */
  readonly reducedMotion: () => boolean;
  /** Height of the viewport in px, for the drag scale. */
  readonly heightPx: () => number;
}
