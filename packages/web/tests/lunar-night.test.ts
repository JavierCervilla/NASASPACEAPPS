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
 * The lunar night of the 3D view (VENT-100, the human's «intermediate» night): when it is night at the point, the lights
 * it gets, the Sun's mask that no longer puts out the Earth's light, the notice of when the Sun rises (the «Sunrise in»
 * widget's count) and the caption's night line.
 */
import { MeshStandardMaterial, ShaderLib } from 'three';
import { describe, expect, it } from 'vitest';
import { computedHours, shadowedHours, skyAt, terrainHours, toIso, type SiteShadow } from '@ventana/sim';
import { bodyWidget, SUN } from '../src/phone/body-widget';
import { shippedTerrain } from '../src/source/terrain-profiles';
import { isNight, NIGHT_LIGHT, nightLight } from '../src/terrain/night-light';
import { nightNotice } from '../src/terrain/night-notice';
import { createFillUniforms, patchPhotometry } from '../src/terrain/scene/ground-photometry';
import { createSky, FILL, KEY_INTENSITY } from '../src/terrain/scene/sky';
import { placeSky } from '../src/terrain/scene/sky-place';
import { createSunMask, maskSun } from '../src/terrain/scene/sun-mask';
import { captionNote } from '../src/terrain/view-text';
import { direction } from '../src/terrain/view-camera';
import { EN, i18nOf } from './i18n-factories';

const IM2 = { latDeg: -84.7906, lonEastDeg: 29.1957 };
const IM2_PLACE = { lat: IM2.latDeg, lonEast: IM2.lonEastDeg };
const PROFILE = shippedTerrain()('im2-athena')!;
/** Sun −3.7°, Earth −0.3° at IM-2. */
const NIGHT_MS = Date.parse('2026-11-06T15:04:00Z');
/** Earth +1.8°, the Sun down. */
const EARTH_UP_MS = Date.parse('2026-12-02T00:00:00Z');
/** Sun −0.3° under the terrain, Earth +7.0° over it («Earth only»). */
const EARTH_OVER_MS = Date.parse('2026-11-01T12:00:00Z');
/** Sun +6.7°. */
const DAY_MS = Date.parse('2026-11-22T00:00:00Z');
/** The Sun 0.1° under the level but over IM-2's ridge (horizon.spec.ts). */
const RIDGE_MS = Date.parse('2026-11-30T20:00:00Z');
const PSR: SiteShadow = { kind: 'psr', avgSun: 0, source: { label: 'test', url: 'https://example.org' } };

describe('when it is night at the point', () => {
  it('is night with the Sun under the terrain, day with it over, even under the level', () => {
    expect(isNight(skyAt(IM2, NIGHT_MS), PROFILE)).toBe(true);
    expect(isNight(skyAt(IM2, DAY_MS), PROFILE)).toBe(false);
    const ridge = skyAt(IM2, RIDGE_MS);
    expect(ridge.sunEl).toBeLessThan(0);
    expect(isNight(ridge, PROFILE)).toBe(false);
  });

  it('reads the level when the point has no profile', () => {
    expect(isNight({ sunAz: 0, sunEl: -0.1, earthAz: 0, earthEl: 0 }, null)).toBe(true);
    expect(isNight({ sunAz: 0, sunEl: 0.1, earthAz: 0, earthEl: 0 }, null)).toBe(false);
  });
});

describe('the night lights', () => {
  const sky = (earthEl: number) => ({ sunAz: 0, sunEl: -10, earthAz: 90, earthEl });
  const phase = (earthEl: number): number => {
    const s = direction(0, -10);
    const e = direction(90, earthEl);
    return (1 - (s[0] * e[0] + s[1] * e[1] + s[2] * e[2])) / 2;
  };

  it('keeps a quarter of the day\'s lifted floor and a low reading light from 300°, 10° up', () => {
    expect(NIGHT_LIGHT.floor).toBe(0.25);
    const light = nightLight(sky(10), null);
    expect(light.floor).toBe(0.25);
    expect(light.reading.intensity).toBe(0.15);
    expect(light.reading.toward).toEqual(direction(300, 10));
  });

  it('gives the Earth\'s light by its lit share and how far it is up, half the key at most', () => {
    expect(nightLight(sky(-1), null).earthshine.intensity).toBe(0);
    expect(nightLight(sky(-0.3), null).earthshine.intensity).toBeCloseTo(0.5 * phase(-0.3) * 0.1, 12);
    expect(nightLight(sky(1.8), null).earthshine.intensity).toBeCloseTo(0.5 * phase(1.8), 12);
    expect(nightLight(sky(30), null).earthshine.intensity).toBeLessThanOrEqual(0.5);
  });

  it('reads the Earth\'s height over the terrain: none while a ridge hides it', () => {
    const wall = { centiDeg: new Int16Array(720).fill(500) };
    expect(nightLight(sky(4.4), wall).earthshine.intensity).toBe(0);
    expect(nightLight(sky(5.5), wall).earthshine.intensity).toBeCloseTo(0.5 * phase(5.5) * 0.5, 12);
    const over = skyAt(IM2, EARTH_OVER_MS);
    expect(isNight(over, PROFILE)).toBe(true);
    expect(nightLight(over, PROFILE).earthshine.intensity).toBeGreaterThan(0.2);
  });

  it('are placed on the sky at night and taken back by day, the day\'s untouched', () => {
    const parts = createSky(1, 256);
    const day = skyAt(IM2, DAY_MS);
    placeSky(parts, day, [1, 0, 0, 0, 1, 0, 0, 0, 1], null);
    const dayState = { fill: parts.fill.intensity, bounce: parts.bounce.color.getHex(),
      earth: parts.earthshine.intensity, bounceI: parts.bounce.intensity };
    expect(dayState.fill).toBe(FILL.intensity);
    const up = skyAt(IM2, EARTH_OVER_MS);
    placeSky(parts, up, [1, 0, 0, 0, 1, 0, 0, 0, 1], { profile: PROFILE });
    const night = nightLight(up, PROFILE);
    expect(parts.fill.intensity).toBeCloseTo(FILL.intensity * 0.25, 12);
    expect(parts.earthshine.intensity).toBeCloseTo(night.earthshine.intensity * KEY_INTENSITY, 12);
    expect(parts.earthshine.intensity).toBeGreaterThan(0);
    expect(parts.bounce.intensity).toBeCloseTo(0.15 * KEY_INTENSITY, 12);
    expect(parts.bounce.position.clone().normalize().toArray()
      .map((c) => Number(c.toFixed(9)))).toEqual(direction(300, 10).map((c) => Number(c.toFixed(9))));
    placeSky(parts, day, [1, 0, 0, 0, 1, 0, 0, 0, 1], null);
    expect({ fill: parts.fill.intensity, bounce: parts.bounce.color.getHex(),
      earth: parts.earthshine.intensity, bounceI: parts.bounce.intensity }).toEqual(dayState);
  });
});

describe('the Sun\'s mask', () => {
  const masked = (byVertex: boolean, photometry: boolean): string => {
    const material = new MeshStandardMaterial();
    maskSun(material, createSunMask(), byVertex);
    const shader = { vertexShader: ShaderLib.physical.vertexShader,
      fragmentShader: ShaderLib.physical.fragmentShader, uniforms: {} } as unknown as Parameters<typeof patchPhotometry>[0];
    material.onBeforeCompile(shader, undefined as never);
    if (photometry) patchPhotometry(shader, createFillUniforms());
    return shader.fragmentShader;
  };

  it('at night masks only the first directional light, the Sun', () => {
    const source = masked(true, false);
    const wrapper = source.slice(source.indexOf('void RE_Direct_SunMasked'), source.indexOf('#define RE_Direct RE_Direct_SunMasked'));
    expect(wrapper).toContain('uSunNight');
    expect(wrapper).toContain('directionalLights[0].direction');
    expect(wrapper).toContain('directLight.color *= vLit * uSunMask');
    expect(source).toContain('uniform float uSunNight;');
  });

  it('by day masks all the direct light as before, at night none of the rest', () => {
    const source = masked(false, false);
    expect(source).toContain('reflectedLight.directDiffuse *= mix(uSunMask, 1.0, uSunNight);');
    expect(source).toContain('reflectedLight.directSpecular *= mix(uSunMask, 1.0, uSunNight);');
  });

  it('wraps the lunar photometry of the high tier, not the other way round', () => {
    const source = masked(true, true);
    const ground = source.indexOf('#define RE_Direct RE_Direct_Ground');
    const wrapper = source.indexOf('void RE_Direct_SunMasked');
    expect(ground).toBeGreaterThan(-1);
    expect(wrapper).toBeGreaterThan(ground);
    expect(source.lastIndexOf('#define RE_Direct ')).toBe(source.indexOf('#define RE_Direct RE_Direct_SunMasked'));
  });

  it('starts by day', () => {
    expect(createSunMask().night.value).toBe(0);
  });
});

describe('the night notice', () => {
  const place = { ...IM2_PLACE, profile: PROFILE };

  it('says when the Sun rises, as the «Sunrise in» widget counts it', () => {
    expect(nightNotice(place, NIGHT_MS, EN)).toEqual({
      title: 'Lunar night here', rise: 'The Sun rises in 8 d 16 h' });
    const at = Math.floor(NIGHT_MS / 3_600_000) * 3_600_000;
    const hours = terrainHours(shadowedHours(computedHours(IM2, toIso(at), toIso(at + 720 * 3_600_000)), undefined), PROFILE);
    expect(bodyWidget(SUN, hours, hours[0]!, EN).value).toBe('8 d 16 h');
  });

  it('counts from any night hour, the Earth up or down', () => {
    expect(nightNotice(place, EARTH_UP_MS, EN)?.rise).toBe('The Sun rises in 13 d 5 h');
  });

  it('speaks the page\'s language', () => {
    // Spanish keeps a number with its unit by a no-break space.
    expect(nightNotice(place, NIGHT_MS, i18nOf('es'))?.rise.replace(/\s/gu, ' ')).toBe('El Sol sale en 8 d 16 h');
  });

  it('shows nothing by day, nor where the Sun never comes', () => {
    expect(nightNotice(place, DAY_MS, EN)).toBeNull();
    expect(nightNotice(place, RIDGE_MS, EN)).toBeNull();
    expect(nightNotice({ ...place, shadow: PSR }, NIGHT_MS, EN)).toBeNull();
  });
});

describe('the caption at night', () => {
  it('says the light is added, not the day\'s exposure', () => {
    expect(captionNote(EN, true)).toBe('Earth: NASA Blue Marble · light added for legibility');
    expect(captionNote(EN, false)).toBe('Earth: NASA Blue Marble · shadows lifted and exposure raised 20 % for legibility');
    expect(captionNote(EN)).toBe(captionNote(EN, false));
  });
});
