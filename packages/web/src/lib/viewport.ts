/**
 * The phone breakpoint, shared by the globe (its quality tier) and the
 * phone sheet. Must match the `max-width` media queries in the styles.
 */
export const PHONE_QUERY = '(max-width: 767.98px)';

/** Whether the viewport is phone-sized now. */
export function isPhoneViewport(): boolean {
  return typeof matchMedia === 'function' && matchMedia(PHONE_QUERY).matches;
}

/** Whether the browser asks to save data (the Save-Data hint). */
export function prefersSaveData(): boolean {
  if (typeof navigator === 'undefined') return false;
  const { connection } = navigator as { connection?: { saveData?: boolean } };
  return connection?.saveData === true;
}
