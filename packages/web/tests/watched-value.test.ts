import { describe, expect, it, vi } from 'vitest';
import { createWatchedValue } from '../src/lib/watched-value';

describe('createWatchedValue', () => {
  it('tells its listeners of a change, and only of a change', () => {
    const edge = createWatchedValue<number | null>(null);
    const listener = vi.fn();
    const stop = edge.subscribe(listener);
    edge.set(500);
    edge.set(500);
    expect(edge.get()).toBe(500);
    expect(listener).toHaveBeenCalledOnce();
    stop();
    edge.set(96);
    expect(listener).toHaveBeenCalledOnce();
  });
});
