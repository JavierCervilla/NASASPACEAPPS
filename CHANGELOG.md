# Changelog · Ventana Lunar

## [Sin publicar]

### Añadido
- Acabado Liquid Glass (VENT-27, prototipo VENT-16 aprobado): en los navegadores Chromium con potencia (Chrome, Edge,
  Brave, Android), las superficies flotantes refractan lo que hay debajo como un vidrio grueso y tienen un borde que
  capta la luz, con un tinte fino que deja ver la Luna: cada superficie lleva su propia lente, que curva hacia dentro lo
  que hay debajo cerca del borde, como en el prototipo. En el móvil la barra superior, la hoja, la barra de pestañas, la
  píldora del sitio y la tarjeta del sitio; en el PC la cabecera, el menú de sitios, la leyenda «Layers», la cinta del
  calendario, la ficha y la tarjeta del sitio. Si el dispositivo va justo (nivel de calidad bajo, o 2 s de fotogramas,
  al cargar y de nuevo al primer toque o clic, no aguantan el ritmo de su nivel), si se pide menos transparencia o más
  contraste, o con ahorro de datos, se queda el cristal esmerilado de siempre; si la prueba de fotogramas falla, cambia
  en caliente y no vuelve a intentarlo en la sesión. Safari y Firefox, que no pintan la refracción, siempre van con el
  esmerilado. `?glass=liquid` o `?glass=frosted` fuerzan uno para probar. En el PC con GPU por software (Chromium sin
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
- El objetivo de Chang'e-7 se llama ahora «Shackleton crater area» en vez de «Shackleton rim»: no hay coordenada
  publicada del punto de aterrizaje en el borde, y el punto que se muestra es el centro del cráter (VENT-29).
- La página provisional da paso a la pantalla principal del lienzo: cabecera con el título, la pregunta y el selector de
  vista (solo «Globe» por ahora) y el globo. La cuenta atrás y la leyenda provisional salen; la leyenda de colores
  vuelve con la cinta de calendario (VENT-4).
- El código cumple la Norma de 42 adaptada a TypeScript (funciones de 25 líneas, 80 columnas, 5 funciones por fichero),
  comprobada en el lint.

### Corregido
- La tarjeta del sitio sobre el globo ya no parpadea al arrastrar el globo con el zoom cerca (VENT-31, visto en Brave
  para Android con IM-1): cuando dos lados quedaban casi igual de bien, la tarjeta saltaba de uno a otro en cada
  fotograma y parecía estar en dos sitios. Ahora se queda en su lado mientras ese lado no tape nada y solo cambia si
  otro le ahorra al menos 24 px de desplazamiento; y cuando la oculta o la vuelve a mostrar la regla de no tapar la
  barra de pestañas, la leyenda u otra pieza, el cambio espera a que dure 100 ms. Al elegir otro sitio empieza de cero.
