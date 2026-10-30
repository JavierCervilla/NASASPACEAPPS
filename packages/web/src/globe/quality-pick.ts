/**
 * The quality tier for this device, and the texture that goes with it: the
 * 2K map on the high tier, the 1K map on the others (a quarter of the GPU
 * memory and download).
 */
import {
  detectTier,
  deviceHints,
  settingsFor,
  type QualitySettings,
  type Tier,
} from '../lib/quality';

/**
 * A phone never runs the high tier: the 1K map, and the pixel ratio held
 * at the medium tier's cap (below 2).
 */
export function phoneTier(tier: Tier, phone: boolean): Tier {
  return phone && tier === 'high' ? 'medium' : tier;
}

/**
 * Reads the device (a throwaway WebGL context names the GPU); `phone` caps
 * the tier with {@link phoneTier}.
 */
export function pickQuality(phone: boolean): QualitySettings {
  const probe = document.createElement('canvas').getContext('webgl2');
  const device = deviceHints(probe);
  // A device allows few contexts: give the probe back at once.
  probe?.getExtension('WEBGL_lose_context')?.loseContext();
  const { search, hash } = window.location;
  return settingsFor(phoneTier(detectTier(device, search, hash), phone));
}

/** The Moon map for a tier, under the site's base path. */
export function textureUrl(quality: QualitySettings, base: string): string {
  const size = quality.tier === 'high' ? '2k' : '1k';
  return `${base.replace(/\/?$/, '/')}textures/moon-lroc-${size}.jpg`;
}
