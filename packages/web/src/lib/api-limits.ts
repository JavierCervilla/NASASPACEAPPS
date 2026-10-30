/**
 * What the browser accepts from the API, so a hostile or broken answer
 * cannot steer a URL or fill the memory: the shape of a site id and the
 * largest body worth reading.
 */

/** A site id: lower-case letters, digits and hyphens, at most 64. */
const SITE_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
/** No answer the page asks for comes near this (92 days of hours). */
export const MAX_BODY_BYTES = 2 * 1024 * 1024;

/**
 * Whether `value` is a site id: safe as one path segment, so an id such as
 * `..` never changes the path it is put in.
 */
export function isSiteId(value: unknown): value is string {
  return typeof value === 'string' && SITE_ID.test(value);
}

/** Whether the response declares a body larger than {@link MAX_BODY_BYTES}. */
export function tooLarge(response: Response): boolean {
  const declared = Number(response.headers.get('content-length') ?? 0);
  return declared > MAX_BODY_BYTES;
}
