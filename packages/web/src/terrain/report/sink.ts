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
 * What the on-foot scene tells the crash report (VENT-49): its steps, the
 * frames it draws, what the renderer holds, and what it learns of the
 * device. The scene sees only this; the recorder (recorder.ts) keeps the
 * trail. Types only, so the scene's code can name them.
 */
import type { Environment } from './environment';
import type { MemoryRecord } from './trail';

/** One frame the scene drew. */
export interface FrameStat {
  readonly calls: number;
  readonly triangles: number;
  readonly drawMs: number;
  /** The drawing buffer, «WxH». */
  readonly canvas: string;
}

export interface ReportSink {
  /**
   * Notes a step. Steps with the same `repeat` key that follow each other
   * fold into one that counts them.
   */
  readonly step: (text: string, repeat?: string) => void;
  /** Hears a drawn frame: kept in memory, stored with the next step. */
  readonly frame: (frame: FrameStat) => void;
  readonly memory: (memory: MemoryRecord) => void;
  /** Adds what the scene learns of the device (the GPU's name). */
  readonly environment: (patch: Partial<Environment>) => void;
}
