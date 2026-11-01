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
 * The globe's layer API on the page (VENT-37), the part another team's layer meets: the binder (bind.ts) mounting
 * each registered layer's root and renderer over the canvas in `z` order from the first drawn frame, following the
 * registry's changes, placing the shown layers on each frame and taking them all off; and the ready-made point
 * renderer (point-layer.ts). The web package has no DOM test environment, so `document` is a small fake below with
 * what the two modules touch: elements that append (moving a child already placed), remove, hide and take clicks.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Scene } from 'three';
import { bindLayers } from '../src/globe/layers/bind';
import { pointLayer, type LayerPoint } from '../src/globe/layers/point-layer';
import { createLayerRegistry, type LayerContext, type LayerFrame, type LayerRenderer } from '../src/globe/layers/registry';
import { latLonToVector, type Vec3 } from '../src/globe/geo';

class FakeNode {
  readonly children: FakeNode[] = [];
  parent: FakeNode | null = null;
  readonly dataset: Record<string, string> = {};
  readonly style: Record<string, string> = {};
  readonly attributes = new Map<string, string>();
  readonly listeners: ((event: unknown) => void)[] = [];
  className = '';
  type = '';
  hidden = false;
  readonly appended = vi.fn();

  constructor(readonly tagName: string) {}

  append(child: FakeNode): void {
    this.appended(child);
    child.remove();
    child.parent = this;
    this.children.push(child);
  }

  remove(): void {
    const siblings = this.parent?.children;
    siblings?.splice(siblings.indexOf(this), 1);
    this.parent = null;
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  addEventListener(_type: string, listener: (event: unknown) => void): void {
    this.listeners.push(listener);
  }

  click(event: { detail: number; clientX?: number; clientY?: number }): void {
    for (const listener of this.listeners) listener(event);
  }

  getBoundingClientRect() {
    return { left: 100, top: 50 };
  }
}

beforeEach(() => {
  vi.stubGlobal('document', { createElement: (tag: string) => new FakeNode(tag) });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const scene = {} as Scene;
/** Looking at the south pole from three Moon radii. */
const EYE: Vec3 = latLonToVector(-90, 0, 3);
/** The canvas seen from under the south pole: x and z of the unit sphere (y is the axis), 100 px per radius. */
const project = (at: Vec3) => ({ x: at.x * 100, y: at.z * 100 });

/** A host and a binder over `registry`. */
function bound(registry = createLayerRegistry()) {
  const host = new FakeNode('div');
  const invalidate = vi.fn();
  const binder = bindLayers(registry, { host: host as unknown as HTMLElement, scene, invalidate });
  const ids = () => host.children.map((root) => root.dataset['layer']);
  return { registry, host, invalidate, binder, ids, frame: () => binder.place(project, EYE) };
}

/** A renderer whose every part is a spy. */
function spyRenderer() {
  return { mount: vi.fn(), place: vi.fn(), show: vi.fn(), unmount: vi.fn() } satisfies LayerRenderer;
}

describe('the layer binder', () => {
  it('mounts nothing before the first drawn frame, then every layer in z order with its renderer', () => {
    const { registry, host, invalidate, ids, frame } = bound();
    const tracks = spyRenderer();
    registry.register({ id: 'tracks', z: 30, renderer: tracks });
    registry.register({ id: 'rovers', z: 10, visible: false });
    expect(host.children).toHaveLength(0);
    expect(tracks.mount).not.toHaveBeenCalled();
    frame();
    expect(ids()).toEqual(['rovers', 'tracks']);
    const [rovers, root] = host.children;
    expect(root?.className).toBe('globe-layer');
    expect([rovers?.hidden, root?.hidden]).toEqual([true, false]);
    expect(tracks.mount).toHaveBeenCalledWith({ root, scene, invalidate: expect.any(Function) });
    expect(tracks.show).toHaveBeenCalledWith(true);
    expect(invalidate).toHaveBeenCalled();
  });

  it('puts a layer registered later under the ones with a higher z', () => {
    const { registry, ids, frame } = bound();
    registry.register({ id: 'tracks', z: 30 });
    registry.register({ id: 'saved-sites', z: 20 });
    frame();
    registry.register({ id: 'rovers', z: 25 });
    registry.register({ id: 'zones', z: 5 });
    expect(ids()).toEqual(['zones', 'saved-sites', 'rovers', 'tracks']);
  });

  it('hides and shows a root on its flag, telling its renderer, and moves no root for it', () => {
    const { registry, host, ids, frame } = bound();
    const tracks = spyRenderer();
    registry.register({ id: 'tracks', z: 30, renderer: tracks });
    registry.register({ id: 'rovers', z: 10 });
    frame();
    host.appended.mockClear();
    registry.setVisible('tracks', false);
    expect(host.children[1]?.hidden).toBe(true);
    expect(tracks.show).toHaveBeenLastCalledWith(false);
    registry.setVisible('tracks', true);
    expect(host.children[1]?.hidden).toBe(false);
    expect(tracks.show).toHaveBeenLastCalledWith(true);
    // Moving a root would blur a focused marker in it.
    expect(host.appended).not.toHaveBeenCalled();
    expect(ids()).toEqual(['rovers', 'tracks']);
  });

  it('places only the shown layers on each frame, behind the limb as null', () => {
    const { registry, frame } = bound();
    const shown = spyRenderer();
    const hidden = spyRenderer();
    registry.register({ id: 'tracks', z: 1, renderer: shown });
    registry.register({ id: 'rovers', z: 2, renderer: hidden, visible: false });
    frame();
    frame();
    expect(shown.place).toHaveBeenCalledTimes(2);
    expect(hidden.place).not.toHaveBeenCalled();
    const lastFrame: LayerFrame = shown.place.mock.calls[1]![0];
    const near = lastFrame.project({ lat: -85, lonEast: 30 });
    const pole = latLonToVector(-85, 30);
    expect(near).toEqual(project(pole));
    expect(lastFrame.project({ lat: 60, lonEast: 30 })).toBeNull();
  });

  it('takes a layer off when it is unregistered, and every one on dispose, hearing no more', () => {
    const { registry, host, ids, binder, frame } = bound();
    const tracks = spyRenderer();
    const rovers = spyRenderer();
    registry.register({ id: 'tracks', z: 1, renderer: tracks });
    registry.register({ id: 'rovers', z: 2, renderer: rovers });
    frame();
    registry.unregister('tracks');
    expect(tracks.unmount).toHaveBeenCalledOnce();
    expect(ids()).toEqual(['rovers']);
    binder.dispose();
    expect(rovers.unmount).toHaveBeenCalledOnce();
    expect(host.children).toHaveLength(0);
    registry.register({ id: 'zones', z: 3 });
    frame();
    expect(host.children).toHaveLength(0);
  });
});

/** A context like the binder's, with a fake root. */
function context() {
  const root = new FakeNode('div');
  const invalidate = vi.fn();
  return { root, invalidate, ctx: { root: root as unknown as HTMLElement, scene, invalidate } satisfies LayerContext };
}

const RIM: LayerPoint = { id: 'rim', label: 'Saved site Rim', lat: -85.87, lonEast: 61.34 };
const RIDGE: LayerPoint = { id: 'ridge', label: 'Saved site Ridge', lat: -84.2, lonEast: -40 };
const NORTH: LayerPoint = { id: 'north', label: 'Saved site North', lat: 60, lonEast: 0 };

/** A frame from the south pole view. */
const southFrame: LayerFrame = {
  project: (point) => {
    const at = latLonToVector(point.lat, point.lonEast);
    return at.y < -0.5 ? project(at) : null;
  },
};

describe('the point layer', () => {
  it('makes no button before it is mounted, then a hidden, named button per point', () => {
    const layer = pointLayer({ className: 'saved-marker' });
    layer.setPoints([RIM, RIDGE]);
    const { root, invalidate, ctx } = context();
    layer.mount?.(ctx);
    expect(root.children).toHaveLength(2);
    const [rim] = root.children;
    expect(rim?.tagName).toBe('button');
    expect(rim?.type).toBe('button');
    expect(rim?.className).toBe('globe-point saved-marker');
    expect(rim?.attributes.get('aria-label')).toBe('Saved site Rim');
    expect(rim?.dataset['pointId']).toBe('rim');
    expect(rim?.hidden).toBe(true);
    expect(invalidate).toHaveBeenCalled();
  });

  it('places each button where the frame shows its point, and hides it behind the limb', () => {
    const layer = pointLayer({ className: 'saved-marker' });
    const { root, ctx } = context();
    layer.mount?.(ctx);
    layer.setPoints([RIM, NORTH]);
    layer.place?.(southFrame);
    const [rim, north] = root.children;
    const at = project(latLonToVector(RIM.lat, RIM.lonEast));
    expect(rim?.hidden).toBe(false);
    expect(rim?.style['transform']).toBe(`translate3d(${at.x}px, ${at.y}px, 0)`);
    expect(north?.hidden).toBe(true);
  });

  it('keeps a point\'s button across new points (a focused one stays), takes the gone ones out', () => {
    const layer = pointLayer({ className: 'saved-marker' });
    const { root, ctx } = context();
    layer.mount?.(ctx);
    layer.setPoints([RIM, RIDGE]);
    const rim = root.children[0];
    layer.setPoints([{ ...RIM, label: 'Saved site Rim camp' }, NORTH]);
    expect(root.children[0]).toBe(rim);
    expect(rim?.attributes.get('aria-label')).toBe('Saved site Rim camp');
    expect(root.children.map((el) => el.dataset['pointId'])).toEqual(['rim', 'north']);
  });

  it('hands a keyboard click its own point, and a pointer click the nearest shown point under it', () => {
    const onPick = vi.fn();
    const layer = pointLayer({ className: 'saved-marker', onPick });
    const { root, ctx } = context();
    layer.mount?.(ctx);
    const near = (lonEast: number, id: string): LayerPoint => ({ id, label: id, lat: -88, lonEast });
    layer.setPoints([near(0, 'a'), near(2, 'b')]);
    layer.place?.(southFrame);
    const [a, b] = root.children;
    a?.click({ detail: 0 });
    expect(onPick).toHaveBeenLastCalledWith('a');
    // The pointer sits on b's dot, inside a's 44 px target too: b is nearest.
    const bAt = project(latLonToVector(-88, 2));
    a?.click({ detail: 1, clientX: 100 + bAt.x, clientY: 50 + bAt.y });
    expect(onPick).toHaveBeenLastCalledWith('b');
    b?.click({ detail: 1, clientX: 100 + bAt.x + 200, clientY: 50 + bAt.y });
    expect(onPick).toHaveBeenLastCalledWith('b');
  });

  it('takes every button off on unmount, and makes them again on a new mount', () => {
    const layer = pointLayer({ className: 'saved-marker' });
    const first = context();
    layer.mount?.(first.ctx);
    layer.setPoints([RIM, RIDGE]);
    layer.unmount?.();
    expect(first.root.children).toHaveLength(0);
    layer.setPoints([RIM]);
    expect(first.root.children).toHaveLength(0);
    const second = context();
    layer.mount?.(second.ctx);
    expect(second.root.children.map((el) => el.dataset['pointId'])).toEqual(['rim']);
  });
});
