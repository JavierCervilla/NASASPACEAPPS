# Assets

Every third-party image, model or sound the site ships, with its source, licence and checksum. Add a row before using a
new one.

## Moon colour map

| File | Size | sha256 |
|---|---|---|
| `packages/web/public/textures/moon-lroc-2k.jpg` | 2048 x 1024, 386 832 bytes | `824433124a776ee0be97b43a5be17a67f27abb3157b213d399d288698f51675c` |
| `packages/web/public/textures/moon-lroc-1k.jpg` | 1024 x 512, 94 818 bytes | `60a2dfe87db1b33cf2075c518c92568cc5147fcf2434304db7586a4438332371` |

- **Source**: NASA Scientific Visualization Studio, «CGI Moon Kit» (https://svs.gsfc.nasa.gov/4720), file
  `lroc_color_poles_2k.tif` (https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_poles_2k.tif), downloaded
  on 2026-10-30. 2048 x 1024, 3 339 438 bytes, sha256
  `13b797422e8c4b8607ff2b2623ac3a046a6da0132d567c2d272d92fad7052c4a`.
- **What it is**: the LROC WAC colour mosaic (Hapke normalised) in equirectangular projection, centred on 0° E, with
  the poles filled in (the «poles» variant), which matters for a south pole view.
- **Licence**: NASA, public domain. Credit: NASA's Scientific Visualization Studio (visualizer Ernie Wright, USRA;
  scientist Noah Petro, NASA/GSFC), as the page asks.
- **How it was made**: browsers do not decode TIFF, so the source was converted to progressive JPEG at quality 85 with
  Pillow 12.3 (`Image.convert('RGB').save(..., quality=85, optimize=True, progressive=True)`); the 1K file is the same
  image resized with Lanczos. The globe uses the 2K map on the high quality tier and the 1K map on the others
  (`packages/web/src/globe/quality-pick.ts`).
