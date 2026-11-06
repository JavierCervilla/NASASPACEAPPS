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
 * The conditions the readout states above its trail (VENT-105), read at
 * each reading: the address's switches, what the attached on-foot canvas
 * says it draws with, the shared instant with the Sun at the selected
 * point, and the WebGL contexts lost so far. A screenshot of the readout
 * then says under which conditions it was taken.
 */
import { readSceneMarks } from '../terrain/scene-marks';
import {
  instantLine,
  lossLine,
  sceneLine,
  type ContextLoss,
  type RendererKind,
} from './condition-lines';
import { readInstant, type InstantSource } from './instant-reading';
import { switchLine } from './switch-line';

/** Losses kept on screen, newest last. */
const LOSSES_SHOWN = 3;

type Dataset = Record<string, string | undefined>;

export class Conditions {
  private readonly search: () => string;
  private scene: { readonly dataset: Dataset } | null = null;
  private instant: InstantSource | null = null;
  private readonly losses: ContextLoss[] = [];

  /** `search` reads the address's query at each reading. */
  constructor(search: () => string) {
    this.search = search;
  }

  /** Reads the on-foot canvas's marks until the returned call. */
  attachScene(canvas: { readonly dataset: Dataset }): () => void {
    this.scene = canvas;
    return () => {
      if (this.scene === canvas) this.scene = null;
    };
  }

  watchInstant(source: InstantSource): () => void {
    this.instant = source;
    return () => {
      if (this.instant === source) this.instant = null;
    };
  }

  lost(kind: RendererKind, seconds: number): ContextLoss {
    const loss = { kind, seconds };
    this.losses.push(loss);
    return loss;
  }

  /** The lines, in the order the readout shows them. */
  lines(): string[] {
    const marks = this.scene ? readSceneMarks(this.scene) : null;
    return [
      switchLine(this.search()),
      ...(marks ? [sceneLine(marks)] : []),
      ...(this.instant ? [instantLine(readInstant(this.instant))] : []),
      ...this.losses.slice(-LOSSES_SHOWN).map(lossLine),
    ];
  }
}
