# Assets

Every third-party image, model or sound the site ships, with its source, licence and checksum. Add a row before using a
new one.

## Moon colour map

| File | Size | sha256 |
|---|---|---|
| `packages/web/public/textures/moon-lroc-8k.jpg` | 8192 x 4096, 5 341 308 bytes | `20616e5267a6b159141c2278cef1e09b293a4cd69a216ae3b7e13750a06d69ff` |
| `packages/web/public/textures/moon-lroc-4k.jpg` | 4096 x 2048, 1 445 667 bytes | `479afcc22301f3994da3bd1bfb32fc42d4429cbb5c92b8570eec63f29f0fbfbe` |
| `packages/web/public/textures/moon-lroc-2k.jpg` | 2048 x 1024, 386 832 bytes | `824433124a776ee0be97b43a5be17a67f27abb3157b213d399d288698f51675c` |
| `packages/web/public/textures/moon-lroc-1k.jpg` | 1024 x 512, 94 818 bytes | `60a2dfe87db1b33cf2075c518c92568cc5147fcf2434304db7586a4438332371` |

- **Source**: NASA Scientific Visualization Studio, «CGI Moon Kit» (https://svs.gsfc.nasa.gov/4720), downloaded on
  2026-10-30:
  - 1K and 2K: `lroc_color_poles_2k.tif` (https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_poles_2k.tif),
    2048 x 1024, 3 339 438 bytes, sha256 `13b797422e8c4b8607ff2b2623ac3a046a6da0132d567c2d272d92fad7052c4a`.
  - 4K: `lroc_color_poles_4k.tif` (https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_poles_4k.tif),
    4096 x 2048, 13 095 388 bytes, sha256 `918649a7f8ed2f1329b2cd95bb0d25483befdcb60ae1a66db681a637cc21344f`.
  - 8K: `lroc_color_poles_8k.tif` (https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_poles_8k.tif),
    8192 x 4096, 50 641 970 bytes, sha256 `4af8b0cd4d50c30851359d98e7e72040240dd8d03256b58b345b5b76e9edb4ef`.
- **What it is**: the LROC WAC colour mosaic (Hapke normalised) in equirectangular projection, centred on 0° E, with
  the poles filled in (the «poles» variant), which matters for a south pole view.
- **Licence**: NASA, public domain. Credit: NASA's Scientific Visualization Studio (visualizer Ernie Wright, USRA;
  scientist Noah Petro, NASA/GSFC), as the page asks.
- **How it was made**: browsers do not decode TIFF, so the source was converted to progressive JPEG at quality 85 with
  Pillow 12.3 (`Image.convert('RGB').save(..., quality=85, optimize=True, progressive=True)`); the 1K file is the same
  image resized with Lanczos. The 4K and 8K files are their own sources converted the same way (quality 85; the 8K file
  stays under 6 MB at that quality), with `packages/web/scripts/moon_textures.py colour`. The globe opens with the 2K
  map on the high quality tier and the 1K map on the others, and fetches the 4K and 8K maps only as the zoom needs them
  (`packages/web/src/globe/texture-lod.ts`).

## Moon relief (normal map)

| File | Size | sha256 |
|---|---|---|
| `packages/web/public/textures/moon-lola-normal-4k.jpg` | 4096 x 2048, 2 367 322 bytes | `09973329c23ef9f762ae3db752ee4b6802621e647a8098efdaa30f271baccae9` |
| `packages/web/public/textures/moon-lola-normal-2k.jpg` | 2048 x 1024, 581 096 bytes | `17a247e11a864a45a51b779db7a1afd61f4bf07dc222cfce178aaf84c37afd0e` |
| `packages/web/public/textures/moon-lola-normal-1k.jpg` | 1024 x 512, 129 436 bytes | `87bb3fd9e98cd39391ba7c3a2cdd168d7c6c9b928e9808b623ce748242be610b` |

- **Source**: the same NASA SVS «CGI Moon Kit» (https://svs.gsfc.nasa.gov/4720), file `ldem_16.tif`
  (https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/ldem_16.tif), downloaded on 2026-10-30. 5760 x 2880 (16 px
  per degree), floating-point kilometres above a 1737.4 km sphere, 66 378 634 bytes, sha256
  `1ea42bf44f7e9d694f79c3afa7145f97fbf06cc67372067d9fe73dce43bad796`.
- **What it is**: the Lunar Orbiter Laser Altimeter (LOLA) elevation map in equirectangular projection, centred on
  0° E, the same frame as the colour map.
- **Licence**: NASA, public domain. Credit: NASA's Scientific Visualization Studio, as above, with the LOLA team's data.
- **How it was made**: `python3 packages/web/scripts/moon_textures.py normals ldem_16.tif packages/web/public/textures`
  (Pillow and NumPy). The elevation is box-filtered to each size, its slopes are measured one texel apart on the
  ground (on an azimuthal grid above 70° of latitude, where the equirectangular columns crowd together), the relief is
  exaggerated 3 times so it reads at the globe's scale, and the result is stored as object-space normals in the
  globe's axes, progressive JPEG at quality 80 without chroma subsampling. The script's docstring explains the choices.
  The 8K colour map reuses the 4K relief: the 16 px/degree source holds no more detail than that.
- **Known limit**: within about 3° of the south pole the source itself is smeared along meridians (the LOLA grid is
  resampled to latitude and longitude there), so close in, the relief around Shackleton shows faint radial streaks. A
  fix would rebuild the polar cap from LOLA's polar stereographic grids (`LDEM_875S`, PDS), which are not in this kit.

## File header Moon (ASCII art)

- **Where**: the Moon drawn in `scripts/file-header.txt`, the header every code file carries (`npm run headers`).
- **Source**: our own `packages/web/public/textures/moon-lroc-2k.jpg` (the colour map above), so the same NASA SVS
  credit applies. No NASA logo or insignia is used: their use is restricted.
- **How it was made**: `python3 packages/web/scripts/header_moon.py packages/web/public/textures/moon-lroc-2k.jpg`
  (Pillow and NumPy). Its defaults are the values the header was made with (36 x 16 characters, the view tilted 30°
  towards the south, the sun 60° to the left, the ramp ` .:-=+*#%@`), and its output is the template's Moon block
  exactly, with trailing spaces stripped.
