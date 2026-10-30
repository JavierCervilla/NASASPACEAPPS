# Assets

Every third-party image, model or sound the site ships, with its source, licence and checksum. Add a row before using a
new one.

## Texture build

The texture scripts run with the hash-pinned `packages/web/scripts/requirements.txt` (Pillow 13.0.0, NumPy 2.5.4),
installed as CI does: `pip install --require-hashes --only-binary :all: -r packages/web/scripts/requirements.txt`. The
shipped files were first made with Pillow 12.3. On 2026-10-30 every texture on this page (colour 1K to 8K, the south
polar map and the three normal maps) was rebuilt with Pillow 13.0.0 from the sources listed here and came out
byte-identical, so the sha256 values in these tables hold for both versions.

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
  Pillow (`Image.convert('RGB').save(..., quality=85, optimize=True, progressive=True)`); the 1K file is the same
  image resized with Lanczos. The 4K and 8K files are their own sources converted the same way (quality 85; the 8K file
  stays under 6 MB at that quality), with `packages/web/scripts/moon_textures.py colour`. The globe opens with the 2K
  map on the high quality tier and the 1K map on the others, and fetches the 4K and 8K maps only as the zoom needs them
  (`packages/web/src/globe/texture-lod.ts`).

## South polar map

| File | Size | sha256 |
|---|---|---|
| `packages/web/public/textures/moon-south-polar-2k.jpg` | 2048 x 2048, 758 130 bytes | `70750b08551aa209004b3cdc4feba2a734351f88ec501ee86fb6d0f6df5f7285` |

- **Source**: the 8K colour mosaic above, `lroc_color_poles_8k.tif` (same URL and sha256), the most detail the kit
  has between 80° S and 90° S (about 23 source rows per degree of latitude).
- **What it is**: the south pole down to 80° S in polar stereographic projection, as the polar map view draws it
  (`packages/web/src/lib/polar-projection.ts`): the pole at the centre, 80° S on the rim, 0° E at the top and 90° E
  on the right. Black outside the rim, which the page clips to a disk.
- **Licence**: NASA, public domain, with the same NASA SVS credit as the colour map.
- **How it was made**: `python3 packages/web/scripts/moon_textures.py polar lroc_color_poles_8k.tif
  packages/web/public/textures/moon-south-polar-2k.jpg` (Pillow and NumPy): each pixel samples the mosaic
  bilinearly; the colour is cut to 35 % and the tone stretched (1st to 99th percentile to 14-66 % of the byte scale),
  because the Hapke-normalised mosaic is flat and bright and would glare from the dark page; progressive JPEG at
  quality 85.
- **Known limit**: within about 2° of the pole the source is smeared along meridians (the «poles» fill), so the map
  shows faint radial streaks around Shackleton. No relief shading: the colour mosaic carries none.

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

## Site thumbnails (LOLA relief)

| File | Size | sha256 |
|---|---|---|
| `packages/web/public/thumbs/im1-odysseus.jpg` | 320 x 320, 28 968 bytes | `59b1c7d5878233779c9b8dfa13033802ebc17d2719982f35588b48863b495a79` |
| `packages/web/public/thumbs/im1-odysseus@2x.jpg` | 640 x 640, 87 183 bytes | `c37e57e8e795912ab6a6b627124513120ca579f851aaab57a0003f4a7affdc2d` |
| `packages/web/public/thumbs/im2-athena.jpg` | 320 x 320, 32 904 bytes | `7eedfcc339245c5a489bccd816bb26f22104841d39520e400d0e09f0910e3385` |
| `packages/web/public/thumbs/im2-athena@2x.jpg` | 640 x 640, 104 661 bytes | `8760f9f0ca06c6b0803aee5c093fc0ab0283b92a9b5bfb3425b0b5ab88f2756f` |
| `packages/web/public/thumbs/change7-target.jpg` | 320 x 320, 20 413 bytes | `3be191b4c0bb94078ce61b440ae7c812c1fc393dff695d320f0d318bc4ec3a90` |
| `packages/web/public/thumbs/change7-target@2x.jpg` | 640 x 640, 66 216 bytes | `3e1381a3ccc234489951233a9839b90ded01c62a07cd1088cbf1160740fbb054` |
| `packages/web/public/thumbs/bluemoon-mk1-pathfinder.jpg` | 320 x 320, 19 448 bytes | `9e41e1961ae68e51f59696a95e1d8e5dbe1e7d40a5ac091f49046122a8519c8a` |
| `packages/web/public/thumbs/bluemoon-mk1-pathfinder@2x.jpg` | 640 x 640, 63 209 bytes | `d96fa305192cbe7ef2d75d2e88f9c2c7938bccf579d5cc0c6c97c18c6eddcf86` |
| `packages/web/public/thumbs/griffin1-nobile.jpg` | 320 x 320, 20 102 bytes | `7c641872398440d4522f16926af30993073cf7170a178c741573e9fae7c1153d` |
| `packages/web/public/thumbs/griffin1-nobile@2x.jpg` | 640 x 640, 61 577 bytes | `a0b178ed5dd618c2b8bfe5e03494611a18fc010be9f00bbc2cbe625b5a3e56d8` |
| `packages/web/public/thumbs/artemis-peak-near-cabeus-b.jpg` | 320 x 320, 26 170 bytes | `eef5e347b3beeddc141af9f6881dcf58e18b2ccadc1e621fb6c3785c72f63877` |
| `packages/web/public/thumbs/artemis-peak-near-cabeus-b@2x.jpg` | 640 x 640, 78 605 bytes | `3e451651025e5e1e3eea6a71f26517566c4f575a5682ea5682d1bca05d566c9f` |
| `packages/web/public/thumbs/artemis-haworth.jpg` | 320 x 320, 25 915 bytes | `5b67eda3f779180ecdf59644abb1b37b1c63097e4bc355504faf25a0ea145fa2` |
| `packages/web/public/thumbs/artemis-haworth@2x.jpg` | 640 x 640, 91 851 bytes | `7e1d88087a10a5670c1a5728d715cc020abff5730a4fe08d2a3136db8464a2cb` |
| `packages/web/public/thumbs/artemis-malapert-massif.jpg` | 320 x 320, 20 565 bytes | `7fb6a4c964e18e4212557e51e9bf36dc88cd4f403ab6e052a9c2be06982532c2` |
| `packages/web/public/thumbs/artemis-malapert-massif@2x.jpg` | 640 x 640, 70 490 bytes | `00c1cbd863f0815fe0594e03336783c51640df722264694daafd61f08b55eb7b` |
| `packages/web/public/thumbs/artemis-mons-mouton-plateau.jpg` | 320 x 320, 31 547 bytes | `aa3e41b4db7ef26907e9b21e153d2434ecc2eab711a4950b9311faa0ee8856e9` |
| `packages/web/public/thumbs/artemis-mons-mouton-plateau@2x.jpg` | 640 x 640, 100 124 bytes | `9f69faf795e92fa47bf51a0d854785ba4d8c0877db0f0aeec6e4bde8ecb56e9f` |
| `packages/web/public/thumbs/artemis-de-gerlache-rim-2.jpg` | 320 x 320, 20 613 bytes | `8aa86c0bff788575291482f9a0908711bdba966c6cb9a92daf115fe32931ad0d` |
| `packages/web/public/thumbs/artemis-de-gerlache-rim-2@2x.jpg` | 640 x 640, 66 974 bytes | `858ae2a7646c3810bdc59208ee5b8725637d3425f078a7d8b527ce9cd1fbabec` |
| `packages/web/public/thumbs/artemis-slater-plain.jpg` | 320 x 320, 23 841 bytes | `80d58936c784bb086f4c0424b06259c3553bd4b52d093f33275bbe78ab531243` |
| `packages/web/public/thumbs/artemis-slater-plain@2x.jpg` | 640 x 640, 76 137 bytes | `10760da5c76c83f4e98a75ea226bc13b1d8ba29748fe7ebcbe7b1e3042e3f0c7` |

Total 270 486 bytes for the 11 files at 320 x 320 and 867 027 bytes for their 11 twins at 640 x 640 (`@2x`, for
screens with two device pixels per CSS px); a visitor fetches one file, the selected site's at their screen's density.
Sites that share a point share the file named after the first of them in the site
list (Mons Mouton uses Mons Mouton Plateau's; Nobile Rims 1 and 2 use Griffin-1's); the manifest the script writes,
`packages/web/src/callout/thumbs.json`, maps every site id to its two files and its frame.

- **Source**: the Lunar Orbiter Laser Altimeter (LOLA) south polar gridded elevation, `LDEM_80S_20M` (PDS data set
  `LRO-L-LOLA-4-GDR-V1.0`, product version V2.0), at
  https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/ldem_80s_20m.img
  (label `ldem_80s_20m.lbl` in the same folder; 1 848 320 000 bytes, last modified 2017-07-06). Read on 2026-10-30.
- **What it is**: 30400 x 30400 little-endian int16, height in metres = DN x 0.5 above a 1737.4 km sphere, polar
  stereographic around the south pole from 80° S, 20 m per pixel, 0° E up and 90° E right (the polar map's
  orientation). Only whole lines were read, in chunks of 500 lines (30 400 000 bytes) with HTTP range requests; the
  file was never downloaded whole.
- **Licence**: NASA mission data archived in the Planetary Data System, public domain. Credit: «NASA/GSFC/LOLA team
  (LRO), via the PDS Geosciences Node».
- **How it was made**: `python3 packages/web/scripts/site_thumbs.py` (Pillow and NumPy; `lola_polar.py` reads the
  chunks, `hillshade.py` shades them). For every site south of 80° S: a square crop around its point, 30 km wide
  (Haworth, a 51 km crater, 62 km), slid inside the grid when the point is nearer the edge than half the frame (IM-1, at
  80.13° S, sits off centre); a 5 x 5 median and a 3 x 3 box blur against the ridges bad LOLA tracks leave; Lambert
  shading with the Sun 3° high from the upper left (Haworth: 5° from the left, softer shadows, so its far wall reads)
  and cast shadows traced 12 km towards the Sun on a 40 m grid; the 1st to 99.7th percentile stretched with gamma
  0.8 to 10-88 % grey, a faint warm tint, Lanczos down to 320 x 320 and, from the same shading, to 640 x 640,
  progressive JPEG at quality 88. Sites north of
  80° S are outside the DEM and have no thumbnail.
- **Chunks read** (`SHA256SUMS` in the script's cache; each is lines `N` to `N + 499` of the product):

| Chunk | sha256 |
|---|---|
| `ldem_80s_20m.lines-00000.bin` | `dc30eb97218837cc9ac7af90972b61830ea748a799aae29d5fad34db446a712d` |
| `ldem_80s_20m.lines-00500.bin` | `7259f69b0baeccdafeeae5eda1ff919fac8c76ba56f2afb88a3d3f0e6aa97143` |
| `ldem_80s_20m.lines-01000.bin` | `a61fd34b68ad67e0c945b2d620fb7595fdd111561bb28e96904d4890c1689325` |
| `ldem_80s_20m.lines-07000.bin` | `f899b3dab89c9b1bc9fa641afc378750f84fb5e085152a2006b126f74c1c590d` |
| `ldem_80s_20m.lines-07500.bin` | `301bed1534eb4735ca32b24538baf5ce489d3db4dbcdf749798af6af435d28a2` |
| `ldem_80s_20m.lines-08000.bin` | `3d43da6c25a8bb9faf872b94139cf58090a4454fc509f00814e2b3f67e6a19ad` |
| `ldem_80s_20m.lines-08500.bin` | `476f45798a6b014f68a83c170d6c6a6d633ee786dd9a8025ae39415011967598` |
| `ldem_80s_20m.lines-09000.bin` | `a69e33279208003db9f091a830bcf735c03ff28b600536f777d1f87f4e83a5f5` |
| `ldem_80s_20m.lines-09500.bin` | `b4293468b1e8150192bc1cd0d0fc1575722ca767aed3c2835adca994c6e896d8` |
| `ldem_80s_20m.lines-10000.bin` | `568eec5f6efa2b660d6001728b37519163e8877e618e232870239a2e30d44e28` |
| `ldem_80s_20m.lines-10500.bin` | `7317ee2e2e262ad68173a3d3df80bb82484f25e563521e230995d0cfd3460932` |
| `ldem_80s_20m.lines-11000.bin` | `f7d950e0c1b1a266c96d51be05ea36d84262f1558000e58f7f2a2476b22f328a` |
| `ldem_80s_20m.lines-11500.bin` | `057bf02ede882061e0cdf1e073de0b035a11e75e989fd2171ef4b7b7233ab0ae` |
| `ldem_80s_20m.lines-12000.bin` | `46fed75208c4c8451f6fd6fb50eb45a46df9fa8417e8a92987f94e025af3699b` |
| `ldem_80s_20m.lines-12500.bin` | `e07c1141b0adfdf11f8cc2ca6a8b367cc7e91b14ee264554df399d122e432295` |
| `ldem_80s_20m.lines-14000.bin` | `51937aeb36966f6906a24ce4949067fe3b0c9feb5b241332a4253018cfdc9e30` |
| `ldem_80s_20m.lines-14500.bin` | `8abab48d80d7696d7440bcea61236e8d41832399d4a158dae4462c7582fbe1d0` |
| `ldem_80s_20m.lines-15000.bin` | `261a9876ab2f5f48fc7d9b4512cbdc66b8a767f990b5c819693f793079391ffa` |
| `ldem_80s_20m.lines-15500.bin` | `baa55cf323c7d3ce3dbb3632da7189a62884bf9a2361168b5a72dce28d0baba3` |
| `ldem_80s_20m.lines-16000.bin` | `1419184d902347b64491350759ccf0c2c7c20d576b362a9d310ba7320315227c` |
| `ldem_80s_20m.lines-16500.bin` | `951a4029ad29c5104be3ad5768b8da8d18e38d459323ced62838e888e17e87fe` |
| `ldem_80s_20m.lines-17000.bin` | `b30943c35485985ff0bfc4f6a591c4f41280212bd8564ca55dbcdafdb9fa1bda` |
