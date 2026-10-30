/** Headers every API answer carries, whatever the route or the outcome. */
import type { MiddlewareHandler } from 'hono';

// The API serves JSON only: nothing in it may run, load or be framed.
const CONTENT_SECURITY_POLICY = "default-src 'none'; frame-ancestors 'none'";
const HTTP_FIRST_ERROR = 400;

/**
 * Sets nosniff and a restrictive Content-Security-Policy on every answer, and
 * `Cache-Control: no-store` on every error, so a browser or a proxy never
 * keeps a 4xx or 5xx; a successful answer keeps the cache policy its route
 * set.
 */
export function apiHeaders(): MiddlewareHandler {
  return async (c, next) => {
    await next();
    c.res.headers.set('X-Content-Type-Options', 'nosniff');
    c.res.headers.set('Content-Security-Policy', CONTENT_SECURITY_POLICY);
    if (c.res.status >= HTTP_FIRST_ERROR) {
      c.res.headers.set('Cache-Control', 'no-store');
    }
  };
}
