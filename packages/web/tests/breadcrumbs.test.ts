import { describe, expect, it } from 'vitest';
import { Breadcrumbs } from '../src/devtools/breadcrumbs';
import { watchContext } from '../src/devtools/context-watch';
import type { TrailStorage } from '../src/devtools/trail-storage';

function memoryStorage(): TrailStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (key) => data.get(key) ?? null, setItem: (key, value) => void data.set(key, value) };
}

describe('breadcrumbs', () => {
  it('hands the next session the trail this one left', () => {
    const storage = memoryStorage();
    let now = 0;
    const first = new Breadcrumbs({ storage, now: () => now });
    now = 1500;
    first.mark('globe ready');
    const second = new Breadcrumbs({ storage, now: () => now });
    expect(second.previous).toEqual(['1.5s globe ready']);
    expect(second.current).toEqual([]);
  });

  it('keeps only the newest steps', () => {
    const crumbs = new Breadcrumbs({ storage: null, now: () => 0, keep: 2 });
    crumbs.mark('a');
    crumbs.mark('b');
    crumbs.mark('c');
    expect(crumbs.current).toEqual(['0.0s b', '0.0s c']);
  });

  it('never throws when storage is broken or holds garbage', () => {
    const broken: TrailStorage = {
      getItem: () => '{not json',
      setItem: () => {
        throw new Error('quota exceeded');
      },
    };
    const crumbs = new Breadcrumbs({ storage: broken, now: () => 0 });
    expect(crumbs.previous).toEqual([]);
    expect(() => crumbs.mark('still fine')).not.toThrow();
  });

  it('marks a lost and a restored WebGL context', () => {
    const canvas = new EventTarget();
    const crumbs = new Breadcrumbs({ storage: null, now: () => 0 });
    const events: string[] = [];
    watchContext(canvas, crumbs, (event) => events.push(event));
    canvas.dispatchEvent(new Event('webglcontextlost'));
    canvas.dispatchEvent(new Event('webglcontextrestored'));
    expect(events).toEqual(['lost', 'restored']);
    expect(crumbs.current).toEqual(['0.0s context lost', '0.0s context restored']);
  });
});
