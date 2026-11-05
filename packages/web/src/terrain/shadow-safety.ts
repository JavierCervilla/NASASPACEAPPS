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
 * GPUs whose driver loses its context when a frame both samples the Sun's
 * shadow map and writes a logarithmic depth (VENT-75). On the human's
 * Pixel 10 (PowerVR D-Series DXT-48-1536) the on-foot view lost its context
 * after a few seconds of turning at every tier; leaving out either the
 * shadow map or the logarithmic depth kept it alive. The shadow map is the
 * one dropped: the far rings need the logarithmic depth.
 */
const SHADOW_UNSAFE_GPU = /powervr/i;

/**
 * A name that is some GPU's: the phone families and what desktops and
 * headless runs report. Anything else is a browser's mask, such as Brave's
 * «Brave» (VENT-92), and tells nothing about the GPU.
 */
const KNOWN_GPU = new RegExp(['adreno', 'mali', 'immortalis', 'powervr',
  'xclipse', 'maleoon', 'apple', 'nvidia', 'geforce', 'tegra', 'radeon',
  'intel', 'swiftshader', 'llvmpipe'].join('|'), 'i');

/**
 * Whether the view must draw without its shadow map on GPU `name`, null
 * when the browser hides it (no WEBGL_debug_renderer_info). A phone whose
 * GPU is hidden may be that PowerVR: Brave hid the Pixel 10's, the guard
 * above did not apply and the bench lost both contexts (VENT-84). A name
 * that is no GPU's hides it too: Brave answers «Brave», and the view lost
 * its context after ten seconds of turning at the low tier (VENT-92). A
 * desktop keeps its shadows.
 */
export function shadowMapUnsafe(name: string | null, phone: boolean) {
  if (name !== null && SHADOW_UNSAFE_GPU.test(name)) return true;
  return phone && (name === null || !KNOWN_GPU.test(name));
}
