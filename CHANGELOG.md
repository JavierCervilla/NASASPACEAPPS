# Changelog · Ventana Lunar

## [Sin publicar]

### Cambiado
- **Un despliegue ya no vuelve a bajar la app entera (VENT-90).** Cada vez que se publicaba una versión nueva, la app
  instalada volvía a descargar unos 5 MB al abrirse, aunque casi nada hubiera cambiado, y esa descarga competía con los
  mapas del globo en alta. Ahora solo baja los ficheros que cambiaron, los mapas 4K y 8K ya guardados pasan a la versión
  nueva, y el service worker entrega cada respuesta a la página antes de guardar su copia.
- **La tira del banco ya no tapa la barra ni la brújula en el móvil (VENT-88).** Mientras corre se coloca justo debajo
  de la barra superior, medida, también con el texto grande, y deja sitio a la brújula; el nombre del paso se parte en
  dos líneas en vez de cortarse.
- **El banco deja ver lo que mide (VENT-85).** Mientras corre, el panel es una tira bajo la barra superior: la pasada
  (A o B, número de pasada y paso), el nombre del paso, «Stop» y la barra de progreso. La lista de pasos desaparece
  mientras corre, así que la vista 3D y el globo se ven casi enteros. El aviso de no tocar la pantalla pasa a la
  pantalla de inicio del banco.
- **El globo suelta sus mapas grandes mientras no se ve (VENT-86).** Al abrir la vista 3D o la DSN en el móvil (o
  cualquier otra vista en el escritorio), el globo vuelve a su mapa de arranque y libera los de 4K u 8K, que en el
  Pixel 10 ocupaban 89 MB de memoria gráfica mientras otra vista la necesitaba. El globo sigue vivo con su contexto:
  al volver se ve al instante con el mapa pequeño y, si el zoom lo pide, el grande vuelve en cuanto se descarga (de la
  caché).
- **Movimiento más coherente y más ligero (VENT-82, auditoría de movimiento).** Las filas de la lista de sitios (y las
  de los sitios guardados) se iluminan al pulsarlas, como el resto de filas, en lugar de encogerse; la brújula del globo
  encoge lo mismo que los demás botones (0,97) y, como ellos y los botones de la vista 3D, solo anima al pulsar. El
  punto de estado pasa de hueco a lleno en un solo movimiento (el anillo ya no se apaga antes de tiempo). «Nueva versión
  lista» se va como llegó al cerrarla con ✕, igual que el aviso sin conexión, y lo que tiene debajo no salta hasta que
  se ha ido. Con movimiento reducido, el arranque del globo se funde en vez de desaparecer de golpe y el interruptor de
  capas mantiene el cambio de color. El arrastre de la hoja del móvil y el paso a Ajustes o Idioma recalculan muchos
  menos estilos por fotograma (medido en Chromium: de 77 a 6 elementos por fotograma en la hoja y de 137 a 2 en el
  paso), y el brillo de carga de los widgets se mueve sin repintar. Las duraciones salen de los tokens y se ha quitado
  una animación de entrada que nada usaba.
- **Teselas del relieve sin esperas largas (VENT-78).** Una tesela llegó a tardar más de 15 s en el móvil. Ahora cada
  petición se corta si pasan 4 s sin recibir nada (ni la respuesta ni más datos) y se pide otra vez enseguida, en lugar
  de esperar a que el navegador se rinda; una red lenta que sigue enviando no se corta. Las teselas reintentan con
  esperas propias de 0,5, 1, 2 y 4 s en vez de las del horizonte (2, 6 y 18 s), si el servidor pide esperar más de 8 s
  se espera solo 8, y cuando se acaban los intentos la tesela se queda como hueco que tapa su nivel padre. En el servidor: con la cola llena pide volver en 2 s (antes
  10), calcula 4 teselas a la vez (antes 2), cada dirección puede pedir 3000 teselas nuevas cada 10 minutos (antes 600,
  unos 12 puntos: en la wifi de un evento varias personas comparten dirección) y el log apunta cada respuesta de más de
  1 s, con el esquema y el nivel de la tesela pero sin su posición.
- Dominio principal nuevo (VENT-76): la app vive en https://nasa.universelle.io. https://nasa.cervilla.es sigue
  funcionando con la misma app, pero los buscadores reciben como dirección canónica la de universelle.io. Los sitios
  guardados y las preferencias van por dominio: en el nuevo se empieza de cero, y una app instalada desde cervilla.es
  conviene reinstalarla desde el dominio nuevo.
- **Vista 3D: cráteres pequeños, grano en terrones y luz de Hapke (VENT-64, VENT-67, VENT-68).** El suelo cercano
  tiene cráteres de 0,2 a 12 m con relieve real (malla fina alrededor de los ojos, solo en calidad alta), con densidad de Trask y degradación de Basilevsky (cinco clases con su profundidad), media luna de sombra en el
  lado del Sol y borde iluminado enfrente; el relieve se funde sin cortes hacia el borde del parche y las piedras se
  apoyan en los cráteres. Las sombras pequeñas quedan «a medio camino»: cerca del 9 % del suelo iluminado en lugar del
  20 %, dicho en el pie. El suelo a los pies gana grano en terrones de 3 a 30 mm, con normal y sombra propia por píxel
  (sin malla desplazada), que se funde a unos 13 m y alterna parches de polvo liso con racimos de terrones; solo en calidad alta (en media y baja el suelo
  sigue como antes, sin cráteres ni grano: auditoría VENT-70, y `?onfoot=craters` y `?onfoot=grain` los apagan también en alta). La luz del
  suelo pasa a la de Hapke et al. 2012 (Tabla 1 a 604 nm) por Lommel-Seeliger, con el pico de oposición estrecho y un
  suelo calibrado con las fotos de Apolo más allá de 120° de fase; las piedras usan la ley de Golombek y Rapp con la `k`
  de llanura de Diviner (0,004), solo en calidad alta (las piedras de media siguen con la ley de antes). Al cambiar de punto con la vista abierta, el relieve de cráteres y el grano se vuelven a hornear para el punto nuevo y se liberan los viejos. Todo se hornea en trozos de menos de 20 ms, justo detrás del suelo cercano y antes del relieve lejano, y el parche se construye una vez por punto. Pendiente de verificar: la densidad exacta de
  Trask, la ley de terrones (calibración propia) y los valores derivados `h_S` y `h_C` (ASSETS.md).
- Fix forward (VENT-75): en GPU PowerVR (el Pixel 10) la vista 3D se dibuja sin el mapa de sombras del Sol, en todas las
  calidades. La bisección en el Pixel lo aisló: sin sombras o sin la profundidad logarítmica la vista aguanta, y con las
  dos juntas pierde el contexto WebGL al girar, incluso en calidad baja. El resto de GPUs conserva las sombras; el
  sombreado del relieve por rayos hacia el Sol sigue igual en todas.
- Fix forward (VENT-73): el Pixel 10 perdía el contexto WebGL tras unos 3 s girando seguido la vista 3D en calidad
  media (unos 340 mil triángulos por fotograma, lienzo de 719 × 1417 y el mapa de sombras del Sol recalculado en cada
  fotograma). Se aligera media en móvil: (1) el mapa de sombras se dibuja bajo demanda en todas las calidades, solo
  cuando cambia lo que proyecta o recibe la sombra (el primer fotograma, un Sol que se movió, suelo, anillos, piedras o
  parche de cráteres nuevos) y girar la cámara ya no lo repite (`data-shadows` cuenta los pases); (2) la densidad de
  píxeles de la vista 3D en media en móvil baja a 1,25 como máximo (antes hasta 1,75, casi el doble de píxeles); el
  escritorio y el globo no cambian; (3) mientras se gira la vista con el dedo o se desliza, en móvil se dibuja a 30
  fotogramas por segundo como mucho, y el último fotograma se dibuja siempre, así que la vista acaba exacta; con
  movimiento reducido no cambia y en reposo sigue sin dibujar nada.
- Fix forward (VENT-72): si el regolito y el Blue Marble de la vista 3D llegan después de los 5 s que espera el primer
  fotograma, ahora se pide un fotograma al engancharlos (el programa del suelo con mapa se compila antes, fuera del
  fotograma) y el suelo y la Tierra ya no se quedan sin su foto hasta que otra cosa dibuje; mientras llegan, `data-working`
  dice «trabajando». Y el reparto del trabajo en trozos ya no confunde un rato de reposo con el fin de un fotograma: el
  primer fotograma intermedio de un lote nuevo (arrastrar el tiempo, cambiar de punto) se pide al momento y no 1,5 s después.
- Fix forward (VENT-71): las etiquetas de la retícula del globo esperan a que lleguen los sitios, así que al abrir ya no
  aparecen todas y luego desaparece «85° S» (un parpadeo y una carrera de los tests); y la vista 3D dice que sigue
  moviéndose mientras el muelle de vuelta a la vista inicial gira, aunque el rumbo redondeado ya haya llegado.
- **Fix forward: arranque seguro de la vista 3D en móviles (VENT-69).** En un Pixel 10 el primer fotograma de la vista
  3D tardó 1,6 s tras VENT-62, la GPU se reinició y Chrome bloqueó WebGL en todo el sitio, así que el globo tampoco
  arrancaba. Ahora: (1) en calidad media y baja el suelo vuelve al coste de antes de VENT-62 (sin luz lunar, sin segunda
  lectura de la normal, sin la huella por `fwidth` y sin relieve fino, que ni se descarga); solo la alta los lleva, y las
  piedras quedan en 420 en media y ninguna en baja; la exposición +20 % sigue en todas. (2) Los programas del suelo se
  compilan antes del primer fotograma, una sola vez y ya con sus mapas; si la compilación pasa de 1 s la vista baja de
  calidad, y la sonda de fotogramas ya no deja pasar un primer fotograma lento por haber compilado; el informe de la
  vista anota el tiempo. (3) Un PowerVR antiguo o una GPU de móvil no reconocida arranca en calidad baja aunque tenga 8 núcleos; el PowerVR D-Series del Pixel 10 se queda en media, con el suelo seguro.
  (4) Si el navegador bloquea WebGL tras un fallo gráfico, el globo y la vista lo dicen y explican cómo recuperarlo
  (cerrar el navegador del todo; en Android, Ajustes › Aplicaciones › Chrome › Forzar detención); «no hay WebGL» sigue
  igual cuando nunca funcionó. (5) La marca de «la página murió con la vista abierta» también se guarda 24 h en
  `localStorage`, para que un reinicio de Chrome no la pierda. Nuevas palabras de `?onfoot=`: `photometry`, `antitile`,
  `footprint`, `fine` y `rocks`.
  (6) Cambiar de punto con la vista abierta (soltar un pin o elegir otro sitio desde «Lugares») ya no destruye y vuelve
  a crear el contexto WebGL: la vista conserva un solo renderizador (un canvas, un contexto) toda su vida, aparca la
  escena mientras llegan las teselas del punto nuevo y reconstruye el mundo encima, con los programas ya compilados
  (antes: contexto nuevo, 10 programas enlazados otra vez y un primer fotograma de 1,6 s en el Pixel 10, tras el cual se
  perdía el contexto). Solo salir de la vista, cambiar de calidad o perder el contexto lo liberan. Mientras llegan las teselas del punto nuevo la vista aparcada no dibuja ni un fotograma del mundo viejo (antes volvía a pedir uno en cada repintado del cargador: hasta 45 fotogramas en 6 s). (7) Los mapas de la
  superficie se esperan como mucho 5 s: si la descarga se atasca, la vista compila y dibuja sin ellos. (8) Una
  compilación con la página oculta en algún momento no se juzga lenta (Chrome espacia los temporizadores y bajaba la
  calidad sin motivo). (9) La marca de «murió con la vista abierta» de `localStorage` es por pestaña y late cada 5 s
  mientras la vista está abierta: otra pestaña que abre la vista, o cerrar la app con normalidad (`pagehide`), ya no
  bajan un escalón; solo cuenta una marca que dejó de latir hace más de 20 s y tiene menos de 24 h, la de una pestaña oculta
  no cuenta (Chrome espacia sus temporizadores), cada muerte se cuenta una sola vez y las marcas de más de 24 h se borran al escribir (un reinicio de Chrome
  tras un fallo de GPU, o una página que no llegó a avisar al cerrarse, como un móvil que mata la pestaña). (10) El
  mensaje «el navegador bloqueó el 3D» se queda en la franja libre entre la barra superior y la hoja (también al 200 %
  de texto, donde la hoja se cierra para dejarle sitio), sobre un fondo que mantiene el contraste 4,5:1 y con scroll si
  no cabe; ya no se pinta sobre las etiquetas del horizonte.
- Fix forward (VENT-66): en la vista 3D, en puntos de la rejilla lat-lon (p. ej. 8,07° N 38,41° O, cerca del Oceanus
  Procellarum) ya no aparece un «corte»: una franja recta y oscura con una tira blanca en diagonal sobre la ladera. La
  ventana de cada nivel se centra en el sitio y su borde, y el hueco que deja en el nivel de arriba, cae en cualquier
  celda; la máscara de celdas dibujadas preguntaba por bloques de 4 y dejaba sin dibujar hasta 3 celdas (178 m de
  suelo) en un lado del hueco y dibujaba otras 2 dos veces en el opuesto. Ahora el borde se resuelve celda a celda. El
  relieve de ese punto se ha grabado de producción como prueba (`tests/e2e/fixtures/terrain-ring-oceanus/`).
- **Vista 3D: un suelo más real, contrastado con las fotos de Apolo (VENT-62).** El suelo se ve como el regolito lunar y no
  como yeso: luz lunar-Lambert de McEwen (coeficientes comprobados contra ISIS) con un halo de oposición calibrado con
  tres fotogramas Hasselblad (el suelo junto al punto antisolar es de ×1,34 a ×1,64 el de al lado), oscuro y mate hacia
  el Sol (0,4 a 0,7 del de espaldas a él), sin brillo especular; exposición un 20 % más alta, dicho en el pie; gris
  neutro; el grano se funde por lo que ocupa en pantalla y las manchas de brillo bajan a un 3 %. Se arregla además el
  anti-mosaico de la normal, que en producción nunca se aplicaba. En IM-2, Malapert A, la cresta de Shackleton y Malapert
  Massif el suelo cercano usa el relieve real de las cámaras NAC de LRO (el de PGDA en Malapert Massif, CC BY 4.0),
  de 84 a 123 kB que solo se bajan en esos sitios y no entran en la caché de instalación; el pie dice «relief LROC NAC
  DTM 4 m · LOLA 20 m beyond». Las piedras siguen una ley de tamaños medida (Golombek y Rapp), a medio enterrar y más
  densas en pendientes y bordes, repartidas en trozos para no frenar la página. Pendiente de verificar: las constantes
  de la ley de piedras y la amplitud del halo (ASSETS.md).
- **Vista 3D: un cargador que ya enseña el sitio (VENT-60, variante B→A del lienzo).** Mientras llegan las 18 teselas
  cercanas (2 y 8 km) se ve el plano desde arriba, cada tesela sombreada con sus propias alturas en su orden real, con
  el punto, el campo de la vista y el Sol y la Tierra reales en el borde, y «Terrain · n of 18 tiles»; con las cercanas
  dentro el plano se tumba hacia el rumbo y queda el horizonte del sitio dibujado con la cámara de la escena, con el Sol
  y la Tierra donde los pintará, y el 3D aparece debajo sin salto. El relieve lejano sigue con un rótulo discreto «Far
  relief · n of 18 tiles». Movimiento reducido: fundidos. Si falla, el horizonte queda atenuado con «Try again». Sin
  WebGL ni descargas nuevas: Canvas 2D, SVG y transformaciones CSS.
- Fix forward 9 (VENT-59):
  - La vista 3D y la ficha dicen lo mismo sobre el Sol en IM-2: manda el perfil del horizonte, el mismo que usa la
    ficha, y la cresta cercana solo dice qué lo tapa (decisión de Javier). El relieve de prueba de IM-2 se ha vuelto a
    grabar desde producción con LOLA a 20 m.
  - Al 200 % de texto en el móvil, el pie de la vista 3D ya no queda cortado por la hoja.
  - La vista 3D abierta sin conexión carga sola cuando vuelve la red, sin recargar la página.
  - En la vista DSN, una antena en reposo (como Goldstone en el limbo) queda en un hueco libre de puntos de tierra y ya
    no se confunde con ellos.
- Cambios de forma de la auditoría de diseño, las ocho variantes que Javier eligió en el lienzo (VENT-57):
  - Un solo material: la brújula, la lectura del pin al arrastrarlo, la leyenda de capas y los avisos comparten el
    esmerilado del aviso del pin (la leyenda deja el Liquid glass).
  - Un solo control segmentado (pestañas de vista, regiones del selector y «Computed | Horizons | Compare»: carril
    gris, marca #636366 en oscuro y blanca con sombra en claro, 44 px) y un solo botón secundario (píldora gris de
    44 px, peso 600, sin subrayado: todos los «Try again» y «Now», que se atenúa en directo).
  - «Saved» conserva la píldora gris de «Save» con el marcapáginas relleno; Reproducir es un círculo gris como las
    flechas del mes.
  - Los avisos son filas como «New version ready»: «Offline» con una nube tachada, «Showing data from <fecha>» y una ✕
    que lo oculta hasta la próxima desconexión (nunca más de dos líneas en el móvil); «Load the 3D globe» con ahorro de
    datos, con un globo y «Data saver is on», toda la fila el botón; y «Deleted <nombre> · Undo» con una papelera y
    «Undo» en negrita, encima de la tira del calendario en escritorio (antes la tapaba) y de la barra de pestañas en el
    móvil. Con movimiento reducido el aviso que se va se desmonta al acabar su fundido de 200 ms, no a los 400 ms.
  - La tarjeta de escritorio, más compacta: la imagen es una banda de 96 px, el horizonte y «Listening on Earth» van
    en un solo bloque y el aviso «Horizons unavailable · Try again» sube bajo las cifras, a la vista sin desplazar.
  - En el teléfono, la hoja «Landing sites» empieza por «Drop a pin», el buscador y la lista; las capas, el idioma y
    la fuente de datos pasan a una página «Settings» que abre un engranaje junto a «Done».
- Se borra el astronauta antiguo (VENT-58, decisión de Javier): el modelo de NASA, los scripts que lo preparaban y lo
  horneaban en una hoja de imágenes, esa hoja, sus tests y las cuatro dependencias de desarrollo que solo usaban ellos
  (`@gltf-transform` y `draco3dgltf`). Nada de la web los leía desde que un pin elige el punto (VENT-37) y la vista 3D
  dejó de dibujar figura (VENT-54); su origen y su licencia quedan en el historial de git.
- Maquetación revisada según la guía de diseño de Apple (VENT-55, de la auditoría VENT-53): en el teléfono, un sitio
  guardado de nombre largo ya no hace crecer la barra superior (el nombre se corta con «…» antes de que el título o la
  regla salten de línea), y a 200 % de texto la cabecera de la hoja pone las coordenadas bajo el nombre en vez de
  montarlas encima. Todo lo que se desplaza funde el borde tras el que hay más contenido (la lista de sitios, el menú
  de idioma, el resumen y el calendario del teléfono, la leyenda de capas y la vista DSN). El control segmentado, las
  filas de la leyenda, la búsqueda y el campo de renombrar aceptan el toque en 44 px, y un toque junto al campo de
  renombrar ya no cancela la edición. Con la hoja de sitios abierta sobre la vista 3D, su aviso ya no asoma; en la vista
  «Horizon» de escritorio queda una sola tira de horizonte; renombrar abre con el nombre entero seleccionado; las filas
  de sitios con dos líneas dejan aire debajo, y las etiquetas de la retícula del globo dejan libre el anillo del pin.
- Pulsar y moverse se notan como en una app de Apple (VENT-55, de la auditoría VENT-53): todos los controles responden
  al apoyar el dedo o el ratón (pestañas, segmentos, filas, menús, los botones de reintentar y deshacer, el ✕ de los
  avisos, los interruptores de capas y los puntos del globo), también con «reducir movimiento». Los menús emergentes,
  el aviso de deshacer, el del primer pin y el de sin conexión se van por donde vinieron, con desenfoque y escala (con
  «reducir movimiento», solo un fundido). El zoom y la inclinación del globo ceden con efecto goma al llegar a su límite
  y vuelven con un resorte al soltar. La línea del instante, la del calendario y la de la DSN se mueven con
  transformaciones, sin recalcular la página.
- Pulido de color, foco y tipografía según la guía de diseño de Apple (VENT-55, de la auditoría VENT-53): la marca del
  idioma actual y la franja del calendario mientras carga ya no usan colores de señal; todos los controles llevan un
  anillo de foco visible en tema claro y oscuro; con «reducir transparencia» en tema claro, el aviso y la lectura del pin
  son legibles; con «aumentar contraste», la cabecera, las barras y la hoja del móvil son opacas y todos los paneles
  llevan borde; el texto gris sobre vidrio gana peso; el espaciado entre letras va por tamaño de texto y ningún texto
  baja de 11 px (salvo las pestañas del móvil por debajo de 400 px de ancho).
- La vista 3D «Horizon» es solo en primera persona (VENT-54, decisión de Javier): abre con los ojos a 2 m del suelo,
  mirando al Sol si está cerca del cielo y, si no, a la Tierra. Se quitan el astronauta, los dos módulos de aterrizaje
  (el del Apolo y el genérico) y el selector «Third person | First person»; el pie ya solo dice «Fine detail
  illustrative · relief LOLA» y «Earth: NASA Blue Marble». La vista no descarga ningún modelo (antes, 3,6 MB al abrirla),
  el código de Three.js que el globo carga al arrancar pesa 11 kB menos comprimido y la escena 15,6 kB menos, y en el
  móvil dibuja menos (de 49 a 32 llamadas y de 431 000 a 362 000 triángulos en IM-2). Los enlaces antiguos con
  `?onfoot=astronaut` o `lander` siguen abriendo la vista.
- El astronauta de la vista 3D «Horizon» es ahora una figura con esqueleto (VENT-34): un traje EVA generado con Meshy,
  de 1,91 m, sin banderas, logos ni insignias (se borraron del mapa de color las dos que el generador pintó por su
  cuenta), que sustituye al modelo de NASA 3D Resources y su textura. Se carga con `GLTFLoader` solo cuando se abre la
  vista y está de pie con su animación de reposo (el código de Three.js que el globo carga al inicio crece 11,7 KB
  comprimidos por las piezas de animación); esa animación solo avanza en los
  fotogramas que la vista ya dibuja al girar o cargar, así que una vista quieta sigue sin dibujar nada, y con «reducir
  movimiento» no se mueve. Su animación de andar queda cargada para más adelante.
- La vista 3D «Horizon» dibuja ahora relieve real en anillos hasta el horizonte (VENT-46). En lugar de una sola
  tesela de 4 km con un muro plano a 6 km, la web pide a la API las teselas alineadas por niveles de detalle y las
  dibuja como geometría: el suelo de al lado (nivel 0, nodos de 15,6 m), el relieve medio (8 km), y el lejano (32 y
  128 km), de modo que las crestas que esconden el Sol y la Tierra son montañas de verdad, con su sombreado por
  normales y, en cada anillo, sombras duras del Sol. Cada nivel deja un hueco bajo el más fino, las costuras se cierran
  con faldones y se mezclan las normales para que no se vea ningún pliegue; una tesela que falla es un hueco que
  rellena el nivel de arriba. Las teselas se piden de 6 en 6, las más finas primero, y se decodifican y se mallan a
  trozos de pocos milisegundos para no bloquear la página: la vista aparece en cuanto llegan los dos niveles más finos
  y los anillos lejanos se van completando. En el móvil el nivel 0 y el 1 usan un nodo de cada dos y el nivel más lejano
  se omite en el nivel de calidad bajo. El muro del horizonte queda solo como fondo más allá del último anillo.
- Girar la vista 3D cuesta menos: un deslizamiento de lado a lado gira 180° (una vuelta entera en dos), en móvil y en
  escritorio, y al soltar el dedo el giro sigue con su velocidad y se frena solo, como la bola del globo (nada de inercia
  con «reducir movimiento»; un toque la para; no se dibujan fotogramas cuando se ha parado).

- La vista 3D enseña ahora un módulo de aterrizaje de verdad (VENT-46). En los sitios Apolo se ve el Módulo Lunar de
  NASA 3D Resources, con su lámina dorada y sus patas; en cualquier otro sitio y en los puntos libres, un módulo robótico
  genérico (ilustrativo, sin logos). Está a 22 m del astronauta y algo a la derecha de hacia dónde mira la vista al abrir,
  así que sale en el primer fotograma, también en el móvil. A la sombra lo ilumina la luz de la Tierra con un cálculo
  analítico (un hemisferio de cielo y suelo en su sombreado), sin simular una luz del Sol que no está.
- Los anillos de relieve cierran sus costuras: las alturas de los nodos del borde de cada nivel se acercan a la
  superficie del nivel de arriba, de modo que no queda escalón entre el relieve fino y el grueso, aunque lean teselas
  de resolución distinta. La API sirve los mismos lugares con alturas aproximadamente iguales entre niveles (con un paso
  por nivel de 0,1, 0,1, 0,2 y 0,4 m), y el visor se encarga de coserlos.
- La vista 3D carga bastante más rápido en equipos sin GPU: los anillos piden un fotograma como mucho cada 1,5 s mientras
  se construyen, en lugar de uno por trozo de trabajo (la carga de IM-2 en calidad alta pasó de 36 a 12 s en el
  renderizado por software, de 38 fotogramas a 6).

### Arreglado
- Vista 3D en un móvil cuyo navegador esconde la GPU (Brave): se dibuja sin el mapa de sombras del Sol. Brave no deja ver qué GPU hay, así que el Pixel 10 no se reconocía como PowerVR, no se aplicaba la protección de VENT-75 y en el banco de pruebas la GPU se cayó y el navegador bloqueó el 3D. En escritorio no cambia nada (VENT-84).
- Banco de pruebas `?bench`: si la vista 3D falla durante una pasada (pierde el contexto de la GPU o el navegador bloquea el 3D), el banco se para enseguida con «Benchmark stopped» y el motivo, también en el informe, en vez de esperar 60 s en cada paso y parecer colgado (VENT-83).
- En el móvil con el texto al 200 %, cuando el navegador ha bloqueado el 3D, la hoja inferior a veces no se cerraba para dejar sitio al aviso y este quedaba tapado (más o menos 1 de cada 7 cargas en las pruebas). Ahora se cierra siempre (VENT-81).
- Tras un despliegue, una página abierta que no puede cargar una vista bajo demanda (Horizon, su escena 3D, el globo o
  el módulo de aterrizaje) ya no se queda en blanco (VENT-52): el hueco de la vista dice «Update the app to open this
  view» y aparece el aviso de versión nueva. Sin conexión, la misma vista dice «Offline: this view needs a connection to
  load» y no ofrece una versión nueva que no existe.
- Vista 3D (VENT-52): cambiar de idioma con la vista abierta ya no cuenta como una página caída (no baja la calidad); al
  llegar con el tabulador se ve un anillo de foco sobre la escena; en el móvil con el texto al 200 %, el selector «Third
  person | First person» queda bajo la barra superior y cabe en la pantalla, y los rótulos de distancia y de cresta ya no
  se pisan (el que no cabe se oculta).
- En el móvil, la hoja en su posición baja (peek) sube lo que haga falta para que su cabecera (el nombre, «Save» en un
  punto propio y las coordenadas) quede 12 px por encima de la barra de pestañas, con cualquier tamaño de texto e idioma
  (VENT-52); antes, con un punto propio o al 200 %, la barra tapaba «Save» y la línea del punto.
- Globo y pin (VENT-52): mantener pulsado el globo ya no levanta el pin bajo un dedo que lo estaba girando cuando la
  página iba cargada; el globo oculto ya no sube texturas a la GPU; las etiquetas de la retícula se apartan también de
  los pines de los sitios guardados; y las cinco etiquetas del mapa polar (0°, 90° E, 180°, 90° O, 85° S) vuelven a su
  sitio alrededor del disco, legibles también en tema claro: desde VENT-50 se amontonaban en su esquina con el estilo
  del globo.
- Vista 3D en el móvil (VENT-51): si se pierde el contexto gráfico, el aviso «Terrain unavailable right now» con «Try
  again» y «Copy report» aparece en la franja libre entre la barra superior y la hoja, esté la hoja donde esté (antes
  quedaba debajo de la hoja a media altura); si no cabe (texto al 200 %), la hoja baja a su posición mínima una vez y el
  velo oscuro se retira. «Report copied» ya no reaparece en una pérdida posterior, y con `?onfoot=lander` el pie de foto
  ya no nombra un módulo que no se dibuja.
- Mitigaciones del cierre de la vista 3D en un Pixel 10 (VENT-51; la causa en el dispositivo sigue sin confirmar). En el
  móvil, el globo que queda oculto bajo las vistas «Horizon» y «DSN» ya no dibuja nada ni se encoge a 0 × 0: antes se
  redibujaba en cada cambio de minuto del reloj mientras la vista 3D usaba la GPU. Al volver al globo se dibuja una vez,
  con el Sol del momento. Y si la página muere con la vista 3D abierta, la siguiente vez que se abre arranca un nivel de
  calidad más abajo (una sola vez, nunca por debajo de bajo ni con `?quality=`), y «Copy report» dice por qué. Recargar
  la página con la vista abierta cuenta igual.
- El panel de `?debug` arranca plegado en una línea («N fps · slowest N ms», más el número de errores en rojo si los
  hay) arriba a la izquierda, sobre el título, y ya no tapa la barra de pestañas del móvil, la llave de capas ni
  «Third person | First person» (VENT-51). Corregido el aviso «ResizeObserver loop completed with undelivered
  notifications» que el globo provocaba en cada carga en el móvil.
- Retícula y brújula del globo (VENT-51): los rótulos miden su caja de verdad, que crece con el tamaño del texto, y se
  apartan de los puntos de los sitios y del anillo también al 200 %; con el zoom máximo un rótulo que no cabe entero en
  la vista se omite en vez de salir cortado. La marca de la Tierra en la brújula ya no se vacía al acercar el zoom. En
  el móvil con el texto al 200 %, cuando la hoja tapa la brújula esta se retira (también del orden de tabulación) y
  vuelve, pulsable, al bajar la hoja.
- La vista 3D «Horizon» ya no se queda muerta cuando el navegador le quita la GPU (VENT-49). La vista se libera y dice
  «Terrain unavailable right now» con «Try again», que la abre de nuevo en calidad baja (nunca se reabre sola), y esa
  calidad se recuerda durante la sesión. Además, si un fotograma de la carga tarda demasiado para la GPU del móvil, la
  vista baja sola un nivel de calidad. Para localizar un cuelgue desde el móvil,
  `?onfoot=astronaut,lander,shadows,far,shade,logdepth` deja fuera partes de la vista.
- La vista 3D «Horizon» ya no se vuelve a iluminar cada minuto (VENT-49). Con el reloj en vivo, cada minuto nuevo
  recalculaba la sombra de todos los anillos y dibujaba tres fotogramas completos para un Sol que se mueve 0,008°, y
  en el Pixel con ahorro de batería la GPU se reiniciaba poco después. Ahora solo se ilumina y se dibuja cuando el Sol o
  la Tierra, vistos desde el punto, se han movido 0,1° o más desde la última vez; cambiar de hora a mano pasa siempre
  ese umbral, y un cambio de punto, de calidad o de cámara también vuelve a dibujar. El atributo `lit` se sigue
  actualizando en el sitio: three r186 solo libera el búfer de la GPU junto con su geometría, así que sustituir el
  atributo lo dejaría colgado.
- Cuando el navegador quita la GPU a la vista 3D, el lienzo muerto sale de la página en el mismo evento, antes de que
  aparezca el mensaje, así que ya no se ve un fotograma congelado ni el icono de WebGL roto. El aviso «Terrain
  unavailable right now» conserva «Try again» como acción principal y añade «Copy report» (con la misma apariencia de
  la vista, sin parecer un fallo): copia un informe en texto plano de lo que hizo la vista desde que se abrió (como
  mucho 40 pasos con sus segundos, los últimos 8 fotogramas, la memoria de la GPU, la GPU, el navegador, la pantalla,
  los núcleos, la memoria y la batería), que se guarda en la sesión (`ventana.onFootReport`, la ejecución actual y la
  anterior) para poder recuperarlo si la página se recarga. No se envía a ningún sitio: lo copia la persona. Hay
  textos nuevos en los cinco idiomas, a revisar por una persona nativa en francés, alemán e italiano.
- Un fallo pasajero ya no deja un punto sin relieve toda la sesión (VENT-45). Si la API del horizonte no responde, está
  ocupada, limita las peticiones o da un error 5xx, la web vuelve a preguntar a los 2, 6 y 18 s (o cuando el servidor
  diga en su `Retry-After`, como mucho 30 s) y la franja sigue en «Smooth horizon · real terrain loading» mientras
  tanto. Si aun así falla, enseña «Real terrain unavailable here», pero lo vuelve a pedir al volver a la pestaña, al
  recuperar la conexión o al pulsar «Try again». Solo el 404 («ningún relieve cubre este punto») es definitivo. El
  servidor registra ahora cada respuesta de error de `/api/*` en una línea con el método, la ruta, el código y el
  tiempo, sin la IP, los parámetros ni el cuerpo.
- Arreglos tras el horizonte real (VENT-44):
  - Los sitios guardados de la lista enseñan su estado con el relieve real en cuanto llega su horizonte, pedido de uno
    en uno para no saturar el servidor. Mientras tanto, o si el servidor no tiene relieve, siguen con el horizonte liso.
  - El pin, mientras lo arrastras, también usa el relieve si ese punto ya se había consultado.
  - −170° y 190° de longitud cuentan como el mismo punto y no se piden dos veces.
  - El anillo del sitio elegido y el del pin laten tres veces y se quedan fijos, como la antena del modo DSN: una
    página quieta ya no redibuja sin parar.
  - En el móvil, con el texto al 200 %, la media hoja hace scroll cuando su contenido no cabe ni abierta entera.
  - Las etiquetas de las pestañas ya no parten palabras a la mitad con el texto al 200 %.
  - La descarga del relieve se para si otro servidor le quita el volumen, suelta el candado a tiempo aunque la
    paren mientras comprueba un fichero, y la imagen rechaza `/data//` y `/data/./` como rutas de montaje.

### Añadido
- **Banco de pruebas `?bench` (VENT-81).** Una herramienta de depuración para medir siempre la misma prueba en el
  móvil y comparar. Con `?bench` en la dirección aparece, cuando la página ya ha arrancado, un panel «Benchmark» con
  «Start» y el número de pasadas (1 o 3 por variante). Cada pasada recarga la página y repite el mismo guion v1 en el
  mismo instante fijo (19 de marzo de 1967 a mediodía UTC, fuera de la ventana de Horizons, así que no se pide
  efeméride): el globo quieto 5 s, giro y zoom hasta el mapa 4K, la vista 3D en IM-2 hasta que se asienta, una vuelta
  de 360°, cambio de punto a Malapert sin recargar y otra vuelta, y vuelta al globo. Todo con teclas simuladas, sin
  tocar la pantalla. La variante A es la app tal cual; la B libera el contexto WebGL del globo oculto mientras la vista
  3D está abierta (solo en el banco). El resultado compara A y B en la vuelta 3D (fotogramas por segundo, p95, peor
  fotograma, tareas largas, contextos WebGL vivos, memoria de texturas, montículo JS, contexto perdido) y «Copy report»
  copia un informe de texto con cada paso, cada métrica y cada pasada. Sin `?bench` no se descarga nada del banco.
- **Brújula en la vista Horizonte (VENT-63, variante A del lienzo con la pulsación de B).** El mismo botón redondo de
  cristal que en el globo, en la misma esquina (en el móvil, bajo la barra superior): la rosa gira con el rumbo para que
  la N apunte al norte real, y en el anillo solo está la Tierra, rellena si se ve y hueca si la tapan el relieve o el
  horizonte. Al pulsarla (o con Inicio) la vista vuelve con un muelle a su rumbo inicial, al instante con movimiento
  reducido. Su nombre accesible dice el rumbo, dónde está la Tierra y qué hace la pulsación, en los cinco idiomas.
- Aviso de versión nueva (VENT-52): cuando la app instalada (o cualquier página con el service worker) recibe una
  versión nueva, una fila con el aspecto de la pista del pin dice «New version ready» y debajo «Tap to update» (o «Click to
  update» con ratón); tocarla recarga la misma dirección (sitio, punto y vista) y su ✕ la oculta hasta la próxima vez que
  se abra la app. Se comprueba al abrir la app y cada vez que vuelve a primer plano; la pista del pin y la brújula se
  colocan debajo de ella. Javier eligió este diseño entre cuatro maquetas, en lugar de la píldora blanca «Update».
- Referencias de orientación en el globo (VENT-50). Una **brújula** de cristal de 48 px en la esquina superior derecha
  del globo (en el móvil, bajo la barra superior y bajo la pista del primer uso mientras se ve): su aguja señala siempre
  el norte, que el globo mantiene arriba, y una pequeña marca de la Tierra recorre su anillo hacia donde está la Tierra
  desde el centro de la Luna en el instante elegido; si la Tierra queda detrás de la Luna, la marca es hueca. Al pulsarla,
  el globo vuelve a su encuadre inicial para el sitio elegido (al instante con «reducir movimiento»), y su nombre
  accesible dice dónde está la Tierra y qué hace la pulsación, en los cinco idiomas. Y una **retícula** discreta sobre la
  Luna: los paralelos de 85° S, 80° S y 70° S y los meridianos de 0°, 45° y 90° al este y al oeste, con una cruz en el
  polo sur, en gris neutro al 40 %, con sus etiquetas de 10 px («85° S», «90° E», en español «90° O») ocultas tras el
  limbo y metidas 14 px dentro del disco de la Luna. Las etiquetas se apartan de los marcadores de los sitios y del
  anillo del sitio elegido (un paralelo se nombra en el meridiano más libre y se queda en él mientras siga libre), así
  que «85° S», que con los ocho sitios cercanos al polo no tiene sitio al abrir, aparece al acercar la Luna. No tiene
  interruptor en las Capas y un globo quieto sigue sin dibujar fotogramas. Las etiquetas van en blanco sobre un fondo al 61 %
  (el lienzo tenía texto gris sobre un fondo al 44 %): es lo mínimo que da 4,5:1 sobre el píxel más claro de los mapas
  de la Luna, que es blanco puro.
- «?debug» en la dirección abre el panel de rendimiento para diagnosticar (VENT-49): en la web publicada, añadir
  `?debug` muestra, cuando la página ya ha arrancado, el panel del estudio con fotogramas por segundo, tiempos de
  fotograma, llamadas de dibujo, triángulos y memoria de texturas, más el rastro de pasos que sobrevive a un fallo de la
  GPU (y que, con la vista «Horizon» abierta, anota también sus pasos). Sin `?debug` no se descarga nada de esto, no
  entra en la caché sin conexión, y el cambio de idioma lo conserva. Spector.js sigue fuera de la web publicada.
- Relieve alineado y por niveles de detalle para la vista 3D (VENT-46, solo servidor y simulador): la API sirve teselas
  de relieve de una cuadrícula global y determinista, en cuatro niveles (2, 8, 32 y 128 km de lado, de 129 x 129
  muestras), con el plano estereográfico polar de LOLA desde 60° hasta cada polo y una cuadrícula latitud-longitud entre
  medias. Las teselas vecinas comparten su borde y cada nivel comparte sus muestras con el de arriba, así que el visor
  puede construir anillos de relieve real hasta 32 km (o 128 km) y, más adelante, cargar teselas mientras camina.
  `GET /api/v1/terrain/tiles?lat&lon` dice qué teselas cubren cada anillo y `GET /api/v1/terrain/tiles/{scheme}/{level}/{x}/{y}`
  da una: alturas de 16 bits (error de 0,05 m, unos 33 kB frente a los 264 kB de la tesela de 4 km), su georreferencia
  y las capas de LOLA que la sirvieron. Las URL llevan un token de los niveles presentes y son inmutables un año; el
  ETag responde 304 sin recalcular. Cada tesela cuenta como una sola para el límite, que es propio y más holgado que el
  del horizonte (`TERRAIN_LOD_CACHE_MB`, 512 por defecto). La tesela de 4 km de VENT-34 sigue como estaba.
- Vista 3D a pie (VENT-34), en la pestaña «Horizon» del escritorio y del móvil: el sitio o el punto elegido visto desde
  el suelo, con el relieve LOLA que da nuestra API en 4 km alrededor. Abre en tercera persona, con el astronauta de NASA
  de pie en el punto mirando al Sol (o a la Tierra si el Sol está bajo el horizonte), y un conmutador «Third person |
  First person» pasa a los ojos a 2 m del suelo. Se mira alrededor arrastrando o con las flechas. El Sol y la Tierra
  están en su dirección real en el instante elegido; el Sol da la luz y las sombras duras, y la Tierra se ve como un
  disco iluminado con su fase. Más allá de los 2 km de relieve, un horizonte lejano sigue el perfil del punto, así que
  el Sol se esconde detrás de la misma cresta que dice la ficha. Lo que LOLA no ve está marcado como ilustrativo: rocas
  redondeadas de menos de 1 m, el grano del regolito y el módulo de aterrizaje provisional. Anillos a 25, 100 y 500 m,
  la cresta que tapa el Sol o la Tierra con su altura y distancia, y un texto para lectores de pantalla que dice dónde
  está cada uno. Solo se descarga al abrir la vista y no entra en la caché de instalación; con la página quieta no
  dibuja nada.
- La API comprime sus respuestas JSON con gzip (VENT-34): un mosaico de relieve viaja un 26 % más ligero.
- Nueva ruta `GET /api/v1/terrain/tile?lat&lon[&size]` con el relieve alrededor de un punto para la vista 3D a pie
  (VENT-34; decisión de Javier: esa vista toma el relieve solo de nuestra API). Devuelve una malla de 257 x 257 alturas
  LOLA (float32 en base64, en metros respecto al centro) sobre el plano tangente, de 2, 4 u 8 km de lado (4 por
  defecto), cada muestra de la malla más fina que la cubre, e indica qué mallas sirvieron y en qué proporción, para que
  el cliente sepa qué es medido y qué es interpolado. Usa las mismas mallas, caché de bloques, cola de cálculo,
  límite por dirección y caché en disco que el horizonte, con los mismos errores (400, 404, 429 y 503 «terrain data is
  not installed»). Una respuesta pesa unos 352 kB.
- El servidor descarga solo el relieve LOLA (VENT-43). Con `TERRAIN_FETCH_TIERS=all` y el volumen montado en
  `/data/terrain`, la API baja en segundo plano, un fichero detrás de otro, las mallas que le faltan (unos 48,6 GB en
  total), empezando por las más pequeñas: retoma donde lo dejó tras un corte o un reinicio, comprueba el sha256 de cada
  fichero antes de darlo por bueno, nunca llena el disco (se para si fuesen a quedar menos de 2 GB libres) y empieza a
  usar cada malla en cuanto está completa, sin reiniciar. Mientras tanto sigue sirviendo con normalidad. Nueva ruta
  `GET /api/v1/terrain/status` con el progreso de cada malla. Si el servidor aún no tiene relieve instalado, la franja
  del horizonte lo dice («Real terrain not installed on the server yet») en lugar de «Real terrain unavailable here»,
  que queda para los puntos que ninguna malla cubre. La imagen arregla al arrancar el propietario de los volúmenes
  montados, así que funciona aunque Docker los haya creado como root (solo dentro de `/data/` y `/var/cache/`). Al
  pararlo o redesplegarlo suelta el volumen al momento y la descarga sigue en el siguiente arranque sin esperar; solo
  tras un cierre brusco espera entre 2 y 2,5 minutos. No instala nunca un fichero que el catálogo no tenga fijado por
  su sha256 ni uno incompleto, aunque el servidor de origen ignore la petición por rangos o mande de más. En los cinco
  idiomas.
- Horizonte real con el relieve LOLA (VENT-40; opción B del lienzo, aprobada por Javier). El Sol y la Tierra ya no se
  miden contra un horizonte liso a 0°, sino contra el relieve de verdad que rodea cada sitio, calculado con las mallas
  de altura LOLA de NASA (LRO): un sitio en lo alto de una cresta ve el Sol aunque esté un poco por debajo de la
  horizontal, y el fondo de un cráter pierde la Tierra tras sus paredes aunque esté a 8° de altura. Los 14 sitios de
  la lista al sur de 80° S llevan su horizonte dentro de la web, así que responden al instante y sin conexión (en
  IM-2 el Sol se pone 2 h más tarde; en Haworth la Tierra se oculta todo noviembre). Las tarjetas lo dicen con
  palabras honestas: «Sun 0.1° below level · Over the ridge», «Earth 8.5° up · Behind the terrain», y el bloque DSN da
  «Behind the terrain» como motivo de que no haya enlace; la línea de la ficha pasa a «Sun and Earth over the terrain,
  Earth 3° up». Nueva franja «Horizon» en la ficha del PC y en la hoja del móvil: la silueta del relieve alrededor del
  sitio con el norte en el centro (S W N E S), su fuente y su exageración vertical en la cabecera («LOLA · 20 m ·
  Height ×5», fija para cada sitio: no cambia al mover la hora ni con el ancho de la pantalla), el Sol y la Tierra en
  su sitio en el instante elegido (atenuados y con «· hidden» cuando el relieve los tapa; si se salen de la escala,
  quedan en el borde con una flecha, y sus etiquetas nunca se pisan) y una descripción para lectores de pantalla. Al soltar el pin en cualquier punto, la franja enseña
  primero el horizonte liso («Smooth horizon · real terrain loading») y lo cambia por el relieve real en cuanto
  responde la API; si el servidor no tiene relieve para ese punto, se queda el liso con una nota discreta («Real
  terrain unavailable here»). Nueva ruta de la API, `GET /api/v1/horizon?lat&lon`, que calcula el horizonte de
  cualquier punto de la Luna leyendo solo los trozos de las mallas que cruzan sus rayos (documentada en
  `docs/terrain-api.md`). En el móvil, la hoja a media altura sube hasta que su contenido queda 12 px por encima de la
  barra de pestañas, a cualquier ancho, idioma y tamaño de letra (arregla el solape que había a 360 px). En los cinco
  idiomas.
- Sitios en sombra permanente (VENT-39; opción B del lienzo, aprobada por Javier). Según los mapas de iluminación de
  NASA (LRO LOLA, Mazarico et al. 2011, producto 69 de PGDA), cuatro de los sitios aproximados caen en el fondo de un
  cráter al que nunca llega el Sol: Shackleton (Chang'e-7), Haworth, de Gerlache Rim 2 y Slater Plain. Sus
  coordenadas no se mueven; bajo el nombre, en la ficha del PC y en la cabecera de la hoja del móvil, una nota neutra
  dice «Permanent shadow · not a landing point» y «NASA's maps put this point on a crater floor the Sun never
  reaches.» (en el PC, solo «Permanent shadow», porque la línea de precisión ya dice que no es un punto de
  aterrizaje). En esos cuatro el Sol sigue al mapa de NASA y no sale nunca, con el cielo calculado y con el de
  Horizons: el estado, la píldora, la tarjeta del Sol («No Sun · Permanent shadow»), las cifras del mes (Sol 0 %,
  ventana 0 %), la cinta del calendario, el marcador del globo y del mapa polar y el bloque DSN cuadran entre sí, y la
  Tierra queda como estaba, así que el estado es «Earth only» o «Neither». La fuente del Sol se cita en la misma línea
  que la nota del cálculo: «Sun from NASA's permanent-shadow map (LRO LOLA, Mazarico 2011)». «Peak near Cabeus B» no
  está en sombra permanente, pero su punto recibe un 11 % de Sol de media: solo lleva la nota «Crater floor · little
  Sun». En el móvil, la hoja a media altura sube lo que mide la nota, así que las cuatro tarjetas siguen donde
  estaban. Para el equipo Mooner, `packages/sim/data/psr-flags.json` lista los 14 sitios al sur de 80° S con su Sol
  medio, su fracción en sombra permanente y la procedencia de cada mapa (URL y sha256). En los cinco idiomas.
- Modo DSN: qué antena de la Red del Espacio Profundo escucha (VENT-7; opciones A y C del lienzo, aprobadas por
  Javier, sin fila DSN en el calendario y al minuto). En la ficha del PC y en la cuarta tarjeta del móvil, el bloque
  «Listening on Earth» enseña una Tierra pequeña vista desde la Luna, en plata y grafito con su terminador real y las
  tres estaciones (la que escucha, blanca y con un halo suave que late tres veces cuando empieza a escuchar), y dice
  qué complejo escucha, a qué altura ve la Luna, cuánto le queda y quién sigue: «Robledo · Madrid · Moon at 52° · ~6 h
  left», «Next: Goldstone tomorrow at 02:16 UTC» (el día solo cuando el relevo cae en otro día UTC). Se calcula
  después de que arranque el globo, así que la página abre tan rápido como antes. Los
  relevos se calculan al minuto con el simulador y coinciden con los de Horizons salvo a menos de una hora de un
  relevo. Si la Tierra está bajo el horizonte del sitio o por debajo de 3°, lo primero es «No link», con el motivo
  («Earth below the horizon» o «Earth too low here (needs 3°)»), y después qué complejo escucharía. Funciona igual con
  los sitios de la lista, el pin y los sitios guardados, y sigue al instante elegido al arrastrar o reproducir. Nueva
  vista «DSN»: una pestaña tras «Polar map» en el PC y una pestaña en la barra del móvil, con la Tierra grande, la
  marca «Moon overhead», el anillo «Moon above 10°», las estaciones con nombre y la banda de 24 h del día (UTC) con
  los tramos en que cada una ve la Luna por encima de 10°, los tramos en que escucha y la marca del instante. Las
  cifras del mes suman «Hours with DSN». Nunca usa los cuatro colores de señal; tema claro, movimiento reducido (el
  halo no late) y los cinco idiomas.

- Capas del globo como interruptores y sitios guardados (VENT-37, parte 2; opciones del lienzo aprobadas por Javier).
  La leyenda «Layers» del PC y un grupo «Layers» nuevo en la hoja «Sites» del móvil son ahora interruptores, cada uno
  con su marca: «Landing sites», «Approximate zones», «Saved sites» con cuántos hay y «Ghost rovers · soon» apagado.
  Apagar una capa quita sus marcadores del globo y del mapa polar (el sitio elegido siempre se ve) y se recuerda en el
  dispositivo. Con un pin puesto, «Save» (con un marcador de libro) en la ficha del PC y en la cabecera de la hoja del
  móvil lo guarda: pasa a «Saved», con un campo «Name this site» que empieza en «Near …» y la nota «Kept on this device
  only»; se guardan hasta 50, solo en el dispositivo y sin cuenta. Los guardados se ven como pines plateados más
  pequeños en el globo y en el mapa polar, y la lista de sitios (hoja del móvil y desplegable del PC) tiene una
  pestaña «Saved N» con su estado, coordenadas y un menú «…» para renombrar, copiar las coordenadas o borrar; borrar
  no pregunta y ofrece «Deleted … · Undo» durante cinco segundos. Sin guardados, la pestaña explica cómo guardar uno.
  La lista marca ahora el punto propio o guardado elegido, las etiquetas del mapa polar ya no se pisan con el aro del
  pin, y con el texto al 200 % la pista de la primera vez ya no tapa la leyenda «Layers». Para el equipo Mooner, una
  API de capas del globo (añadir, quitar, mostrar, ocultar y ordenar capas de puntos o de objetos 3D), sin interfaz de
  Ventana dentro y documentada con un ejemplo en `docs/globe-layers.md`. En los cinco idiomas.
- Pin para elegir cualquier punto de la Luna (VENT-37, parte 1; pin «C» del lienzo, elegido por Javier): un aro con un
  punto en el centro, que es el punto exacto, sin mástil, y que nunca se confunde con las zonas aproximadas (aro
  discontinuo sin punto). En el PC basta un clic en el globo o en el mapa polar; en el móvil, mantener el dedo quieto
  sobre la Luna medio segundo lo levanta bajo el dedo, y se suelta ahí mismo o se arrastra (sube por encima del dedo
  para que se vea el punto). Un toque corto o un arrastre siguen girando el globo y un clic en un sitio sigue
  eligiéndolo. Una vez puesto, el pin se vuelve a coger y se arrastra con la etiqueta de coordenadas y estado en vivo;
  fuera de la Luna dice «Off the Moon · Let go to cancel» y vuelve con un muelle sin rebote, y Esc cancela. Su punto
  central toma el color del estado (hueco mientras es el cálculo propio, relleno cuando llega Horizons) con el aro de
  estado alrededor, como el sitio elegido, y al caer baja con un muelle corto (sin animación con movimiento reducido).
  Todo lo del punto propio se mantiene: «Custom point», «Near …», la dirección `?lat&lon`, Horizons y la lectura en
  la ficha («pinned here»). Elegir un sitio de la lista o del globo quita el pin. Para teclado y lector de pantalla,
  «Drop a pin» al final de la leyenda «Layers» del PC y arriba de la hoja «Sites» del móvil: un clic lo pone en el
  sitio elegido; con Intro se mueve con las flechas e Intro lo suelta, anunciado en voz alta. La primera vez, una
  línea lo explica («Click the Moon to drop a pin» en el PC, «Touch and hold the Moon to drop a pin» en el móvil) y
  desaparece con su ✕ o al poner el primer pin, para siempre en ese dispositivo. En los cinco idiomas.
- Sensación de app (VENT-38, petición de Javier): mantener pulsado el título, la cápsula del sitio, la hoja, las
  tarjetas o cualquier otra parte de la interfaz ya no selecciona texto ni abre la búsqueda de Google en Android ni el
  menú de iOS, y tocar no deja destello azul. Siguen seleccionables el campo de búsqueda de sitios y las coordenadas
  del sitio (en la ficha del PC y en la hoja del móvil), para poder copiarlas. Las imágenes no se arrastran y mantener
  pulsado el astronauta ya no abre el menú contextual, así que siempre empieza a cogerlo. El lector de pantalla lee
  lo mismo que antes.
- Astronauta algo más pequeño (VENT-38, «igual un poquito más pequeño sería mejor», Javier): un 18 % menos en el
  hueco, al llevarlo y de pie en el punto (36, 70 y 46 px de alto), en PC y móvil; los botones siguen midiendo al
  menos 44 px y los pies siguen cayendo justo en la cruz.
- Astronauta del Apolo arrastrable a cualquier punto de la Luna (VENT-10, opción A + B del lienzo, aprobada por
  Javier): el modelo «Astronaut» de la NASA (dominio público), con los brazos bajados y sin la insignia de la NASA ni el parche de misión (las banderas de EE. UU. se quedan),
  espera en un hueco al final de la leyenda «Layers» del PC («Drag me anywhere») y en un botón redondo de cristal junto
  a la barra de pestañas del móvil. Se coge con el ratón o el dedo y sigue a la mano desde donde se agarró (en el móvil,
  por encima del dedo, y la hoja baja a reposo mientras tanto), inclinado y con su sombra, con una cruz en el punto de
  caída y una etiqueta con las coordenadas y el estado de ese punto en el instante elegido; el visor toma el color del
  estado (plata neutro en el hueco y fuera de la Luna). Funciona sobre el globo y sobre el mapa polar. Fuera de la Luna
  dice «Off the Moon · Let go and it walks home» y, al soltarlo, vuelve a casa con un muelle sin rebote; Esc cancela.
  Al soltarlo en la Luna, el punto pasa a ser el sitio elegido: «Custom point», «Near <sitio más cercano> · N km» y sus
  coordenadas, con la respuesta al instante del cálculo propio (punto hueco) y la de Horizons para esas coordenadas
  cuando llega (punto relleno). El astronauta se queda de pie en el punto y se puede volver a coger allí; el hueco dice
  «On the Moon» y con un clic (un toque en pantallas táctiles) vuelve a casa y se elige otra vez el sitio de antes. En
  el mapa polar, los nombres de los sitios se leen por encima del astronauta cuando está de pie a su lado. El punto
  entra en la dirección (`?lat=…&lon=…`, junto a `?site=`), así que se comparte y sobrevive a una recarga; al elegir
  un sitio de la lista el punto sale de la dirección, para que una recarga abra lo que se ve. Solo valen números
  decimales simples dentro de rango (latitud ±90°, longitud de -180° a 360° este); cualquier otra cosa se ignora. Con teclado: Intro sobre el hueco
  lo coge, las flechas lo mueven (con Mayúsculas, a pasos grandes), Intro lo suelta y Esc lo devuelve, y el lector de
  pantalla oye cada paso; al soltarlo dice dónde ha quedado y cómo volver a moverlo. Con movimiento reducido va derecho y se desvanece en vez de volar. En los cinco idiomas.
  Las imágenes del astronauta vienen dibujadas de antemano (una sola imagen de 77 kB con las dos posturas y los cinco
  colores del visor, idéntica píxel a píxel a lo que antes se dibujaba en el navegador): la página ya no descarga el
  modelo 3D ni lo dibuja al cargar, así que el astronauta no gasta nada mientras arranca el globo; en un móvil estrecho o con texto grande, donde el botón del astronauta sube sobre la barra de pestañas, la
  hoja sube lo mismo para que el botón no tape «Reintentar» ni las tarjetas.
- Respuesta al instante con el cálculo propio y conmutador para compararlo con Horizons (VENT-36, opción C del lienzo,
  aprobada por Javier): al elegir un sitio, la píldora, las tarjetas, la ficha y el calendario se pintan en el acto con
  el Sol, la Tierra y la antena DSN que calcula la propia web, sin esperar a JPL Horizons; cuando llega Horizons, lo
  sustituye. Mientras se ve el cálculo propio, el punto de estado de la píldora (y el del botón del sitio y la etiqueta
  de la ficha en el PC) es un anillo hueco del color del estado, y el lector de pantalla añade «calculado»; al llegar
  Horizons se rellena (también el marcador elegido en el globo y en el mapa polar, y el botón del sitio del PC dice
  «calculado» al lector de pantalla). Si Horizons falla, se queda el cálculo propio con el punto hueco y una nota
  discreta, «Horizons no disponible: se muestra el cielo calculado», con «Reintentar» (decisión del orquestador en la
  revisión), también con «Compare». El cálculo propio que se queda en pantalla lleva un pie, decisión de Javier:
  «Calculado por Ventana Lunar · aproximado: elevaciones a menos de 0,05° de JPL Horizons» en los meses en que se
  comprobó (noviembre y diciembre de 2026) y «extrapolado: sin contrastar con JPL Horizons este mes» en cualquier otro;
  el 0,05° es la cota de la elevación (el acimut del Sol difiere hasta 0,17°) que el test de validación del simulador
  exige, en una sola constante, medida en dos puntos del polo y válida para cualquier sitio. Un conmutador
  «Computed | Horizons | Compare» («Fuente de datos») elige de dónde salen los datos de toda la vista: en el PC, bajo
  una línea fina en la leyenda «Layers»; en el móvil, en el panel de sitios junto a «Idioma». Por defecto «Horizons» y
  la elección se recuerda en el dispositivo. Con «Computed» todo es cálculo propio (punto siempre hueco y la ficha dice
  «calculado aquí») y sirve para cualquier mes, también fuera de 2026-2027: las flechas del mes pasan de la ventana de
  datos; «Horizons» y «Compare» siguen diciendo «Fuera de la ventana de datos» fuera de ella. Con «Compare» se ve Horizons y la cinta del calendario (y las columnas del calendario del móvil)
  raya en blanco neutro sobre huecos oscuros (al menos 8 px de ancho en la cinta, para que una hora se vea) las horas
  en que los dos cálculos no coinciden en Sol, Tierra o ventana, cuenta «3 h difieren este mes» y la leyenda gana
  «Difiere» (en el móvil, junto a la cuenta); si Horizons no está disponible, lo dice en vez de fingir que no hay
  diferencias. Se maneja con teclado (flechas, Inicio, Fin) y está en los cinco idiomas. La fase de la Luna del icono
  de la pestaña sale ahora del Sol del simulador: cae a menos de un cuarto de hora de las lunas nueva y llena reales.
  Arreglado en la revisión: en un portátil de 1280×720 en español, el marcador de Chang'e-6 tapaba «Comparar» y el clic
  elegía el sitio; ahora la leyenda y las demás superficies flotantes quedan siempre por encima de los marcadores. Con
  el texto al 200 %, la etiqueta «Ventana de aterrizaje ahora» ya no pisa «LOLA · 30 km» en la imagen de la ficha.
- Aplicación instalable (VENT-28, icono «J2» elegido por Javier): Ventana Lunar se instala en el móvil y en el PC con
  su icono, una Luna real (de los mapas LROC y LOLA de la NASA) dentro del anillo de la leyenda (Sol, ventana, Tierra).
  Cada idioma se instala como su propia app, con su descripción traducida, y en Android y en el escritorio el icono
  ofrece accesos directos a cuatro sitios destacados (IM-2, Shackleton, Haworth y Apolo 11); cualquier enlace puede
  abrir un sitio con `?site=<id>`. El icono de la pestaña está vivo: muestra la Luna en su fase del instante elegido
  (con la luz cenicienta en la parte oscura) y el anillo resalta el estado del sitio elegido (ventana, solo Sol o solo
  Tierra; con «ninguno» o sin datos, la leyenda entera). Mientras el globo carga se ve el icono con la fase de hoy, hasta
  que el mapa de la Luna está puesto (nunca una esfera gris lisa). Sin conexión, la app abre con lo que ya se vio (las
  páginas, el mapa y los datos de las últimas consultas) y avisa «Sin conexión · datos del 31 de octubre de 2026» (en
  los cinco idiomas) bajo la barra superior, sin tapar el botón del sitio aunque el texto esté al 200 %; al volver la
  red, actualiza los datos sin recargar. Al instalarse descarga de una vez todo lo necesario para funcionar sin conexión
  (las páginas en los cinco idiomas, los iconos y las fases de la Luna, las miniaturas de los sitios y los mapas de 1K,
  2K y el polar), siempre por debajo de 5 MB: la compilación falla si se pasa. Los mapas de 4K y 8K se guardan cuando
  el zoom los pide, y con «Ahorro de datos» no descarga nada extra ni funciona sin conexión. Lo que las plataformas no permiten: el icono de la
  pantalla de inicio no cambia una vez instalado (iOS nunca lo refresca), iOS no usa los accesos directos y, sin
  imágenes de arranque por tamaño de pantalla, enseña una pantalla lisa hasta que pinta la página.
- La web en cinco idiomas (VENT-35, lienzos validados «LangDesktop» y «LangPhoneB»): inglés (por defecto), español,
  francés, alemán e italiano, cada uno en su dirección (`/`, `/es/`, `/fr/`, `/de/`, `/it/`), con el idioma declarado en
  la página y los enlaces entre versiones para los buscadores. En el PC, un botón «🌐 EN» al final de la cabecera abre la
  lista de idiomas; en el móvil, una fila «Language · English ›» bajo el título del panel de sitios la abre dentro de la
  hoja con «‹ Back», deslizándose como en iOS (o con un fundido si se pide menos movimiento). La lista es como la de
  Apple: cada idioma con su propio nombre, debajo su nombre en el idioma actual y ✓ en el elegido; se maneja con
  teclado (flechas, Inicio, Fin, Escape devuelve el foco) y el idioma elegido se recuerda. La primera visita a `/` abre
  el idioma del navegador una sola vez; un enlace con idioma (`/fr/`) se respeta siempre. Fechas, números («84,79° S»),
  porcentajes y duraciones («7 j 1 h», «7 Tg. 1 Std.») van en el formato de cada idioma, y los estados y fechas de las
  misiones también se traducen, con sus fechas. De los nombres de sitios y misiones se traducen las palabras
  descriptivas («Región de Malapert A», «al norte de Boguslawsky»); los nombres propios se quedan como están. Las traducciones las ha escrito
  Claude: conviene que una persona nativa las revise antes del 13 de noviembre.
- Acabado Liquid Glass (VENT-27, prototipo VENT-16 aprobado): en los navegadores Chromium con potencia (Chrome, Edge,
  Brave, Android), las superficies flotantes refractan lo que hay debajo como un vidrio grueso y tienen un borde que
  capta la luz, con un tinte fino que deja ver la Luna: cada superficie lleva su propia lente, que curva hacia dentro lo
  que hay debajo cerca del borde, como en el prototipo. En el móvil la barra superior, la hoja, la barra de pestañas y la
  tarjeta del sitio (la píldora del sitio, que va dentro del cristal de la barra superior, solo lleva el borde de luz); en
  el PC la cabecera, el menú de sitios, la leyenda «Layers», la cinta del
  calendario, la ficha y la tarjeta del sitio. Si el dispositivo va justo (nivel de calidad bajo, o 2 s de fotogramas,
  al cargar y de nuevo al primer toque o clic, no aguantan el ritmo de su nivel), si se pide menos transparencia o más
  contraste, o con ahorro de datos, se queda el cristal esmerilado de siempre; si la prueba de fotogramas falla, cambia
  en caliente y no vuelve a intentarlo en la sesión. Safari y Firefox, que no pintan la refracción, siempre van con el
  esmerilado. `?glass=liquid` o `?glass=frosted` fuerzan uno para probar, salvo que `?glass=liquid` nunca pasa por encima
  de pedir menos transparencia o más contraste. En la barra superior, la barra de pestañas, la leyenda «Layers» y la
  tarjeta del sitio el texto va sobre un velo difuminado que deja libre el borde, para que se lea (al menos 4,5:1 sobre
  la Luna) sin perder la refracción del borde. En el PC con GPU por software (Chromium sin
  GPU) la refracción cuesta la mitad de los fotogramas, y es justo el caso en que la prueba vuelve al esmerilado.
- Tarjeta del sitio sobre el globo (VENT-29, lienzos validados «Globe · site callout B, image card» para escritorio y
  «… A, compact» para el móvil): la etiqueta del sitio elegido pasa a ser una tarjeta de cristal unida a su punto por una
  línea fina. En escritorio lleva arriba una vista del terreno desde la órbita con el estado del instante («Landing
  window now», «Sun only», «Earth only» o «Neither», en sus colores) y el ancho que abarca («LOLA · 30 km»); debajo, la
  misión y la fecha, el nombre del lugar, las coordenadas y su precisión, y cuánto falta para la puesta de Sol y de
  Tierra. En el móvil es compacta: la miniatura a la izquierda y, al lado, la misión con su fecha (sin «landed»: «IM-2
  Athena · 6 Mar 2025»), el lugar, solo las coordenadas («84.79° S · 29.20° E»; el estilo del punto ya dice si es exacto)
  y una píldora con el estado y el tiempo que le queda («Landing window · 7 d 1 h left»), cada cosa en una línea. La
  línea de la misión dice cada dato una vez («Artemis candidate region · landing planned 2028», «Chang'e-7 target ·
  planned · 2027 (launch NET)»); en escritorio ocupa como mucho dos líneas. Sigue al punto al girar el globo, se coloca
  dentro de la parte visible sin tapar nunca la leyenda «Layers», la barra superior ni las pestañas (cambia de lado; si
  ningún lado queda libre, o el punto está debajo de una de ellas, se oculta) y se oculta también cuando el punto pasa
  detrás del borde de la Luna o bajo la hoja. Cambia con el deslizador, dice lo mismo que la ficha y las tarjetas del
  móvil, y deja pasar los clics a los puntos que tenga debajo. Mientras llegan los datos del mes, el estado y las
  cuentas atrás se ven como huecos grises; si la API falla, una píldora neutra dice «Data unavailable». Al cambiar de
  sitio la imagen anterior no se queda: el hueco espera a la nueva. El punto elegido toma el color de su estado con un
  halo del mismo color. Con el texto al 200 % la tarjeta deja la imagen y las cuentas atrás y muestra la píldora, para
  que nada quede cortado ni tape el globo. Las vistas del terreno son relieve sombreado con el Sol bajo del modelo de
  elevación LOLA del polo sur (NASA, 20 m por píxel), una por punto al sur de 80° S (Haworth, que es un cráter de 51 km,
  con 62 km de ancho), a 320 px y a 640 px para pantallas retina (cada dispositivo descarga solo la suya, y solo la del
  sitio elegido); un script las rehace descargando solo las filas que necesita, y `ASSETS.md` registra la fuente, el
  proceso y cada fichero. Los sitios más al norte van sin imagen.
- Ficha del sitio y mapa polar (VENT-5, lienzos validados «Globe view» y «Polar map»): en escritorio, a la derecha del
  globo, una ficha con la misión, la agencia y la fecha de alunizaje, el nombre del sitio, sus coordenadas y si el
  punto es exacto o una zona aproximada; dos recuadros grandes con cuánto falta para que se ponga (o salga) el Sol y
  la Tierra en el instante elegido, con su altura; y, del mes que se ve, las horas con Sol, con Tierra y con ventana de
  alunizaje, la ventana más larga y la noche más larga, con la fuente de los datos. Usa los mismos cálculos que las
  tarjetas del móvil y la cinta, así que nunca discrepan; al mover el deslizador cambia con él; mientras carga enseña
  bloques grises, si falla dice «Try again» y fuera de 2026-2027 lo dice. En pantallas estrechas va debajo del globo.
  La pestaña «Polar map» cambia el globo por un mapa del polo sur hasta 80° S: el mosaico de color LROC de NASA
  reproyectado en estereográfica polar (0° arriba, 90° E a la derecha), con meridianos cada 30°, el paralelo de 85° S
  discontinuo y todos los sitios al sur de 80° S (punto: alunizaje exacto; anillo: zona aproximada). Al pulsar uno, o
  elegirlo con el teclado, queda seleccionado y la ficha, la cinta y el globo lo siguen; el sitio elegido lleva el
  color de su estado en ese instante. Si dos sitios están muy juntos gana el punto más cercano al clic. Cambiar de
  pestaña conserva el sitio y la hora, y el botón Atrás vuelve a la vista anterior. Un sitio más al norte (Apolo 11,
  por ejemplo) no sale en el mapa: el mapa lo dice en una nota junto al disco y la ficha lo sigue mostrando. Todo
  sitio del mapa se identifica sin pasar el ratón: si su nombre no cabe, lleva un número y la leyenda «Numbered
  sites» lo nombra; un alunizaje exacto conserva su etiqueta frente a una zona pegada a él; varios sitios en un mismo
  punto se leen «Nobile · 3 sites». En una pantalla baja la ficha se desplaza, se difumina en el borde que esconde
  más y se puede recorrer con el teclado; con el texto al 200 % la leyenda «Layers» del globo no tapa la etiqueta.
- Store de tiempo, cinta de calendario y selector de sitio (VENT-4, lienzos validados «Globe view» y «Phone ·
  calendar»): toda la página sigue un mismo instante. Por defecto es «ahora» y avanza con el reloj; se puede elegir otra
  hora, reproducir el mes (unos 12 s por mes, se para al final del mes o con Pausa) y volver con «Now». La luz del Sol
  en el globo, las tarjetas del móvil (también la antena DSN) y el calendario muestran esa hora. En escritorio, bajo el
  globo, una cinta con el mes y sus flechas, la leyenda, tres barras con datos reales por hora de la API (Sol, Tierra y
  ventana de alunizaje), la línea del instante, los días, Play, la fecha y un deslizador por las horas del mes (flechas:
  una hora; Re Pág y Av Pág: un día). En la cabecera, un botón con el sitio elegido abre la lista de sitios con su
  buscador; al elegir uno el globo gira hasta él. En el móvil, la pestaña «Calendar» (ya sin «soon») abre la hoja
  entera con el mes, los porcentajes de Sol, Tierra y ventana, tres columnas que se recorren arrastrando el dedo o con
  el teclado, Play, la fecha y «Now». Las tarjetas dicen a qué hora se refieren cuando no es «ahora». Cada sitio pide
  a la API una sola vez cada mes (el mes y los 30 días siguientes), así que reproducir o arrastrar no vuelve a pedir
  datos. Con menos movimiento, Play sigue avanzando pero nada se anima.
- Licencia MIT (VENT-26): el código es de Universelle (© 2026) bajo licencia MIT, con el texto en `LICENSE`. Cada
  fichero de código lleva la misma cabecera: el logotipo de Universelle y una Luna en ASCII dibujada a partir de
  nuestro propio mapa LROC, con el nombre del proyecto, el reto y la licencia. `npm run headers` la pone y el CI falla
  si un fichero de código no la tiene. No usa el logotipo de NASA: su uso está restringido.
- El globo gana detalle al acercarse (VENT-24): al hacer zoom descarga el mapa de color LROC en 4K y, de cerca, en 8K,
  sin parpadeo al cambiar y sin pasar de lo que el equipo necesita (el móvil se queda en 4K, el 8K es para escritorios
  potentes y con el ahorro de datos no se descarga nada más que el mapa inicial). Las texturas se filtran mejor de
  lado (filtrado anisótropo). Y la Luna tiene relieve: un mapa de normales sacado de la altimetría LOLA de NASA hace
  que cráteres y macizos proyecten luz y sombra a lo largo del terminador, sobre todo en el polo sur, donde la foto de
  color apenas tenía detalle; la cara nocturna se queda a oscuras, sin bordes de cráter encendidos más allá del
  terminador. Los equipos modestos también llegan a 4K si su tarjeta gráfica lo admite.
- La hoja del móvil se puede cerrar (VENT-24, lienzo validado): arrastrándola hacia abajo, con «Globe» o con «Done» en
  el selector queda solo la Luna, centrada entre la barra de arriba y la de pestañas. Se vuelve a abrir con la píldora
  del sitio o con «Sites» (selector) o arrastrando hacia arriba desde la barra de pestañas (media altura). La página
  recuerda durante la sesión dónde dejaste la hoja. Cerrada, la hoja no se lee ni recibe el foco, y la Luna sigue
  ocupando toda la pantalla aunque acerques el zoom. Asomada, la hoja enseña solo el nombre y las coordenadas, por
  encima de la barra de pestañas. Los marcadores del globo se pulsan mejor con el dedo (zona táctil de 44 px) sin
  verse más grandes.
- Versión para móvil (VENT-23, lienzo validado): el globo 3D ya se ve en el teléfono, a pantalla completa y con calidad
  ajustada (textura 1K y resolución limitada); se gira con un dedo y se acerca pellizcando. Arriba, una barra de cristal
  con el título y una píldora con el sitio elegido y su estado. Abajo, una hoja que se arrastra con el dedo y se lanza
  con inercia hasta tres alturas (asomada, media y casi entera), rebota solo tras un gesto rápido, se puede atrapar en
  pleno movimiento y, si el sistema pide menos movimiento, salta sin muelles; con el teclado, el asa cambia de altura. A
  media altura muestra cuatro tarjetas con datos reales de la API: la ventana de alunizaje ahora y el % del mes, cuánto
  falta para que se ponga (o salga) el Sol, lo mismo para la Tierra, y qué antena de la DSN escucha y durante cuánto.
  Mientras cargan se ven en gris y, si la API falla, lo dice y ofrece reintentar. Una barra de pestañas flotante lleva
  Globe, Calendar y Horizon (estas dos, «soon») y Sites, que abre el selector: buscador por sitio o misión, filtro Polo
  sur / Apolo / Otros y la lista con el símbolo exacto o aproximado. Elegir un sitio gira el globo hasta él y actualiza
  las tarjetas; la zona de Mons Mouton que el globo tapa ya se puede elegir desde la lista. Con el ahorro de datos
  activado, el globo no se descarga hasta pulsar «Load the 3D globe». Funciona en claro y oscuro (el cielo sigue negro),
  con menos transparencia y con más contraste.
- Ajustes del móvil tras la revisión (VENT-23): las cuentas atrás miran 30 días hacia delante desde la hora actual y ya
  no se cortan a fin de mes (el % sigue siendo del mes natural); los valores abiertos se leen «at least 7 d»; fuera de
  2026–2027 la hoja lo dice («Outside the data window (2026–2027)») en vez de enseñar datos de otra fecha; y las
  tarjetas se recalculan al cambiar la hora y al volver a la pestaña. El buscador del selector busca en todas las
  regiones y dice la región de cada resultado. La píldora y el título distinguen IM-2 de la zona Artemis de Mons Mouton
  con una segunda línea. La etiqueta del globo no se queda debajo de la hoja (sube o se oculta con su marcador). El asa
  de la hoja tiene 44 px de alto para el dedo, y un arrastre cancelado ya no se come el siguiente toque. El verde de
  «Right now» en modo claro sube a 5,1:1 de contraste.
- Globo lunar 3D (Three.js) en escritorio: la Luna con el mosaico de color LROC de NASA, iluminada por el Sol en su
  posición real (el terminador coincide con JPL Horizons con menos de 0,2° de error) y vista desde encima del polo sur.
  Se gira arrastrando, con las flechas del teclado o con inercia tras un gesto rápido (sin inercia si el sistema pide
  menos movimiento), y se acerca con la rueda o el pellizco. Los sitios llegan de la API: punto sólido para un alunizaje
  exacto y anillo punteado para una zona aproximada; al elegir uno, una etiqueta muestra su nombre. Los sitios que
  comparten coordenadas se agrupan en un solo marcador, y un anillo que taparía otro marcador se oculta hasta que se
  acerca la vista, de modo que cada punto visible se puede pulsar.
- Modo claro de la página, que sigue la preferencia del dispositivo (el cielo lunar sigue negro).
- API de datos (`/api/v1/sites`, `/api/v1/sites/:id` y `/api/v1/ephemeris` para cualquier punto de la Luna): Sol, Tierra, ventanas de alunizaje y antena de la DSN hora a hora, calculados con JPL Horizons y guardados en caché. 29 sitios con sus fuentes; 12 de ellos marcados como zona aproximada.
- Proyecto en Astro + React con una página provisional en modo oscuro: el nombre, la pregunta «When can you land at the
  lunar south pole?», los días que faltan para el hackathon y la leyenda de los tres colores (Sol, Tierra, ventana).
- Integración continua con lint, tipos, tests, build, prueba en navegador, gate de idioma y escalera de seguridad.
- Despliegue en Dokploy: imagen Docker con nginx que sirve la web estática.
- `/api/v1/health` informa del tamaño de la caché de puntos personalizados y de su límite, para poner una alarma de disco.
- Guía de diseño `apple-design` incluida en el repo para que toda la interfaz la siga.
- Kit de depuración solo para desarrollo: panel de rendimiento, rastro de la sesión anterior, niveles de calidad y
  Spector.js. La build de producción comprueba que no llega a la web publicada.

### Seguridad
- El móvil solo acepta identificadores de sitio con letras minúsculas, cifras y guiones (hasta 64), antes de construir
  una URL, limita la longitud de cada hora de la respuesta y rechaza respuestas de más de 2 MB.
- La web envía cabeceras de seguridad en todas sus rutas, con una política de contenido (CSP) calculada en cada build;
  nginx corre sin privilegios y no dice su versión.
- La API envía cabeceras de seguridad, no deja cachear sus errores y respeta la espera que pide JPL Horizons; una
  respuesta «ocupado» ya no gasta el cupo de la IP.
- La web pide al navegador que la abra siempre por HTTPS (HSTS, un año, también en los subdominios).
- Imágenes Docker fijadas por digest, acciones del CI fijadas por commit y descargas verificadas con su checksum.

### Cambiado
- El astronauta deja de ser el selector de puntos (VENT-37, decisión de Javier: «no queda profesional como
  selector»): se van su hueco en la leyenda «Layers» y su botón junto a la barra de pestañas del móvil, y con ellos la
  subida de la hoja a 360 px que los esquivaba. El modelo y su hoja de figuras se quedan en el repositorio para
  VENT-34, donde vuelve; ya no se descargan (la instalación sin conexión baja de 4,60 a 4,52 MB).
- Fuera la tarjeta flotante del globo (VENT-33, lienzos «PillStateP1…», «SheetThumbD», «DeskThumbH1440» y
  «DeskThumbH1280», tras la auditoría de UX): tapaba entre el 18 % y el 32 % de la Luna, repetía el nombre y el estado y
  no se podía pulsar. En el móvil, la píldora del sitio de la barra superior lleva el nombre corto en la primera línea
  («IM-2») y en la segunda el estado del instante elegido con el tiempo que le queda, en su color: «Window · 7 d left»,
  «Sun · …», «Earth · …» o «Neither · …» (horas cuando queda menos de un día; «30+ d» cuando dura más que los datos);
  mientras llegan los datos dice «Loading…» y, si la API falla, «Data unavailable», en gris. Si falta sitio (pantallas
  de 320 px o texto al 200 %), el título se parte primero y luego la píldora quita «left» y después el nombre del
  estado, pero nunca el tiempo («Window · 23 h» o «23 h»). El lector de pantalla oye
  el nombre completo y el estado. El subtítulo de la barra pasa a ser la regla de la leyenda, «Sun + Earth = window»,
  cada palabra en su color (más oscuros en modo claro para leerse a 4,5:1), y se va la pista del gesto. La cabecera de
  la hoja lleva la vista del terreno LOLA junto al nombre. En el PC la vista del terreno encabeza la ficha del sitio de
  la derecha, con el estado («Landing window now») y su ancho («LOLA · 30 km»); en ventanas bajas, como 1280x720, es
  una banda de 96 px para que las cuentas atrás sigan a la vista. Los sitios al norte de 80° S, sin vista del terreno,
  no muestran nada en su lugar (antes, un círculo vacío que parecía una imagen rota). El anillo del punto elegido sigue
  igual, y el encuadre al abrir la página o elegir un sitio deja ahora el punto entre la barra superior y el borde de
  la hoja.
- La tarjeta del sitio sobre el globo ya no sigue a su punto al girar el globo (VENT-32, lienzos «FixedCalloutPhone»,
  «FixedCalloutPhoneClosed» y «FixedCalloutDesktop»): queda fija abajo a la izquierda. En el PC, encima de la leyenda
  «Layers» y alineada con ella, con 14 px de separación (en una ventana de portátil baja, como 1280x720, pasa a la
  tarjeta compacta, sin imagen ni cuentas atrás; con el texto muy grande, si ni así cabe encima, se oculta: la ficha
  del sitio a la derecha ya lo enseña). En el móvil, a 12 px del borde izquierdo y 12 px por encima del borde de la hoja, o de la barra de pestañas
  con la hoja cerrada; sigue a la hoja cuando se arrastra y se desvanece con la hoja abierta del todo o si fuese a tapar
  la barra superior. Se ve aunque el punto quede detrás del borde de la Luna. A cambio, el punto del sitio elegido lleva
  un anillo del color de su estado que late cada 2,4 s (quieto con «reducir movimiento»). Se retiran la línea que unía
  la tarjeta con su punto, el cambio de lado y las esperas contra el parpadeo de VENT-31, que ya no hacen falta.
  Para que la tarjeta no tape el punto elegido, al abrir la página y al elegir un sitio en la lista el globo gira lo
  justo para dejarlo entre la barra superior y la tarjeta; si la tarjeta se mueve después (la hoja cambia de altura),
  vuelve a girar con el mismo muelle, salvo que el usuario ya haya movido el globo.
- El objetivo de Chang'e-7 se llama ahora «Shackleton crater area» en vez de «Shackleton rim»: no hay coordenada
  publicada del punto de aterrizaje en el borde, y el punto que se muestra es el centro del cráter (VENT-29).
- La página provisional da paso a la pantalla principal del lienzo: cabecera con el título, la pregunta y el selector de
  vista (solo «Globe» por ahora) y el globo. La cuenta atrás y la leyenda provisional salen; la leyenda de colores
  vuelve con la cinta de calendario (VENT-4).
- El código cumple la Norma de 42 adaptada a TypeScript (funciones de 25 líneas, 80 columnas, 5 funciones por fichero),
  comprobada en el lint.

### Corregido
- Guardar un punto desde la hoja completa del móvil (VENT-42, encontrado por Javier en Android). Con la hoja a toda
  altura (la lista «Landing sites» con «Done») no había forma de guardar el punto del pin, porque «Save» solo estaba
  en la cabecera de la hoja a media altura. Ahora, junto a «Done», un botón con solo el icono del marcador (vacío sin
  guardar, relleno guardado) aparece cuando lo seleccionado es un punto propio: guarda el punto con su nombre «Near …»
  y, pulsado otra vez, lo borra con el aviso de deshacer, igual que «Save». Sin texto visible, pero con nombre para
  lectores de pantalla («Save» / «Saved: press to remove it from this device»), 44 px de zona táctil y alcanzable con
  el teclado. En el PC no cambia nada: la ficha del sitio, con su «Save», sigue a la vista con la lista abierta.
- Modo DSN (VENT-7, pase adversario del cierre del MVP). Con la página abierta y la hora en directo, el instante sigue
  ahora al reloj minuto a minuto (y se pone al día al volver a una pestaña oculta): el relevo de antenas se ve en el
  minuto en que ocurre, en la ficha, en la vista «DSN» y en la tarjeta del móvil, en vez de seguir diciendo «Robledo ·
  16 min left» hasta la hora siguiente. Con el texto al 200 % en el móvil, las etiquetas de la Tierra de la vista
  «DSN» («Moon overhead», «Goldstone»…) se desplazan hacia dentro y ya no se salen de la pantalla.
- La tarjeta de antena del móvil decía «Robledo · ~2 h left» aunque el sitio no tuviera enlace con la Tierra (Tierra
  bajo el horizonte); ahora dice «No link» primero (VENT-7).
- Sitios guardados (VENT-37, revisión del Guardián). Dos pestañas abiertas ya no se pisan: guardar, renombrar o borrar
  en una conserva lo hecho en la otra, y cada pestaña se pone al día sola, también con las capas encendidas o
  apagadas. Borrar varios seguidos ofrece deshacerlos todos juntos («Deleted 2 sites · Undo») y cada uno vuelve a su
  sitio. Quien borra con el teclado llega a «Undo» sin buscarlo (el foco va ahí y el tiempo se para mientras está), y
  Esc lo descarta y vuelve a la lista. Pulsar «Undo» ya no cierra el desplegable de sitios del PC. Un nombre largo se
  corta con puntos suspensivos en el botón de sitio y la cabecera del PC no salta a dos filas; las coordenadas de la
  lista no dejan una «W» sola en otra línea. Una lista de más de 50 guardados de una versión anterior se ve entera y
  ya no pierde ninguno al guardar. Los nombres ya no admiten caracteres invisibles de dirección de texto.
- Pin (VENT-37): un clic sobre el globo que aún gira por inercia lo para, como en Mapas, sin soltar un pin; y un
  movimiento de justo 4 px gira el globo sin soltar también un pin.
- El astronauta caía en un punto que ya no estaba bajo la cruz (VENT-10, hallazgos de qa-adversario): el punto solo se
  leía al mover el puntero, así que si la Luna se movía bajo un dedo o un ratón quietos (la hoja del móvil bajando a
  reposo y el globo reencuadrándose, la rueda haciendo zoom mientras se arrastra, un segundo dedo girando el globo o
  la ventana cambiando de tamaño) la etiqueta, el visor, la caída, la dirección, la ficha y la consulta a Horizons
  usaban un punto viejo, a entre 1° y 17° de la cruz en el móvil. Ahora el punto se vuelve a leer en cada fotograma
  del globo mientras se lleva el astronauta y otra vez al soltarlo, donde esté el puntero; el zoom con la rueda o los
  dos dedos sigue permitido durante el arrastre, para afinar dónde soltarlo.
- Cambiar de idioma ya no pierde el sitio ni el punto del astronauta: la página del nuevo idioma se abre con el mismo
  `?site=`, `?lat&lon` y `?glass=` de la dirección, además de la misma vista (VENT-10, hallazgo de qa-adversario).
- La estrella oscura del polo sur del globo, justo bajo IM-2 (VENT-10): la esfera se junta en el polo en un abanico de
  triángulos finos y la textura se pintaba en gajos. Ahora cada píxel lee el mapa por su propio punto de la esfera, sin
  costura en el meridiano de 180° y sin halo borroso en los polos.
- A 1440×900 la leyenda «Layers» tapaba parte de la Luna en el globo y del disco del mapa polar (VENT-10): ahora es
  una columna estrecha que queda al lado de la Luna, y el disco polar se coloca junto a las leyendas, apartándose antes
  de encogerse, así que toda la Luna a la vista admite al astronauta.
- La ficha del PC de un sitio sin imagen (al norte de 80° S, y el punto propio) no mostraba la etiqueta de estado
  (VENT-10): ahora encabeza la ficha cuando no hay imagen.
- La tarjeta del sitio sobre el globo ya no parpadea al arrastrar el globo con el zoom cerca (VENT-31, visto en Brave
  para Android con IM-1): cuando dos lados quedaban casi igual de bien, la tarjeta saltaba de uno a otro en cada
  fotograma y parecía estar en dos sitios. Ahora se queda en su lado mientras ese lado no tape nada y solo cambia si
  otro le ahorra al menos 24 px de desplazamiento; y cuando la oculta o la vuelve a mostrar la regla de no tapar la
  barra de pestañas, la leyenda u otra pieza, el cambio espera a que dure 100 ms. Al elegir otro sitio empieza de cero.
