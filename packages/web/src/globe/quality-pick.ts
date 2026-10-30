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
} from '../lib/quality';

/** Reads the device (a throwaway WebGL context names the GPU). */
export function pickQuality(): QualitySettings {
  const probe = document.createElement('canvas').getContext('webgl2');
  const device = deviceHints(probe);
  // A device allows few contexts: give the probe back at once.
  probe?.getExtension('WEBGL_lose_context')?.loseContext();
  const { search, hash } = window.location;
  return settingsFor(detectTier(device, search, hash));
}

/** The Moon map for a tier, under the site's base path. */
export function textureUrl(quality: QualitySettings, base: string): string {
  const size = quality.tier === 'high' ? '2k' : '1k';
  return `${base.replace(/\/?$/, '/')}textures/moon-lroc-${size}.jpg`;
}
