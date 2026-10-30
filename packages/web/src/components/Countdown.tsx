import { useSyncExternalStore } from 'react';
import { daysUntil } from '../lib/countdown';

const MINUTE = 60_000;

function subscribe(onTick: () => void): () => void {
  const id = window.setInterval(onTick, MINUTE);
  return () => window.clearInterval(id);
}

// Rounded to the minute so consecutive reads return the same snapshot between
// ticks.
const readClock = (): number => Math.floor(Date.now() / MINUTE) * MINUTE;

/**
 * Days left until the hackathon opens. Hydrated island: proves React runs on
 * the deployed static site.
 */
export default function Countdown({ renderedAt }: { renderedAt: number }) {
  const now = useSyncExternalStore(subscribe, readClock, () => renderedAt);
  const days = daysUntil(now);
  return (
    <p className="countdown" data-testid="countdown">
      {days === 0 ? 'Hackathon weekend is on.' : `${days} ${days === 1 ? 'day' : 'days'} to launch.`}
    </p>
  );
}
