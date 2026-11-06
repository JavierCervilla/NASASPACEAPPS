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
 * Where the Moon's colour maps can come as KTX2 (VENT-101): ETC2 where the
 * GPU samples it (never on desktop Linux exposing all four families, the
 * formats Mesa emulates, as three's KTX2Loader rules), else BC1 with S3TC and
 * its sRGB variant, else JPEG. Never RGBA: the JPEG is better for that.
 */
import { describe, expect, it } from 'vitest';
import { EMPTY_PROFILE, type GpuProfile } from '../src/lib/gpu-profile';
import {
  ktx2Choice,
  ktx2Target,
  pagePlatform,
} from '../src/globe/ktx2-target';

type Formats = GpuProfile['textureFormats'];

function profile(formats: Partial<Formats>): GpuProfile {
  return {
    ...EMPTY_PROFILE,
    textureFormats: { ...EMPTY_PROFILE.textureFormats, ...formats },
  };
}

const PIXEL = profile({ astc: true, etc2: true, etc1: true, rgtc: true });
const WINDOWS = profile({ s3tc: true, s3tcSrgb: true, bptc: true, rgtc: true });
const EVERYTHING = profile({
  astc: true, etc2: true, etc1: true, s3tc: true, s3tcSrgb: true,
  bptc: true, rgtc: true,
});

describe('the KTX2 target', () => {
  it.each([
    ['the Pixel 10', PIXEL, 'other', 'etc2'],
    ['Windows with S3TC, sRGB and BPTC', WINDOWS, 'other', 'bc1'],
    ['desktop Linux exposing every family', EVERYTHING, 'linux-desktop', 'bc1'],
    ['SwiftShader in the container', EVERYTHING, 'linux-desktop', 'bc1'],
    ['an Android phone with every family', EVERYTHING, 'other', 'etc2'],
    ['S3TC without its sRGB variant', profile({ s3tc: true }), 'other', null],
    ['RGTC alone', profile({ rgtc: true }), 'other', null],
    ['no context', EMPTY_PROFILE, 'other', null],
  ] as const)('%s → %s', (_name, gpu, platform, target) => {
    expect(ktx2Target(gpu, platform)).toBe(target);
  });

  it('keeps ETC2 on desktop Linux when not every family is exposed', () => {
    const mesaLess = profile({ etc2: true, s3tc: true, s3tcSrgb: true });
    expect(ktx2Target(mesaLess, 'linux-desktop')).toBe('etc2');
  });

  it('tells desktop Linux from Android', () => {
    expect(pagePlatform({ platform: 'Linux x86_64', userAgent: 'X11; Linux' }))
      .toBe('linux-desktop');
    expect(pagePlatform({
      platform: 'Linux armv81', userAgent: 'Linux; Android 16; Pixel 10',
    })).toBe('other');
    expect(pagePlatform({ platform: 'Win32', userAgent: 'Windows NT' }))
      .toBe('other');
  });
});

describe('the KTX2 choice', () => {
  it('follows the profile', () => {
    expect(ktx2Choice(PIXEL, 'other', '')).toEqual({ target: 'etc2' });
  });

  it('is off on ?ktx2=0, whatever the GPU', () => {
    expect(ktx2Choice(PIXEL, 'other', '?debug&ktx2=0'))
      .toEqual({ target: null, reason: '?ktx2=0' });
  });

  it('says why without a usable format', () => {
    expect(ktx2Choice(EMPTY_PROFILE, 'other', ''))
      .toEqual({ target: null, reason: 'no ETC2 or BC1' });
  });

  it('is off under Save-Data, whatever the GPU and the address (VENT-107)',
    () => {
      expect(ktx2Choice(PIXEL, 'other', '', true))
        .toEqual({ target: null, reason: 'Save-Data' });
      expect(ktx2Choice(PIXEL, 'other', '?ktx2=0', true))
        .toEqual({ target: null, reason: 'Save-Data' });
    });
});
