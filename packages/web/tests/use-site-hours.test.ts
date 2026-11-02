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
 * «Try again» on a site's month asks the API's hours again and, with them, every point's terrain horizon whose
 * passing failure outlasted its retries (VENT-45). The hook is rendered once on the server renderer, which runs no
 * effect, and its retry is pressed after.
 */
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { useSiteHours, type HoursParts } from '../src/components/use-site-hours';
import { createSourceStore } from '../src/source/data-source';

/** The retry `useSiteHours` hands out over `parts`, for site `id` with no instant. */
function retryOf(parts: HoursParts): () => void {
  let retry = (): void => undefined;
  const Probe = () => {
    retry = useSiteHours(parts, '@-85.50,40.00', null).retry;
    return null;
  };
  renderToString(createElement(Probe));
  return retry;
}

describe('«Try again» on a month', () => {
  it('asks again for the terrain horizons whose tries ran out', () => {
    const retryFailed = vi.fn();
    const retry = retryOf({
      load: vi.fn(async () => []),
      computed: () => null,
      source: createSourceStore(null),
      horizons: { retryFailed },
    });
    retry();
    expect(retryFailed).toHaveBeenCalledTimes(1);
  });

  it('works without a horizon store', () => {
    const retry = retryOf({ load: vi.fn(async () => []), computed: () => null, source: createSourceStore(null) });
    expect(retry).not.toThrow();
  });
});
