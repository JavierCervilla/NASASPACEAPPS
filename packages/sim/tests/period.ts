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
 * Period estimation for the validation test: a least-squares fit of `a·sin(2πt/P) + b·cos(2πt/P) + c + d·t` for
 * every candidate period P on a grid, keeping the P with the smallest residual. The linear term absorbs the slow
 * seasonal drift, so it does not pull the estimate.
 */

// Solves the 4x4 linear system `m · x = v` by Gaussian elimination with partial pivoting.
function solve4(m: number[][], v: number[]): number[] {
  const a = m.map((row, i) => [...row, v[i] ?? 0]);
  const n = a.length;
  for (let col = 0; col < n; col += 1) {
    let pivot = col;
    for (let r = col + 1; r < n; r += 1) if (Math.abs(a[r]![col]!) > Math.abs(a[pivot]![col]!)) pivot = r;
    [a[col], a[pivot]] = [a[pivot]!, a[col]!];
    for (let r = col + 1; r < n; r += 1) {
      const f = a[r]![col]! / a[col]![col]!;
      for (let k = col; k <= n; k += 1) a[r]![k]! -= f * a[col]![k]!;
    }
  }
  const x = new Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r -= 1) {
    let s = a[r]![n]!;
    for (let k = r + 1; k < n; k += 1) s -= a[r]![k]! * x[k]!;
    x[r] = s / a[r]![r]!;
  }
  return x;
}

function residual(days: readonly number[], values: readonly number[], period: number): number {
  // Normal equations accumulated in one pass: m = sum of b·bT, v = sum of b·y, with b = [sin, cos, 1, t].
  const m = [0, 1, 2, 3].map(() => [0, 0, 0, 0]);
  const v = [0, 0, 0, 0];
  const w = (2 * Math.PI) / period;
  const basis = (t: number): number[] => [Math.sin(w * t), Math.cos(w * t), 1, t];
  days.forEach((t, k) => {
    const b = basis(t);
    for (let i = 0; i < 4; i += 1) {
      v[i]! += b[i]! * values[k]!;
      for (let j = 0; j < 4; j += 1) m[i]![j]! += b[i]! * b[j]!;
    }
  });
  const x = solve4(m, v);
  return days.reduce((sum, t, k) => {
    const fit = basis(t).reduce((acc, bi, i) => acc + bi * x[i]!, 0);
    return sum + (values[k]! - fit) ** 2;
  }, 0);
}

/**
 * The best-fitting period, in the units of `days`, searched in `[min, max]`: first on a grid of step `step`, then
 * refined to a tenth of it around the best grid point.
 */
export function bestFitPeriod(
  days: readonly number[],
  values: readonly number[],
  { min, max, step }: { min: number; max: number; step: number },
): number {
  const search = (from: number, to: number, by: number): number => {
    let best = from;
    let bestResidual = Number.POSITIVE_INFINITY;
    for (let p = from; p <= to; p += by) {
      const r = residual(days, values, p);
      if (r < bestResidual) {
        best = p;
        bestResidual = r;
      }
    }
    return best;
  };
  const coarse = search(min, max, step);
  return search(coarse - step, coarse + step, step / 10);
}

/** Times (in the units of `days`) where `values` crosses `level` upwards, linearly interpolated. */
export function upwardCrossings(days: readonly number[], values: readonly number[], level: number): number[] {
  const out: number[] = [];
  for (let i = 1; i < values.length; i += 1) {
    const a = values[i - 1]! - level;
    const b = values[i]! - level;
    if (a <= 0 && b > 0) out.push(days[i - 1]! + ((days[i]! - days[i - 1]!) * -a) / (b - a));
  }
  return out;
}
