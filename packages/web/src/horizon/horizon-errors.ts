/*
 *   _   _       _                         _ _
 *  | | | |_ __ (_)_   _____ _ __ ___  ___| | | ___
 *  | | | | '_ \| \ \ / / _ \ '__/ __|/ _ \ | |/ _ \
 *  | |_| | | | | |\ V /  __/ |  \__ \  __/ | |  __/
 *   \___/|_| |_|_| \_/ \___|_|  |___/\___|_|_|\___|
 *
 *             =++==--::.
 *         %%%%##**++=--:..  .
 *      ##**#%@%%#***+=--::.   .
 *    #**=+*#*#**#++++=-:::.. .  .
 *   #++-====*@%+*++==--::...   .  .    Ventana Lunar
 *  #+=-=--++==+===-+==--:..   .  .  .  Sun, Earth and landing
 * #----====-------=-=---:..  .  .  .   windows at the lunar
 * #+---+=====--=---==-::..     .  .  . south pole
 * #*----==---==-=-=-:-....    .  .  .
 * *#----===+*===--:-::...    .  .  .   Built for the NASA Space
 *  *----=*-+*%*+=-:::....   .  .  .    Apps Challenge 2026,
 *   *------=+*=--:::-:::.. .  .  .     Madrid. Not endorsed
 *    %*===-=-==--==-:::.  .  .  .      by NASA.
 *      *+:--+:--::::::.  .  .  .
 *         -=:::...:..   .  .           (c) 2026 Universelle
 *             :::.. .  .               SPDX-License-Identifier: MIT
 */

/**
 * What a failed horizon request means (VENT-45), so the page knows whether
 * to ask again: a point outside the server's terrain (404) and a server
 * with none installed are answers; the network, a busy server (503), a
 * rate limit (429), a timeout and any other 5xx pass, and are retried as
 * long as their Retry-After asks.
 */

/**
 * The server has no terrain installed yet (VENT-43): its 503 says so in
 * `error`, unlike a busy one, so the strip can tell the two apart.
 */
export class TerrainNotInstalledError extends Error {
  constructor() {
    super('horizon: terrain not installed');
    this.name = 'TerrainNotInstalledError';
  }
}

/** No terrain covers the point: the server's 404, which stays true. */
export class NoTerrainHereError extends Error {
  constructor() {
    super('horizon: no terrain covers this point');
    this.name = 'NoTerrainHereError';
  }
}

/**
 * A failure that may pass: worth asking again after `retryAfterMs`, the
 * server's Retry-After (null: it named no wait).
 */
export class TransientHorizonError extends Error {
  constructor(
    readonly retryAfterMs: number | null,
    why = 'horizon: passing failure',
  ) {
    super(why);
    this.name = 'TransientHorizonError';
  }
}

/** The server's `error` for a 503 with no terrain installed. */
const NOT_INSTALLED = 'terrain data is not installed';
const HTTP_NOT_FOUND = 404;
const HTTP_TIMEOUT = 408;
const HTTP_TOO_MANY = 429;
const HTTP_UNAVAILABLE = 503;
const HTTP_FIRST_SERVER_ERROR = 500;
const MS_PER_S = 1000;
/** Retry-After in whole seconds; its date form is not used by the API. */
const SECONDS = /^\d+$/;

/** The Retry-After of `response`, ms; null when it names no seconds. */
function retryAfterOf(response: Response): number | null {
  const value = response.headers.get('retry-after')?.trim() ?? '';
  return SECONDS.test(value) ? Number(value) * MS_PER_S : null;
}

/** The error that `response`, not ok, stands for. */
export async function failureOf(response: Response): Promise<Error> {
  const { status } = response;
  if (status === HTTP_NOT_FOUND) return new NoTerrainHereError();
  const passing = status === HTTP_TIMEOUT || status === HTTP_TOO_MANY ||
    status >= HTTP_FIRST_SERVER_ERROR;
  if (!passing) return new Error(`horizon ${status}`);
  if (status === HTTP_UNAVAILABLE) {
    const body = (await response.json().catch(() => null)) as {
      readonly error?: unknown;
    } | null;
    if (body?.error === NOT_INSTALLED) return new TerrainNotInstalledError();
  }
  return new TransientHorizonError(retryAfterOf(response), `horizon ${status}`);
}
