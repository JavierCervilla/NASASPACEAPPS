/**
 * The sheet's detent as React state, starting where the session left it
 * and kept for the session on every change (phone/sheet-memory.ts).
 */
import { useState } from 'react';
import {
  readSheetDetent,
  saveSheetDetent,
  sessionStore,
} from '../../phone/sheet-memory';
import type { DetentName } from '../../sheet/sheet-physics';

export function useSheetDetent(): [DetentName, (d: DetentName) => void] {
  const [detent, setDetent] = useState(() => readSheetDetent(sessionStore()));
  const choose = (next: DetentName): void => {
    saveSheetDetent(sessionStore(), next);
    setDetent(next);
  };
  return [detent, choose];
}
