# Changelog · Ventana Lunar

## [Sin publicar]

### Añadido
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
