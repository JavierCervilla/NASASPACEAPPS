# Roadmap · Ventana Lunar

Lienzo vivo, al día con el Dashboard: https://claude.ai/artifact/Sm8QoCwg7DqLbuCSHLPfBg

NASA Space Apps Challenge 2026, Madrid, sábado 14 y domingo 15 de noviembre. Épica `VENT-1`. La especificación
completa está en el documento «Ventana Lunar · Especificación y roadmap».

## Preparación

- [x] Repo con Astro + React + TypeScript, página «hola mundo» con el diseño `apple-design` (VENT-2)
- [x] CI: lint, tipos, tests unitarios, build, smoke e2e, gate de idioma y escalera de seguridad (VENT-2)
- [x] Despliegue en Dokploy preparado: Dockerfile con nginx (VENT-2)
- [x] App en Dokploy con dominio y el «hola mundo» publicado en https://nasa.cervilla.es
- [x] Dominio principal https://nasa.universelle.io; nasa.cervilla.es sigue sirviendo la misma app (VENT-76)
- [ ] CI en el pool de runners: PAT del pool con el repo y redespliegue del compose `github-runner`
- [ ] Registrar al equipo en spaceappschallenge.org (Madrid, reto Lunar Landing Site Navigator)
- [x] Leer el enunciado oficial (29 oct): el reto es «Lunar Landing Site Navigator»
- [ ] Pestaña Resources: vacía a 29 oct; NASA dice que añadirá recursos antes del hackathon
- [ ] Petición de prueba a JPL Horizons (cualquier objeto) para entender el formato
- [ ] Borrador del pitch y guion del vídeo (70 palabras)
- [x] Textura LRO WAC 2K (y 1K para equipos modestos) en el repo, con su fuente y su sha256 en `ASSETS.md` (VENT-6)

## MVP

- [x] Datos: API en `/api/v1` con JPL Horizons y caché acotada (cualquier punto, fechas de 2026 y 2027), validada con
  los periodos lunares y el signo de la longitud; 29 sitios (polo sur, Apolo y otros países), los 12 sin coordenada citable marcados como
  aproximados (VENT-3)
- [x] Store de tiempo, selector de sitio y cinta de calendario (VENT-4)
- [x] Ficha del sitio con el tiempo hasta la puesta de Sol y de Tierra, y mapa polar 2D (VENT-5)
- [x] Tarjeta del sitio sobre el globo, con la vista del terreno LOLA desde la órbita, el estado y las cuentas atrás
  (VENT-29); retirada en VENT-33: el estado va en la píldora del sitio y la vista del terreno en la hoja y en la ficha
- [x] Web en cinco idiomas (inglés, español, francés, alemán e italiano) con su dirección cada uno, selector en la
  cabecera y en el panel de sitios, y protección para que todo texto nuevo nazca traducible (VENT-35)
- [ ] Revisión de las traducciones por personas nativas antes del 13 de noviembre (VENT-35)
- [x] Cálculo propio del Sol, la Tierra y la antena DSN en el simulador, validado contra Horizons; la web lo enseña al
  instante y un conmutador «Computed | Horizons | Compare» permite compararlos (VENT-36)
- [x] Sitios aproximados en sombra permanente según los mapas de NASA: nota en la ficha y en la hoja, y el Sol nunca
  sale en Shackleton (Chang'e-7), Haworth, de Gerlache Rim 2 y Slater Plain; nota de «poco Sol» en Cabeus B (VENT-39)

## Lujo y entrega (código congelado el domingo 15 a las 15:30)

- [x] Horizonte real con el relieve LOLA (VENT-11, hecho en VENT-40): el Sol y la Tierra contra el relieve de cada
  sitio, horizontes de los sitios al sur de 80° S dentro de la web, ruta `/api/v1/horizon` para cualquier punto,
  franja «Horizon» con la silueta en la ficha y en la hoja, y palabras honestas cuando decide el relieve
- [x] Vista 3D a pie (VENT-34): pestaña «Horizon» con el relieve LOLA de nuestra API alrededor del punto, en primera
  persona (VENT-54 quitó el astronauta y el módulo), el horizonte lejano del perfil del punto, el Sol y la Tierra del
  instante elegido, detalle fino ilustrativo marcado y anillos de distancia; se carga solo al abrirla
- [ ] Relieve en streaming para caminar (VENT-34 C a E): teselas alineadas con LOD en el servidor, un Web Worker que
  las sirve y el movimiento a pie o en vehículo
- [x] Globo lunar 3D con el terminador del Sol real y los sitios de la API (VENT-6); la luz sigue al instante elegido
  en la cinta de calendario (VENT-4)
- [x] Referencias de orientación en el globo (VENT-50): brújula con el norte fijo y la marca de la Tierra, que al
  pulsarla devuelve el globo a su encuadre inicial, y retícula discreta de paralelos y meridianos con etiquetas en cinco
  idiomas, oculta tras el limbo
- [x] Versión móvil: globo, hoja inferior con cuatro tarjetas (ventana, Sol, Tierra, antena DSN) y selector de sitios
  (VENT-23)
- [x] Detalle del globo al acercar (texturas 4K y 8K según el zoom y el equipo), relieve LOLA en el globo y hoja del
  móvil que se cierra para dejar solo la Luna (VENT-24)
- [x] Aplicación instalable (PWA) con el icono J2: manifiesto por idioma con accesos directos a sitios destacados,
  favicon con la fase real de la Luna y el estado del sitio, pantalla de carga con la fase, y uso sin conexión con los
  últimos datos (VENT-28)
- [x] Modo DSN con Goldstone, Canberra y Robledo: bloque «Listening on Earth» en la ficha y el móvil, vista «DSN»
  con la Tierra vista desde la Luna y la banda de 24 h, relevos al minuto y «No link» primero (VENT-7)
- [x] Coordenadas a medida: cualquier lat/lon, con el astronauta del Apolo que se arrastra a cualquier punto del
  globo o del mapa polar, y el punto en la dirección para compartirlo (VENT-10)
- [x] Pin sobrio en lugar del astronauta para elegir un punto: clic en el PC, mantener pulsado en el móvil, «Drop a
  pin» para teclado y pista la primera vez (VENT-37, parte 1)
- [x] Capas del globo como interruptores y sitios guardados en el dispositivo, con la API de capas documentada para
  Mooner (`docs/globe-layers.md`) (VENT-37, parte 2)
- [x] Pulido según la guía de diseño de Apple tras la auditoría de toda la web (VENT-53): respuesta al pulsar en todos
  los controles, salidas que deshacen su entrada, efecto goma en los límites del globo, foco visible, escala tipográfica,
  contraste alto opaco, bordes que se funden al desplazar y zonas de toque de 44 px (VENT-55)
- [x] Cambios de forma elegidos en el lienzo de la auditoría: un solo material, un solo segmentado y un solo botón
  secundario, avisos en fila, tarjeta compacta y ajustes tras un engranaje (VENT-56 → VENT-57)
- [x] Cargador de la vista 3D que ya enseña el sitio: el plano desde arriba con cada tesela en su orden real de
  llegada, el Sol y la Tierra en el borde, y luego el horizonte del sitio que da paso al 3D sin salto (VENT-60)
- [x] Brújula en la vista Horizonte: gira con el rumbo, la Tierra hueca si el relieve la tapa, y al pulsarla vuelve
  a la vista inicial con un muelle (VENT-63)
- [x] Suelo lunar realista en la vista 3D: luz lunar-Lambert con oposición calibrada con fotos de Apolo, exposición +20 %,
  relieve fino real NAC/PGDA en cuatro sitios y piedras con ley de tamaños medida (VENT-62)
- [x] Arranque seguro de la vista 3D en móviles: suelo al coste previo en calidad media y baja, programas compilados antes del
  primer fotograma, aviso claro cuando el navegador bloquea WebGL tras un fallo gráfico (VENT-69)
- [x] Pequeños cráteres con relieve real, grano en terrones y luz de Hapke, contrastados con las fotos de Apolo, solo en
  calidad alta (VENT-64, VENT-67, VENT-68)
- [x] Teselas sin esperas largas: cada petición se corta tras 4 s sin recibir nada y se pide otra vez, reintentos cortos
  propios (0,5 a 4 s), el servidor calcula 4 teselas a la vez y deja en el log las respuestas de más de 1 s (VENT-78)
- [x] Banco de pruebas `?bench`: el mismo guion en cada pasada, A (globo conservado) contra B (contexto WebGL del
  globo liberado con la vista 3D abierta) y un informe para copiar (VENT-81)
- [x] Auditoría de movimiento aplicada: filas que se iluminan al pulsar, avisos que salen como entran, fundidos con
  movimiento reducido y menos recálculo de estilos al arrastrar la hoja (VENT-82)
- [x] Noche lunar en la vista 3D: luz de la Tierra real, relleno mínimo y una luz baja de lectura, con el aviso de
  cuándo sale el Sol y el pie que dice que la luz se ha añadido (VENT-100)
- [x] Texturas comprimidas para la GPU: los mapas de color 2K y 4K del globo y la Tierra de la vista 3D en KTX2, con un
  worker propio y una CSP solo para él; perfil de la GPU en `?debug` (VENT-101)
- [x] El color del suelo de la vista 3D también en KTX2: 44 kB más de red por 4,9 MB menos de GPU (VENT-102)
- [ ] Probar la vista 3D en móviles reales en la nube (PowerVR, Adreno, Mali) y recuperar las sombras en PowerVR con
  reverse-Z (VENT-77, aparcado)
- [ ] Variante C del cargador, el descenso, en equipos potentes (VENT-61)
- [ ] Comparador de sitios o exportar a .ics (VENT-8)
- [x] Portada explicativa en la raíz, en cinco idiomas, con la respuesta en vivo de IM-2 y la franja del mes; la app
  pasa a `/app` (VENT-109)
- [ ] Página del proyecto en spaceappschallenge.org, vídeo de 30 s y pitch; envío antes de las 20:00 (VENT-9)
