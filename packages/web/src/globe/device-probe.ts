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
 * The page's one WebGL2 probe (VENT-91), read for the GPU's name and its
 * profile (VENT-101) before it is given back.
 */
import { gpuName } from '../lib/quality';
import {
  EMPTY_PROFILE,
  readGpuProfile,
  type GpuProfile,
} from '../lib/gpu-profile';

/** What the page's one probe tells of the device. */
export interface PageDevice {
  /** The GPU's name, empty when unknown. */
  readonly gpu: string;
  /** What the GPU can do (lib/gpu-profile.ts, VENT-101). */
  readonly profile: GpuProfile;
}

/** Opens a WebGL2 context with these attributes, or null. */
type OpenContext = (
  attributes: WebGLContextAttributes,
) => WebGL2RenderingContext | null;

/**
 * The GPU's name and profile, from a throwaway WebGL2 context asked like
 * the renderers ask theirs (`low-power`, globe/stage.ts), so a laptop with
 * two GPUs answers for the same one. Both are read before it is given back.
 */
export function probeDevice(open: OpenContext): PageDevice {
  const probe = open({ powerPreference: 'low-power' });
  if (!probe) return { gpu: '', profile: EMPTY_PROFILE };
  const device = { gpu: gpuName(probe), profile: readGpuProfile(probe) };
  // A device allows few contexts: give the probe back at once.
  probe.getExtension('WEBGL_lose_context')?.loseContext();
  return device;
}

/** The probe of this page, on a canvas of its own. */
export function probePage(): PageDevice {
  return probeDevice((attributes) =>
    document.createElement('canvas').getContext('webgl2', attributes));
}
