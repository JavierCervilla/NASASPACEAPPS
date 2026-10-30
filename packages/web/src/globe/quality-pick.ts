/**
 * The quality tier for this device. The Moon maps that go with each tier
 * are chosen in texture-lod.ts.
 */
import {
  detectTier,
  deviceHints,
  settingsFor,
  type QualitySettings,
  type Tier,
} from '../lib/quality';

/**
 * A phone never runs the high tier: it opens on the 1K map, stops at the
 * 4K one, and holds the pixel ratio at the medium tier's cap (below 2).
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
