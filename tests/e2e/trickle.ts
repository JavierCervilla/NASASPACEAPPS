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
 * Holds a response the way a slow but live connection does (VENT-78's terms): its headers go at once and a space,
 * which JSON allows before a value, every second until the test releases the body. A request held with no bytes at all
 * is cut by the ring's silence watch after 4 s and its tries run out in about 27 s; a trickled one is never cut.
 */
import { createServer, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Route } from '@playwright/test';

const BEAT_MS = 1000;

export interface Trickle {
  /** Answers `route` from the trickle: headers now, the body on `release(key, body)`. */
  readonly hold: (route: Route, key: string) => Promise<void>;
  /** Sends `body` on the held response named `key` and ends it. */
  readonly release: (key: string, body: string) => void;
  readonly close: () => Promise<void>;
}

/** Starts a trickle server on a free local port. */
export async function startTrickle(): Promise<Trickle> {
  const waiting = new Map<string, ServerResponse>();
  const beats = new Map<string, NodeJS.Timeout>();
  // A body released before its request reached the server (the test can release as soon as the route is held).
  const early = new Map<string, string>();
  const server = createServer((request, response) => {
    const key = decodeURIComponent(new URL(request.url ?? '/', 'http://x').pathname.slice(1));
    response.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
    const body = early.get(key);
    if (body !== undefined) {
      early.delete(key);
      response.end(body);
      return;
    }
    response.write(' ');
    waiting.set(key, response);
    beats.set(key, setInterval(() => response.write(' '), BEAT_MS));
    response.on('close', () => clearInterval(beats.get(key)));
  });
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  const { port } = server.address() as AddressInfo;
  return {
    hold: (route, key) => route.continue({ url: `http://127.0.0.1:${port}/${encodeURIComponent(key)}` }),
    release: (key, body) => {
      const response = waiting.get(key);
      if (!response) {
        early.set(key, body);
        return;
      }
      clearInterval(beats.get(key));
      response.end(body);
      waiting.delete(key);
    },
    close: () => {
      for (const beat of beats.values()) clearInterval(beat);
      server.closeAllConnections();
      return new Promise((done) => server.close(() => done()));
    },
  };
}
