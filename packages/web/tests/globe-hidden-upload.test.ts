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

// A map that arrives while the globe is hidden (VENT-52): on a phone the on-foot and DSN views hide the globe but
// keep it mounted (VENT-51), and a Moon map that finished loading then went to the GPU at once (`initTexture`), out of
// any drawn frame, while the visible view had the GPU. Hidden, the upload waits: the first frame drawn once the globe
// shows again uploads the map, as Three.js does for any texture not yet on the GPU.
import { MeshLambertMaterial, Texture, type WebGLRenderer } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { moonTextureDeps } from '../src/globe/moon-textures';
import { shownFrames } from '../src/globe/shown-frames';

function fakeRenderer() {
  const initTexture = vi.fn();
  const renderer = { initTexture, capabilities: { getMaxAnisotropy: () => 16 } } as unknown as WebGLRenderer;
  return { renderer, initTexture };
}

const host = (width: number, height: number) => ({
  size: () => ({ width, height }),
  resize: vi.fn(),
  invalidate: vi.fn(),
});

describe('a Moon map that arrives while the globe is hidden', () => {
  it('is not uploaded to the GPU; shown, it is', () => {
    const { renderer, initTexture } = fakeRenderer();
    let shown = false;
    const deps = moonTextureDeps({
      renderer,
      material: new MeshLambertMaterial(),
      tier: 'medium',
      onChange: vi.fn(),
      shown: () => shown,
    });
    const map = new Texture();
    deps.upload(map);
    expect(initTexture).not.toHaveBeenCalled();
    shown = true;
    deps.upload(map);
    expect(initTexture).toHaveBeenCalledWith(map);
  });

  it('reads whether the globe shows from its frames: hidden at 0 x 0, shown again once sized', () => {
    const frames = shownFrames(() => false);
    expect(frames.shown()).toBe(true);
    frames.fit(host(0, 0));
    expect(frames.shown()).toBe(false);
    frames.fit(host(390, 844));
    expect(frames.shown()).toBe(true);
  });
});
