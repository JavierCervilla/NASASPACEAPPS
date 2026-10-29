/** Groups consecutive hours that share a condition into blocks. */
import type { HourSample, TimeBlock } from './site.ts';
import { HOUR_MS, addHours, toMs } from './time.ts';

/**
 * The runs of consecutive hours where `predicate` holds, in time order. Two samples are consecutive when they are
 * exactly one hour apart; a gap in the samples ends a block.
 */
export function groupBlocks(
  samples: readonly HourSample[],
  predicate: (sample: HourSample) => boolean,
): TimeBlock[] {
  const blocks: TimeBlock[] = [];
  let start: string | null = null;
  let hours = 0;
  let previousMs = Number.NaN;
  const close = (): void => {
    if (start !== null) blocks.push({ start, end: addHours(start, hours), hours });
    start = null;
    hours = 0;
  };
  for (const sample of samples) {
    const ms = toMs(sample.t);
    if (ms - previousMs !== HOUR_MS) close();
    previousMs = ms;
    if (!predicate(sample)) {
      close();
      continue;
    }
    start ??= sample.t;
    hours += 1;
  }
  close();
  return blocks;
}

/** The longest block (the earliest one on a tie), or `null` when there are none. */
export function longestBlock(blocks: readonly TimeBlock[]): TimeBlock | null {
  let best: TimeBlock | null = null;
  for (const block of blocks) {
    if (best === null || block.hours > best.hours) best = block;
  }
  return best;
}
