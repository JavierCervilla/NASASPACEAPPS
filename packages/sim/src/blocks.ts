/** Groups consecutive hours that share a condition into blocks. */
import type { HourSample, TimeBlock } from './site.ts';
import { HOUR_MS, addHours, toMs } from './time.ts';

/** A block being grown, hour by hour. */
interface Run {
  readonly start: string;
  hours: number;
}

function blockOf(run: Run): TimeBlock {
  const { start, hours } = run;
  return { start, end: addHours(start, hours), hours };
}

/**
 * The runs of consecutive hours where `predicate` holds, in time order. Two
 * samples are consecutive when they are exactly one hour apart; a gap in the
 * samples ends a block.
 */
export function groupBlocks(
  samples: readonly HourSample[],
  predicate: (sample: HourSample) => boolean,
): TimeBlock[] {
  const blocks: TimeBlock[] = [];
  let run: Run | null = null;
  let previousMs = Number.NaN;
  for (const sample of samples) {
    const ms = toMs(sample.t);
    const contiguous = ms - previousMs === HOUR_MS;
    previousMs = ms;
    const holds = predicate(sample);
    if (run !== null && (!contiguous || !holds)) {
      blocks.push(blockOf(run));
      run = null;
    }
    if (holds) {
      run ??= { start: sample.t, hours: 0 };
      run.hours += 1;
    }
  }
  if (run !== null) blocks.push(blockOf(run));
  return blocks;
}

/**
 * The longest block (the earliest one on a tie), or `null` when there are none.
 */
export function longestBlock(blocks: readonly TimeBlock[]): TimeBlock | null {
  let best: TimeBlock | null = null;
  for (const block of blocks) {
    if (best === null || block.hours > best.hours) best = block;
  }
  return best;
}
