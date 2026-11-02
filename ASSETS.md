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
`packages/web/src/thumbs/thumbs.json`, maps every site id to its two files and its frame.

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

## App icon «J2» and the Moon's phase frames (VENT-28)

| File | Size | sha256 |
|---|---|---|
| `packages/web/public/icons/icon-192.png` | 192 x 192, 34 795 bytes | `e0c7ac3335babdef2e125442c569f48129f7b3a38bbd94f1ae89145066bcb582` |
| `packages/web/public/icons/icon-512.png` | 512 x 512, 170 846 bytes | `1c60244e5660e1a50d882ecc94ad732fa5f911ad01d90f1427e22abf977f9e37` |
| `packages/web/public/icons/icon-maskable-512.png` | 512 x 512, 114 040 bytes | `88a17b2d30986d4e3b6503d13c0418db8ea7a5090a17b1ee97c5a523414d22c5` |
| `packages/web/public/icons/apple-touch-icon.png` | 180 x 180, 29 425 bytes | `87ce99b87e16f9bb1fe2c9f9d7792701a76c0f1d2ff39e53e8b60271fa363cd3` |
| `packages/web/public/apple-touch-icon.png` | the same file at the root, for clients that ask for it without reading the link | `87ce99b87e16f9bb1fe2c9f9d7792701a76c0f1d2ff39e53e8b60271fa363cd3` |
| `packages/web/public/favicon.ico` | 16, 32 and 48 px, 7 337 bytes | `c16c5a6554319a9001471d0483b768289135307ee2e4c6fc4a08d99938f35f52` |
| `packages/web/public/favicon.svg` | vector ring, embedded 96 px WebP Moon, 4 802 bytes | `0b4196b8e51c2fd6e7e20b55db61df0d4b5441b9b59afebd525b3f9a717e5e07` |
| `packages/web/public/icons/phase/moon-00.webp` … `moon-29.webp` | 30 x 128 x 128 WebP, 88 372 bytes in all | sha256 of their `sha256sum` listing, in name order: `e0985a7808a04de39c72c80fa6f22979a6ba7ce2d667bddafa6251f6e41764d8` |

- **Source**: the textures already listed above, nothing new downloaded: the 8K colour map
  (`moon-lroc-8k.jpg`, for albedo) and the 4K LOLA normal map (`moon-lola-normal-4k.jpg`, for relief).
- **What it is**: the app icon chosen by the human on 2026-10-31 («J2»): a photo-real Moon inside the legend ring
  (dark track, then the Sun, window and Earth arcs from 12 o'clock clockwise in the signal colours), on the page's
  near-black. The `any` icons and the favicons are a rounded square; the maskable icon and the apple-touch-icon are full
  bleed, the maskable one with the ring scaled to 80 % so it stays inside Android's safe zone. The phase frames are the
  same Moon through one synodic month (frame 0 new, 15 full, waxing lit on the right), the dark side in faint
  earthshine, for the live favicon and the globe's loading state.
- **Licence**: derived from NASA LROC and LOLA data, public domain, with the same NASA SVS credit as the maps above.
- **How it was made**: `python3 packages/web/scripts/app_icons.py` (Pillow 13.0.0, NumPy 2.5.4 from the hash-pinned
  requirements): each disk pixel samples the maps seen 12° from the south, lit with a Lommel-Seeliger-like law
  (2 mu / (mu + mu0)) over the relief normals, rendered at twice the size and resized with Lanczos; the ring is drawn
  at four times the size with round caps. Two runs give byte-identical files.

## Astronaut model (VENT-10)

| File | Size | sha256 |
|---|---|---|
| `packages/web/models/astronaut.glb` | glTF 2.0 binary, 4 122 vertices, 6 381 triangles, no texture inside, 138 880 bytes; build input of the sprite bake only, never shipped; the on-foot view no longer reads it | `977be426b398161cde6a15fa70dfccc9d434d8dcffc86099e4c2f23e2f28c70e` |
| `packages/web/models/astronaut-suit.webp` | the suit texture, 512 x 512 WebP, 11 630 bytes; build input only, never shipped | `c362b0560504a1a6f93059c1466bd08a05846b16746b2522110a4afca7aef312` |
| `packages/web/src/astronaut/figures.webp` | the sprite sheet, kept for VENT-34 and not shipped since VENT-37, 900 x 440 lossless WebP (2 rows x 5 columns of 180 x 220), 76 642 bytes | `1b4b694ce7a15550b660022d670c8bedec4259377dee66b40fc9a5a5e6df6a22` |
| `packages/web/src/astronaut/figures.json` | its manifest: layout, cell, visor colours, size and sha256 of the sheet | `553f54dcf34ef67c3a87d2d781695d11b8d3dd64a97ed59adf5d186e01959beb` |

- **Source**: NASA 3D Resources, «Astronaut» (`3D Models/Astronaut/Astronaut.glb`, https://github.com/nasa/NASA-3D-Resources/tree/master/3D%20Models/Astronaut,
  commit `11ebb4ee043715aefbba6aeec8a61746fad67fa7` of 2025-06-03), 762 988 bytes, sha256
  `d18c141410542b935113d1c25a9271d90c40d44015a64295b7b68a30f0ce2820`. An Apollo-era suit with its backpack, Draco
  compressed, with a 1024 x 1024 suit texture.
- **What it is**: the astronaut that was dragged onto the Moon (VENT-10). It is drawn offline, in two poses and with the
  visor in each state colour, into one sprite sheet (`figures.webp`) that the page showed as a plain image. Since VENT-37
  a pin picks points and nothing imports the sheet, so the build ships neither it nor the model; both stay here for
  VENT-34, where the astronaut comes back (dropped, it takes you to the 3D terrain).
- **Licence**: NASA, public domain under the NASA media usage guidelines
  (https://www.nasa.gov/nasa-brand-center/images-and-media/). NASA does not endorse Ventana Lunar. The guidelines do not
  let the NASA insignia be used, so the build covers the «meatball» on the backpack with the fabric next to it. It also
  covers the circular mission patch on the suit (a figure on blue with a gold border) with the plain fabric of the same
  band. Those two are the marks removed; the two US flags remain, and the model carries no other
  NASA mark.
- **How it was made**: `node packages/web/scripts/astronaut.mjs <Astronaut.glb>` (`@gltf-transform` 4.5.1, `draco3dgltf`
  1.5.7 to read the source, `sharp` for the texture, all pinned in `packages/web/package.json`): it bakes the root
  transform into the mesh, lowers the arms that the source holds out (`scripts/astronaut-mesh.mjs`), covers the
  insignia and the mission patch (`COVERED_MARKS` there), names the materials `suit` and `visor` (the visor loses its
  texture: the page tints it), welds the vertices and quantizes positions and normals (KHR_mesh_quantization); the
  suit texture, shrunk to 512 px WebP at
  quality 82, is written beside the model and put back on by the page. No Draco or meshopt: both would need
  WebAssembly in the browser, and a texture inside the GLB would load through a `blob:` URL; the page's CSP allows
  neither. Two runs give byte-identical files. The model and its texture live in `packages/web/models/`, outside
  `public/`: they are the input of the sprite bake below, not files the site serves.
- **The sprite sheet**: `node packages/web/scripts/astronaut-figures.mjs` (`PW_CHROMIUM_PATH` picks the Chromium, as
  for the e2e suite) loads the model with the workspace's three 0.186.1 in Playwright's headless Chromium pinned to
  SwiftShader (`--use-angle=swiftshader`: a CPU rasteriser, no GPU in the path), draws each picture with the scene,
  lights and ACES tone mapping the page used to draw at runtime (`scripts/astronaut-figures-page.mjs`: orthographic
  camera, feet at 50 % x 95 %, stand turned -0.45 rad, carry turned -0.35 and tilted -0.3), the visor in neutral silver
  `#a7acb6` and in the four signal colours read from `src/styles/tokens.css`, and copies the PNGs pixel for pixel into
  one lossless WebP (`sharp` 0.35.5, `exact`). Rows: stand, carry; columns: silver, window, Sun, Earth, neither. Every
  cell is identical, channel for channel, to the picture the runtime renderer drew before (compared on
  2026-11-01); two runs give byte-identical files, and `--check` bakes again and fails when the committed sheet or its
  manifest differ. `packages/web/tests/astronaut-figures.test.ts` holds the manifest to the page's layout, the sheet's
  sha256 and the tokens.

## Earth land mask (VENT-7)

| File | Size | sha256 |
|---|---|---|
| `packages/web/src/dsn/land.json` | 360 x 180 cells of 1°, 923 runs, 6 139 bytes | `e446610cf7a4c1bcd43ff701737bdae40bf5a5acc583515a5f1e2e2495dc885f` |

- **Source**: Natural Earth 1:110m land polygons (version 4.1.0), as the TopoJSON `land-110m.json` of the npm package
  `world-atlas` 2.0.2 (https://registry.npmjs.org/world-atlas/-/world-atlas-2.0.2.tgz, sha256
  `032e7765f2ce00edaeafec23ff22bc3b77e42987c257da944cc585b452c05b97`; `land-110m.json` itself sha256
  `ead5f68119c49a9250902e7da303bcb209341bbb8fefe7369a439b48b704658a`), downloaded on 2026-11-01.
- **What it is**: which 1° cells of the Earth are land, as runs per row of latitude from the north. The DSN pictures
  (the small Earth of the «Listening on Earth» block and the DSN view's big one) draw the land as dots from it, so
  no coastline geometry ships.
- **Licence**: Natural Earth is in the public domain («No permission is needed to use Natural Earth»,
  https://www.naturalearthdata.com/about/terms-of-use/). The `world-atlas` packaging is ISC (© 2013-2019 Michael
  Bostock); only the derived mask ships, not the package.
- **How it was made**: `node packages/web/scripts/earth-land.mjs land-110m.json` decodes the TopoJSON arcs (no
  dependency), tests the centre of every 1° cell against the land rings (even-odd) and fills every cell south of 84° S,
  where Antarctica's ring closes along the pole. Deterministic: the same input writes the same bytes.

## Permanent shadow flags (VENT-39)

| File | What | sha256 of the source |
|---|---|---|
| `packages/sim/data/psr-flags.json` | NASA's illumination maps read at the 14 curated sites south of 80° S | see below |

No map ships: only the values read at each site, in `packages/sim/data/psr-flags.json` and in the `shadow` field of
five entries of `packages/server/data/sites.json`.

- **Source**: NASA PGDA product 69, LRO LOLA illumination maps (https://pgda.gsfc.nasa.gov/products/69), files under
  http://imbrium.mit.edu/EXTRAS/ILLUMINATION/IMG/, and PGDA product 90 (https://pgda.gsfc.nasa.gov/products/90) for
  the 20 m PSR map, downloaded on 2026-11-01:

  | File | sha256 |
  |---|---|
  | `AVGVISIB_75S_120M_201608.IMG` | `a354543b62871227a5066077f5ac61ed7e8dabd5268eb5a5aa4b147aa5bba61e` |
  | `AVGVISIB_75S_120M_201608.LBL` | `1b597f85822c20e349469c9499e7bd85a48efc3a23b9dd9d82b658e59192883c` |
  | `LPSR_75S_120M_201608.IMG` | `f47c537432528ca6852e94d11c2c0ca08e2dcd972ef73d20ea2270ea8e6beff4` |
  | `LPSR_75S_120M_201608.LBL` | `510fa0cacf894568ac900d8bf2cbacaf201800abcc86a87c7bb53b45bb574c73` |
  | `LPSR_80S_20MPP_ADJ.TIF` (https://pgda.gsfc.nasa.gov/data/LOLA_20mpp/LPSR_80S_20MPP_ADJ.TIF) | `ad95311b81db773039af441dd66a017f024327858c6e0314b8c92bf2f470834e` |

- **Scales, from the PDS labels**: `AVERAGE_VISIBILITY = DN * 0.00004 + 0.0` (AVGVISIB, 16-bit LSB integers, the
  average fraction of time with some of the Sun's disc in view over an 18.6-year cycle) and `PERMANENT_SHADOW = DN *
  0.000025 + 0.5` (LPSR, 0 or 1). Both are 7624 x 7624 polar stereographic grids at 120 m/pixel on a 1737.4 km sphere,
  projection offset 3811.5 pixels.
- **How it was read**: nearest pixel at each site's point, longitude 0 up. A site is on a PSR floor when at least half
  of the 20 m PSR pixels within 250 m are permanent shadow; for the four marked sites LPSR_75S_120M is 1 and
  AVGVISIB is 0 at the point, NASA's definition of permanent shadow (Mazarico, E. et al. 2011, Icarus 211,
  1066-1081). The 250 m radius and the 0.5 share are our choice, not a NASA standard. The 120 m values were read a
  second time, independently, from the same files before they were committed, and agree for all 14 sites.
- **Crater floor with little Sun** (`dimFloor`, only «Peak near Cabeus B»): not PSR, but AVGVISIB is 0.11 at the
  point, which the 80 m LOLA DEM puts on the floor of Cabeus B rather than on a peak. Flagging a site whose average
  Sun is below 0.2 is our choice, not a NASA standard; for scale, Gläser et al. 2018 give 0.77-0.88 for the best-lit
  south polar regions, and the 120 m map's highest value is 0.896. A `dimFloor` site only gets the note; its hours
  are not overridden.
- **Licence**: NASA data, not subject to copyright in the United States; credit NASA/GSFC, the LOLA team.

## Terrain horizons (VENT-40)

| File | What | sha256 |
|---|---|---|
| `packages/sim/data/horizons.json` | the terrain horizon of the 14 curated sites south of 80° S (11 points), 26 292 bytes | `a6bf18c38b452a1b5d3bde32aee3cfc2bd302a0fb83eb61900a70c229097583b` |
| `packages/server/data/terrain-catalogue.json` | the LOLA tiers the server may read: every file's URL, label, size and sha256 | see below |

No elevation grid ships: only the profiles, and the catalogue of what the server reads from its volume
(`docs/terrain-api.md`).

- **Source**: the LOLA gridded elevation products of the PDS Geosciences Node, data set LRO-L-LOLA-4-GDR-V1.0
  (https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/), folders `polar/img/` and
  `cylindrical/img/`, read on 2026-11-01. The directory listings (sha256 of the HTML as read: `polar/img/`
  `8e5e68d8501256b3341efd2a4404619d58e793251d55f267995ff8469c2c30b6`, `cylindrical/img/`
  `6911328ed457632b390dea0966b41b3252b75efeecb3c801c1ab72c0747a572b`) give each file's size; each `.lbl` (its sha256
  in the catalogue) gives the size in pixels, the 16-bit LSB integer type, height = DN x 0.5 m above a 1737.4 km
  sphere, and the projection offsets the code uses as given. This closes the realism study's gap: its 80 m and 240 m
  grids are `polar/img/ldem_80s_80m.img` and `polar/img/ldem_75s_240m.img`, the same bytes (sha256 below).
- **Files the shipped profiles were computed from** (downloaded whole):

  | File | Bytes | sha256 |
  |---|---|---|
  | `polar/img/ldem_80s_20m.img` | 1 848 320 000 | `db44c3b2444acff1af528301c8a6988934b490249aceff0ac55668bdf3eab365` |
  | `polar/img/ldem_80s_80m.img` | 115 520 000 | `e6591eeea35402ca5e124ca00f5bf0774381a2d4fa919144b455d82b8ff65fdc` |
  | `polar/img/ldem_75s_240m.img` | 29 062 688 | `d031efe2611b17dfbf3c158f5e15dc04cd5719349dcbf6384bb21fd97697c490` |
  | `cylindrical/img/ldem_128.img` | 2 123 366 400 | `0e4fea9b863e3255f58de15ccbd2bb8b1e248cb09217fd55d23ed37489f764b4` |

  The 20 m file's lines 7000-7499 hash to the site thumbnails' chunk `ldem_80s_20m.lines-07000.bin` above.
- **The other tiers' sha256** (in the catalogue): the PDS publishes no checksum, so every file was streamed whole
  from its URL on 2026-11-01 and hashed without being kept. 22 of the 24 files were hashed by two independent fetches
  that agree (or by a fetch and a download); `ldem_80n_20m.img` and `ldem_512_45s_00s_000_090.img` by one fetch,
  resumed with HTTP Range after a reset. `scripts/fetch-terrain.ts` refuses a file that does not match.
- **How it was made**: `node packages/server/scripts/terrain-horizons.ts --dir <volume>` (and `--check`, which
  recomputes and compares byte for byte). The ray-march (`terrainHorizon` of `@ventana/sim`) casts 720 rays (every
  0.5°) along great circles on the 1737.4 km sphere, curvature included, stopping every 20 m to 6 km on LDEM_80S_20M,
  every 80 m to 150 km on LDEM_80S_80M and every 240 m to 200 km on LDEM_75S_240M, with LDEM_128 where a ray leaves
  them (only IM-1's, at 80.13° S: 99.7 % of its stops covered, 100 % at every other point). Heights are bilinear; the
  horizon in each direction is the highest elevation angle along the ray, stored in hundredths of a degree.
- **Our choices**: the observer 2 m above the ground (a lander deck; the height only changes the near field, a far
  ridge stands at nearly the same angle from 2 m or 10 m), the 0.5° bins (finer than the 0.53° Sun; storing 0.25°
  bins moves the long-term Sun share by at most 0.02 points), the bands and steps above (the realism study's), and the
  Sun's mean radius 0.26645° (IAU 2015 B3 nominal solar radius at one IAU 2012 au; it varies by about 1.7 % over the
  year).
- **Checked**: against the realism study's NumPy `horizon.py` at its 11 points, at most 0.0104° apart in any bin (the
  quantisation step). Against NASA's AVGVISIB_75S_120M (VENT-39's values, `psr-flags.json`), the share of an 18.6-year
  cycle with some of the Sun's disc above the horizon (`tests/terrain-validation.test.ts`, every 7 h):

  | Site | Ours | NASA | Difference |
  |---|---|---|---|
  | IM-2 | 46.9 % | 46.8 % | +0.04 |
  | Nobile (Griffin-1, Rims 1 and 2) | 35.6 % | 35.7 % | -0.05 |
  | Peak near Cabeus B | 10.6 % | 10.8 % | -0.16 |
  | Mons Mouton | 33.3 % | 33.9 % | -0.59 |
  | Shackleton, Haworth, de Gerlache Rim 2, Slater Plain | 0 % | 0 % | 0 |
  | IM-1 | 39.6 % | 35.6 % | +4.0: NASA's map itself runs from 33 to 40 % in the next 120 m pixels |
  | Malapert Massif | 34.5 % | 42.8 % | -8.3: a 7° local slope the 20 m grid sees; the 80 m grid alone gives 42.1 % |
  | Connecting ridge (Blue Moon MK1) | 80.3 % | 65.9 % | +14.3: a narrow ridge the 120 m grid smooths; NASA gives 89.6 % within 1 km |

  Within 1 point at 8 of the 11 points; the three outliers are documented, not tuned.
- **Licence**: NASA data, not subject to copyright in the United States; credit NASA/GSFC, the LOLA team, via the PDS
  Geosciences Node.

## On-foot view surfaces (VENT-34 quality pass)

All load on demand with the 3D view (file names `on-foot-*`, left out of the precache by `ON_DEMAND`).

| File | What | sha256 |
|---|---|---|
| `packages/web/src/terrain/maps/on-foot-regolith-albedo.webp` | 1024 px, from `moon_02_diff_1k.jpg`, desaturated to near neutral and stretched in contrast, WebP q82, 14 536 bytes | `8563640a36c8dc7558c1903cc1536cc3eb5e842f9a393bf8624cbbb274e1d2cc` |
| `packages/web/src/terrain/maps/on-foot-regolith-normal.webp` | 1024 px OpenGL normal map, from `moon_02_nor_gl_1k.jpg`, WebP q88, 469 352 bytes | `b4b5989bbf1c722cad2111304bc4396ae31e26b7296b2f99f3b3737d11ffe66a` |
| `packages/web/src/terrain/maps/on-foot-earth.webp` | 1024 x 512 equirectangular, from the 5400 x 2700 Blue Marble, Lanczos, WebP q86, 85 926 bytes | `8edd5b933a5987878257f43f9f5d67c0dc9128581441baa4ffe9d19a3285baf3` |

- **Regolith**: Poly Haven «Moon 02» (https://polyhaven.com/a/moon_02; Greg Zaal, Rico Cilliers, Jenelle van Heerden,
  Dario Barresi), CC0. Sources fetched from `https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/moon_02/`:
  `moon_02_diff_1k.jpg` sha256 `690a431ac0f4c998ab97135f914ac61362a7b16d0760a365fddc204851689cb8`,
  `moon_02_nor_gl_1k.jpg` `93c4f7f6facfdee5b997aa1c22005bfa0957eeaa22134f640ab0d612b6516ae0`. Its roughness map (mean 0.97) is
  not used: a constant 0.96 does the same. Illustrative fine detail, captioned as such.
- **Earth**: NASA Visible Earth, «Blue Marble Next Generation with topography and bathymetry» (December 2004,
  `world.topo.bathy.200412.3x5400x2700.jpg`, https://visibleearth.nasa.gov/images/73909), NASA imagery, public domain under the
  NASA media usage guidelines; sha256 of the source `a9f0088972dee0254610af851c4d6838ca3f2cf79176987e0a5713e2c15ec042`.
  Cloud-free, so it shows land and ocean, not the weather of the day.
- **Astronaut suit**: the existing `astronaut-suit.webp` (above). The on-foot view no longer uses it (VENT-46 replaced the model with the Meshy astronaut below); it stays for the sprite bake.
- **Lander**: now the models of «On-foot view models v2» below, used by the on-foot view: the Apollo Lunar Module (NASA 3D Resources) on the
  Apollo sites and the generic robotic lander built from code on every other site and custom point (`lander-kind.ts`).

## On-foot view models v2 (VENT-34)

| File | What | sha256 |
|---|---|---|
| `packages/web/models/astronaut-v2.glb` | EVA suit figure, 17 820 triangles, 6 materials, 1.91 m tall, 534 216 bytes | `ecf68c50beb336179ceaeff94dcf7ab04802cc9dae6a7c51422d6797b3cc1f10` |
| `packages/web/models/astronaut-v2-ao.webp` | its baked ambient occlusion, 512 px, 63 624 bytes | `0fbd4f13a495173db873280e6209193d7d19617f8f61808e0844ff918ddc76d8` |
| `packages/web/models/astronaut-v2-normal.webp` | its baked fabric folds, tangent-space normal (OpenGL), 1024 px, 51 492 bytes | `1bb074a69f88509eb6838d055e7dd87f2daf2f47d1880fba9d8334555d963f06` |
| `packages/web/models/lander.glb` | generic robotic lander, 8 276 triangles, 6 materials, 4.35 m tall, 4.72 m across the pads, 296 536 bytes | `444832bce60561b9267b8b89d7707b54f62eaa3cae85f5f6a273a16a19dc6d7a` |
| `packages/web/models/lander-ao.webp` | its baked ambient occlusion, 512 px, 71 718 bytes | `72e8b9fcc29e495777426605bdc9c47d979ca88b3cabccfca953663c7428b213` |
| `packages/web/models/lander-normal.webp` | its baked crinkled blanket, seams and solar cells, 1024 px, 152 306 bytes | `e174ec30fe953d4dba9a8ce47d973558225851ff13363824c907997b6e5f4b96` |
| `packages/web/models/apollo-lm.glb` | Apollo Lunar Module, 24 249 triangles, 12 materials, 9.40 m across the gear, 7.33 m tall, 1 192 380 bytes | `556a068caf150372dad324b024209174b9127def5b7b352c49eb4b79e66cc8b5` |
| `packages/web/models/apollo-lm-0.webp` | crumpled-foil normal map (`foil_normal`), 512 px, 45 992 bytes | `a3de33de6f9b2b5c0ee156fbeb8bfe074ed8e523fd59aca84d9991ec0b3dca2e` |
| `packages/web/models/apollo-lm-1.webp` | crumpled-foil metal-roughness map (`foil_metal_roughness`), 512 px, 8 008 bytes | `2a0c790afc2be27bed696ed630debf731ba9796458586ef7959681bafc2e484b` |
| `packages/web/models/apollo-lm-2.webp` | the descent engine's striped booster texture (`BOOSTER3`), 400 px, 936 bytes | `df69e2c9ac02b49c77182cf18c8f31e020d3401157f9e4c2c7b3e59f7ef437c6` |

- **How they are made**: `python3 packages/web/scripts/onfoot_models.py --source <apollo-lm.glb> [--previews <folder>]
  [--check]`, with the studio's Blender 5.2.2 (`python3 -m studio install blender` in GAMESTUDIO, or `--blender`). It
  runs `onfoot_blender.py` inside Blender, packs each export into a GLB (one mesh, one node, float positions, normals
  and UVs, uint16 indices: the subset `src/terrain/glb.ts` reads), audits it (at most 25 000 triangles, textures at
  most 1024 px, at most 1.5 MB with its textures) and copies it here. The textures are separate WebP files named by URI
  through `EXT_texture_webp`, never inside the GLB: the page's CSP loads no `blob:` image. No Draco, no meshopt, no
  quantization. Tests: `packages/web/scripts/test_onfoot_models.py`.
- **Astronaut v2**: built from code, `packages/web/scripts/astronaut_model.py` (shapes in `onfoot_shapes.py`); no
  third-party source, nothing to license or credit. A generic modern EVA suit: hard upper torso, soft lower torso,
  pleated elbows and knees, bearings at the waist, shoulders, thighs and wrists, gauntlet gloves, boots with dark soles,
  a life-support backpack with its propulsion unit, a chest control unit with hoses, a helmet with lamps and a gold
  visor (`visor_gold`: metal, roughness 0.12, no maps). No insignia, patch, flag or lettering. The whole figure is
  unwrapped into one atlas; Cycles bakes its ambient occlusion and a procedural fold pattern (bake only: wavy bands round
  the limbs, faded in patches) into the two maps, which every material but the visor wears (`occlusionTexture`,
  `normalTexture`). Feet on the origin, +Y up, the visor towards +Z, metres. It replaces NASA's Apollo-era «Astronaut»
  (above, VENT-10) in the on-foot view once the page loads it; that model stays for the sprite sheet.
- **Lander**: built from code, `packages/web/scripts/lander_model.py`; no third-party source. A generic lander of the
  Nova-C class (hexagonal body 1.6 m flat to flat, about 4.3 m to the top of its dish, six legs), copying no single
  design and wearing no logo, flag, lettering or trademark: gold and silver blankets with taped seams, three
  body-mounted solar arrays, a radiator face, instrument boxes, an engine bell, two propellant tanks under the body, two
  pressurant spheres and a payload box on the deck, a dish on a mast, thruster pods, six legs with a shock strut, two
  side struts and a footpad each. Baked like the astronaut: ambient occlusion and a procedural crinkled blanket (two
  sizes of Voronoi facets over a slow undulation, seams every 0.45 m), the solar arrays' cell grid. Footpads on the
  origin, +Y up, metres. For robotic sites and custom points.
- **Apollo LM**: from Mooner (JavierCervilla/Mooner, commit `cc528da`, `module_models_blender.py` and `foil_maps.py`),
  baked from NASA 3D Resources' «Apollo Lunar Module»
  (`3D Models/Apollo Lunar Module/Apollo Lunar Module.glb`, https://github.com/nasa/NASA-3D-Resources at commit
  `11ebb4ee043715aefbba6aeec8a61746fad67fa7`), 716 840 bytes, sha256
  `379101dfcee399267addf771709107c35e826b0b9e5233272f123e4c8a585c4e`, checked before every bake; the source stays out
  of the repo. The repository's README says its models are «free and without copyright». Licence: NASA, public domain
  under the NASA media usage guidelines (https://www.nasa.gov/nasa-brand-center/images-and-media/). Credit: NASA. NASA
  does not endorse Ventana Lunar. The model's two decal textures, a US flag (`TEXTURE_`) and the «UNITED STATES»
  lettering (`TEXTUREA`), each on a flat gold foil field (sRGB 196, 135, 14), are removed: their materials lose the
  texture, take the field's colour and wear the crumpled foil like the rest of the blanket, so no flag, lettering or
  insignia remains (the tests check that no such image is left); the model carries no other mark. The booster texture
  is cut to 512 px at most (it is 400 px). `packages/web/scripts/apollo_lm_model.py` (ported, `apollo_lm_model.py`'s
  docstring lists the changes) joins it, scales it so the gear spans 9.4 m footpad to footpad (NASA's figure; the
  height comes out at 7.33 m, against NASA's 7.04 m: the model's proportions, not ours), sets the footpads on the
  origin, box-projects the generated crumpled-foil maps (`foil_maps.py`, Mooner's, NumPy, seed 1969: no source, nothing
  to license) on the foil and panel materials, decimates it from 97 588 to 24 249 triangles and smooths it by angle. For
  Apollo sites.
- **Known limits**: the bake is deterministic on one machine (fixed seeds), but Cycles bakes are not promised to be
  byte-identical across CPUs, so `--check` may report the baked maps of the two models built from code as changed on
  another machine. The on-foot view lights the metal materials (foil, struts, bearings, visor) with an analytic
  earthshine instead of an environment map (`scene/earthshine.ts`), so they read close to these previews, which light them
  with a grey sky. The on-foot view uses these files (VENT-46).

## On-foot view astronaut, Meshy (VENT-34)

| File | What | sha256 |
|---|---|---|
| `packages/web/models/astronaut-meshy.glb` | rigged EVA suit figure, skinned glTF (24 joints, 4 influences a vertex), clips `idle` (4.0 s) and `walk` (4.17 s, in place), 24 899 triangles, 1.91 m, 1 653 276 bytes | `317a2d4356e4d13b0a2602005d2885e4f624cf60106d73ab0213b4e30a3e2db7` |
| `packages/web/models/astronaut-meshy-0.webp` | its normal map, 1024 px, 45 712 bytes | `35e22b2164e163ddcaf97b8a58df115c59ff76a1e9890dab1b49346479b30e9c` |
| `packages/web/models/astronaut-meshy-1.webp` | its base colour, decals painted out, 1024 px, 131 040 bytes | `5df6df7b962c3743cf66c3d50ad3529b85f9f298786d8090987cffba887d43fd` |
| `packages/web/models/astronaut-meshy-2.webp` | its metal-roughness map, 1024 px, 41 810 bytes | `1212e18e3d0ca6639248bca311c50111f98fc30b16984e1730e67684fd26fb27` |

- **Source**: generated with Meshy (meshy.ai) through its API on the project owner's paid plan on 2026-11-02. Text to 3D
  preview task `01a19d97-a512-72a8-a1c5-40b0354b3402` (`meshy-7.1`, remeshed to 25 000 triangles, A-pose) and refine
  task `01a19d98-fbef-7508-88c9-eb78fec6db25` (PBR maps, 2K; source GLB 8 275 972 bytes, sha256
  `1b339abb71dde8a89a5d4430f3385594eff17157fb68b3fc487fdf1adf53d05d`), then auto-rigging task
  `01a19da4-010b-72c0-a5b1-fb75395be11a` at 1.91 m (same mesh, UVs and textures; rigged GLB sha256
  `3fd1e74d75e6a173877bebc5003e52e2521d023fe97e97c4749289dc50a96537`) and animation task
  `01a19da4-f7d5-75b8-a95a-08daf4bd2815` with the library actions 0 «Idle», 30 «Casual Walk» and 566 «Walking 2»
  (the last one not kept). The bake's source is that task's GLB, 10 304 308 bytes, sha256
  `9acf2bd95ff4018c2f7e1202add3d688ce204d0cea92d78957095324bb81f291` (`MESHY_SOURCE_SHA256`), outside the repo.
  Credits: 30 (preview and refine) + 5 (rig) + 9 (three clips). Prompt: «Realistic modern lunar EVA spacesuit astronaut
  standing upright in a relaxed A-pose, arms slightly away from the body, full body, adult human proportions. Bulky white
  multi-layer fabric suit with visible soft folds at elbows, knees and waist, hard upper torso, metal bearing rings at
  shoulders, waist and wrists, rectangular life-support backpack, small chest control box with two hoses, thick gauntlet
  gloves, heavy boots with dark grey soles, round helmet with a gold reflective visor. Plain, clean, unmarked surfaces.
  No logos, no text, no letters, no numbers, no flags, no insignia, no patches, no badges, no stripes of national
  colours.»; texture prompt: «Off-white woven beta-cloth fabric with soft folds, brushed aluminium bearing rings, light
  grey backpack, dark grey rubber soles, mirror-like gold visor. Plain unmarked suit.» plus the same exclusions.
- **Licence**: Meshy's Terms of Service (last updated 2026-09-19): «customers on a paid Meshy plan own their Customer
  Output», which §2 defines as content «generated by or otherwise output from the Service in response to Customer
  Input»: the model, its rig and the retargeted clips (the docs give the animation library no other licence). The CC BY
  4.0 credit applies only to free-plan assets. To confirm by the human on the account page before launch. Credit kept
  anyway: models generated with Meshy (meshy.ai). Nothing was taken from Meshy's community library (its models are CC0
  under §3.3, but every realistic astronaut there carries flags or agency insignia).
- **Cleaning**: Meshy painted a small US flag on each upper arm and a «B3» label on the chest box despite the prompt.
  `packages/web/scripts/astronaut_meshy_clean.py` places every atlas texel on the rest-pose figure (UV rasterisation)
  and, inside three pinned spheres (`REGIONS`; the label's 6.5 cm), fills the flag colour or the label's ink, grown by
  4 texels, by diffusion from the fabric around it (150 Laplace steps from the region's fabric median), feathered over
  4 texels, in the base colour, normal and metal-roughness maps. Tests: `test_onfoot_models.py` checks that no flag
  colour or ink is left in any region of the shipped base colour.
- **How it is made**: `python3 packages/web/scripts/onfoot_models.py --only astronaut-meshy --meshy-source
  <animations.glb>` (`astronaut_meshy_model.py` in Blender 5.2.2): the stray mesh dropped, the atlas cleaned and cut
  to 1024 px, the mesh collapsed to 24 900 triangles before the skin and shaded smooth again by angle (50°; the collapse left
  a hard seam down the visor), the hard upper torso, the helmet and the backpack bound to the upper spine (`Spine`) as
  one rigid shell through 5 cm weight ramps (Meshy's weights bent and tore them with the neck and the spine), influences
  limited to four and normalised, the clips renamed `idle` and `walk`, the idle's hips, spine and head rotations kept
  at a quarter of their turn from the rest pose (the clip stoops far forward), the walk's hips drift removed so it
  walks in place, exported as a skinned glTF
  with WebP textures by URI (`EXT_texture_webp`). The armature keeps Meshy's centimetre bones under a 0.01 root
  scale; the figure is in metres, +Y up, facing +Z, feet on the origin. The rest pose is Meshy's rig pose (arms out);
  the `idle` clip lowers the arms to the sides. Credits for the whole asset: 44 (of the session's 104; the other
  candidates and their renders are in the trajectory's notes). Read with three's GLTFLoader and an AnimationMixer, not `glb.ts`: the on-foot view loads it (`scene/astronaut.ts`) from the scene's chunk, the three maps through a loading manager's URL modifier, `idle` pinned to a pose and moved only by drawn frames, `walk` loaded and unused until VENT-48.

