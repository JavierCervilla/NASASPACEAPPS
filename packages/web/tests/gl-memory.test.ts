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
 * What the page remembers of its WebGL (VENT-69): a context that cannot be
 * made is a block, not an absence, only on a browser that has the WebGL
 * constructors and made or lost a context here before; the browser's own
 * message is never what decides.
 */
import { describe, expect, it } from 'vitest';
import { wordsOf } from '../src/components/terrain/OnFootStatus';
import { sceneFailure } from '../src/terrain/scene/load-scene';
import { GL_LOST_KEY, GL_WORKED_KEY, hadGl, markGl } from '../src/lib/gl-marks';
import {
  GlUnavailableError,
  classifyGlFailure,
  hasGlConstructors,
  isGlBlocked,
} from '../src/lib/gl-memory';

function memory(broken = false) {
  const items = new Map<string, string>();
  const refuse = (): never => {
    throw new Error('refused');
  };
  return { items, getItem: broken ? refuse : (k: string) => items.get(k) ?? null,
    setItem: broken ? refuse : (k: string, v: string) => void items.set(k, v) };
}

describe('the marks', () => {
  it('remember a context made, or lost, and nothing otherwise', () => {
    expect(hadGl(memory())).toBe(false);
    const worked = memory();
    markGl(worked, GL_WORKED_KEY, 5);
    expect(hadGl(worked)).toBe(true);
    expect(worked.items.get(GL_WORKED_KEY)).toBe('5');
    const lost = memory();
    markGl(lost, GL_LOST_KEY, 9);
    expect(hadGl(lost)).toBe(true);
  });

  it('cost nothing when the storage is missing or refuses', () => {
    expect(() => markGl(null, GL_WORKED_KEY, 1)).not.toThrow();
    expect(() => markGl(memory(true), GL_WORKED_KEY, 1)).not.toThrow();
    expect(hadGl(null)).toBe(false);
    expect(hadGl(memory(true))).toBe(false);
  });
});

describe('blocked or absent', () => {
  const marked = memory();
  markGl(marked, GL_WORKED_KEY, 1);

  it('is a block when WebGL exists and worked before', () => {
    expect(classifyGlFailure({ constructors: true, storage: marked })).toBe('blocked');
  });

  it('is a block after a recorded loss too', () => {
    const lost = memory();
    markGl(lost, GL_LOST_KEY, 1);
    expect(classifyGlFailure({ constructors: true, storage: lost })).toBe('blocked');
  });

  it('is an absence when it never worked here, or when storage tells nothing', () => {
    expect(classifyGlFailure({ constructors: true, storage: memory() })).toBe('absent');
    expect(classifyGlFailure({ constructors: true, storage: null })).toBe('absent');
  });

  it('is an absence when the browser has no WebGL constructors, marks or not', () => {
    expect(classifyGlFailure({ constructors: false, storage: marked })).toBe('absent');
  });

  it('reads the constructors off the scope', () => {
    expect(hasGlConstructors({})).toBe(false);
    expect(hasGlConstructors({ WebGLRenderingContext: function () {} })).toBe(true);
    expect(hasGlConstructors({ WebGL2RenderingContext: function () {} })).toBe(true);
  });
});

describe('GlUnavailableError', () => {
  it('keeps the browser\'s message for the report, and decides on the kind alone', () => {
    const blocked = new GlUnavailableError('blocked', 'Web page caused context loss', new Error('x'));
    expect(blocked.message).toContain('Web page caused context loss');
    expect(blocked.statusMessage).toBe('Web page caused context loss');
    expect(isGlBlocked(blocked)).toBe(true);
    expect(isGlBlocked(new GlUnavailableError('blocked', undefined, null))).toBe(true);
    expect(isGlBlocked(new GlUnavailableError('absent', 'Web page caused context loss', null))).toBe(false);
    expect(isGlBlocked(new Error('Error creating WebGL context.'))).toBe(false);
  });
});

describe('what each surface says', () => {
  const blocked = new GlUnavailableError('blocked', undefined, null);
  const absent = new GlUnavailableError('absent', undefined, null);

  it('tells the on-foot scene a block from a failure', () => {
    expect(sceneFailure(blocked)).toBe('blocked');
    expect(sceneFailure(absent)).toBe('failed');
    expect(sceneFailure(new Error('x'))).toBe('failed');
  });

  it('says the block in the view, and keeps today\'s words otherwise', () => {
    const facts = { located: true, tile: { kind: 'ready' } as never };
    expect(wordsOf({ ...facts, scene: 'blocked' })).toBe('gl.blocked');
    expect(wordsOf({ ...facts, scene: 'failed' })).toBe('onFoot.noWebgl');
  });
});
