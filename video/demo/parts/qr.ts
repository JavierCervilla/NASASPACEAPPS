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
 * A QR code encoder in plain TypeScript, no dependency (ISO/IEC 18004):
 * byte mode, error correction level M, versions 1 to 6, the mask with the
 * lowest penalty. Enough for a URL of up to 106 bytes. Returns the module
 * matrix (true is dark), without the quiet zone.
 */

/** Per version (1-6) at level M: EC codewords per block, and the data codewords of each block. */
const BLOCKS: Record<number, { ec: number; data: number[] }> = {
  1: { ec: 10, data: [16] },
  2: { ec: 16, data: [28] },
  3: { ec: 26, data: [44] },
  4: { ec: 18, data: [32, 32] },
  5: { ec: 24, data: [43, 43] },
  6: { ec: 16, data: [27, 27, 27, 27] },
};
const ALIGN: Record<number, number[]> = { 1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34] };

// ---- GF(256) and Reed-Solomon --------------------------------------------------------------------------------------

const EXP = new Array<number>(512);
const LOG = new Array<number>(256);
{
  let x = 1;
  for (let i = 0; i < 255; i += 1) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i += 1) EXP[i] = EXP[i - 255];
}
const mul = (a: number, b: number) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);

/** The EC codewords of `data` with `n` check symbols. */
function reedSolomon(data: number[], n: number): number[] {
  let gen = [1];
  for (let i = 0; i < n; i += 1) {
    const next = new Array<number>(gen.length + 1).fill(0);
    gen.forEach((g, j) => {
      next[j] ^= g;
      next[j + 1] ^= mul(g, EXP[i]);
    });
    gen = next;
  }
  const rem = [...data, ...new Array<number>(n).fill(0)];
  for (let i = 0; i < data.length; i += 1) {
    const f = rem[i];
    if (f !== 0) for (let j = 0; j < gen.length; j += 1) rem[i + j] ^= mul(gen[j], f);
  }
  return rem.slice(data.length);
}

// ---- the codewords ---------------------------------------------------------------------------------------------------

/** The final codeword sequence for `bytes` at `version`, data and EC interleaved. */
function codewords(bytes: number[], version: number): number[] {
  const { ec, data } = BLOCKS[version];
  const capacity = data.reduce((a, b) => a + b, 0);
  const bits: number[] = [];
  const put = (v: number, n: number) => { for (let i = n - 1; i >= 0; i -= 1) bits.push((v >> i) & 1); };
  put(0b0100, 4);
  put(bytes.length, 8);
  bytes.forEach((b) => put(b, 8));
  put(0, Math.min(4, capacity * 8 - bits.length));
  while (bits.length % 8) bits.push(0);
  const all: number[] = [];
  for (let i = 0; i < bits.length; i += 8) all.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));
  for (let pad = 0; all.length < capacity; pad += 1) all.push(pad % 2 ? 0x11 : 0xec);
  const blocks: number[][] = [];
  let at = 0;
  for (const n of data) { blocks.push(all.slice(at, at + n)); at += n; }
  const checks = blocks.map((b) => reedSolomon(b, ec));
  const out: number[] = [];
  for (let i = 0; i < Math.max(...data); i += 1) blocks.forEach((b) => { if (i < b.length) out.push(b[i]); });
  for (let i = 0; i < ec; i += 1) checks.forEach((c) => out.push(c[i]));
  return out;
}

// ---- the matrix --------------------------------------------------------------------------------------------------------

type Grid = (boolean | null)[][];
type Setter = (r: number, c: number, v: boolean) => void;

/** The three finder patterns with their separators. */
function drawFinders(set: Setter, size: number): void {
  for (const [r0, c0] of [[0, 0], [0, size - 7], [size - 7, 0]]) {
    for (let r = -1; r <= 7; r += 1) {
      for (let c = -1; c <= 7; c += 1) {
        const ring = Math.max(Math.abs(r - 3), Math.abs(c - 3));
        set(r0 + r, c0 + c, ring !== 2 && ring !== 4);
      }
    }
  }
}

/** The alignment patterns of `version` that do not overlap a finder. */
function drawAlignment(set: Setter, fixed: boolean[][], version: number): void {
  const centres = ALIGN[version];
  const pairs = centres.flatMap((r) => centres.map((c) => [r, c])).filter(([r, c]) => !fixed[r][c]);
  for (const [r, c] of pairs) {
    for (let dr = -2; dr <= 2; dr += 1) {
      for (let dc = -2; dc <= 2; dc += 1) set(r + dr, c + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1);
    }
  }
}

/** The timing lines, the reserved format areas and the dark module. */
function drawTimingAndFormat(set: Setter, fixed: boolean[][], size: number): void {
  for (let i = 8; i < size - 8; i += 1) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
  for (let i = 0; i < 9; i += 1) {
    if (!fixed[8][i]) set(8, i, false);
    if (!fixed[i][8]) set(i, 8, false);
  }
  for (let i = 0; i < 8; i += 1) { set(8, size - 1 - i, false); set(size - 1 - i, 8, false); }
  set(size - 8, 8, true);
}

/** The finder, timing and alignment patterns, the dark module and the reserved format areas. */
function functionPatterns(size: number, version: number): { grid: Grid; fixed: boolean[][] } {
  const grid: Grid = Array.from({ length: size }, () => new Array<boolean | null>(size).fill(null));
  const fixed = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const set: Setter = (r, c, v) => {
    if (r < 0 || c < 0 || r >= size || c >= size) return;
    grid[r][c] = v;
    fixed[r][c] = true;
  };
  drawFinders(set, size);
  drawAlignment(set, fixed, version);
  drawTimingAndFormat(set, fixed, size);
  return { grid, fixed };
}

/** The data modules in placement order: two-column zigzags from the bottom right, skipping column 6. */
function zigzag(size: number): [number, number][] {
  const rights: number[] = [];
  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right -= 1;
    rights.push(right);
  }
  return rights.flatMap((right, pair) => {
    const rows = Array.from({ length: size }, (_, n) => (pair % 2 === 0 ? size - 1 - n : n));
    return rows.flatMap((r) => [[r, right], [r, right - 1]] as [number, number][]);
  });
}

/** Places the codewords' bits in the zigzag, skipping the function patterns. */
function placeData(grid: Grid, fixed: boolean[][], words: number[]): void {
  const bits = words.flatMap((w) => [7, 6, 5, 4, 3, 2, 1, 0].map((i) => ((w >> i) & 1) === 1));
  const free = zigzag(grid.length).filter(([r, c]) => !fixed[r][c]);
  free.forEach(([r, c], k) => { grid[r][c] = k < bits.length ? bits[k] : false; });
}

const MASKS: ((r: number, c: number) => boolean)[] = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (_r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

/** Writes the 15 format bits for level M and `mask` in both copies. */
function placeFormat(grid: boolean[][], mask: number): void {
  const size = grid.length;
  const value = (0b00 << 3) | mask;
  let rem = value << 10;
  for (let i = 14; i >= 10; i -= 1) if ((rem >> i) & 1) rem ^= 0x537 << (i - 10);
  const bits = ((value << 10) | rem) ^ 0x5412;
  const bit = (i: number) => ((bits >> i) & 1) === 1;
  for (let i = 0; i <= 5; i += 1) grid[i][8] = bit(i);
  grid[7][8] = bit(6);
  grid[8][8] = bit(7);
  grid[8][7] = bit(8);
  for (let i = 9; i < 15; i += 1) grid[8][14 - i] = bit(i);
  for (let i = 0; i < 8; i += 1) grid[8][size - 1 - i] = bit(i);
  for (let i = 8; i < 15; i += 1) grid[size - 15 + i][8] = bit(i);
  grid[size - 8][8] = true;
}

/** Rule N1 (runs of five or more) and N3 (finder-like patterns) on one line. */
function linePenalty(line: boolean[]): number {
  let score = 0;
  let run = 1;
  for (let i = 1; i <= line.length; i += 1) {
    if (i < line.length && line[i] === line[i - 1]) { run += 1; continue; }
    if (run >= 5) score += run - 2;
    run = 1;
  }
  const s = line.map((v) => (v ? "1" : "0")).join("");
  return score + 40 * (s.match(/(?=10111010000|00001011101)/g) ?? []).length;
}

/** Rule N2: every 2 x 2 block of one colour. */
function blockPenalty(g: boolean[][]): number {
  let score = 0;
  for (let r = 0; r < g.length - 1; r += 1) {
    for (let c = 0; c < g.length - 1; c += 1) {
      const v = g[r][c];
      if (v === g[r + 1][c] && v === g[r][c + 1] && v === g[r + 1][c + 1]) score += 3;
    }
  }
  return score;
}

/** The standard penalty of a finished matrix (rules N1 to N4). */
function penalty(g: boolean[][]): number {
  const columns = g[0].map((_, c) => g.map((row) => row[c]));
  const lines = [...g, ...columns].reduce((sum, line) => sum + linePenalty(line), 0);
  const dark = g.flat().filter(Boolean).length / (g.length * g.length);
  return lines + blockPenalty(g) + Math.floor(Math.abs(dark * 100 - 50) / 5) * 10;
}

/** The QR matrix of `text` (UTF-8, byte mode, level M), smallest version that holds it. */
export function qrMatrix(text: string): boolean[][] {
  const bytes = [...new TextEncoder().encode(text)];
  const version = [1, 2, 3, 4, 5, 6].find((v) => BLOCKS[v].data.reduce((a, b) => a + b, 0) >= bytes.length + 2);
  if (!version) throw new RangeError(`qrMatrix: ${bytes.length} bytes is more than version 6-M holds`);
  const size = 17 + 4 * version;
  const words = codewords(bytes, version);
  let best: boolean[][] | null = null;
  let bestScore = Infinity;
  MASKS.forEach((m, mask) => {
    const { grid, fixed } = functionPatterns(size, version);
    placeData(grid, fixed, words);
    const g = grid.map((row, r) => row.map((v, c) => (fixed[r][c] ? Boolean(v) : Boolean(v) !== m(r, c))));
    placeFormat(g, mask);
    const s = penalty(g);
    if (s < bestScore) { bestScore = s; best = g; }
  });
  return best as unknown as boolean[][];
}
