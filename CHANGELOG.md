# Changelog · Ventana Lunar

## [Sin publicar]

### Añadido
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
- La web envía cabeceras de seguridad en todas sus rutas, con una política de contenido (CSP) calculada en cada build;
  nginx corre sin privilegios y no dice su versión.
- La API envía cabeceras de seguridad, no deja cachear sus errores y respeta la espera que pide JPL Horizons; una
  respuesta «ocupado» ya no gasta el cupo de la IP.
- La web pide al navegador que la abra siempre por HTTPS (HSTS, un año, también en los subdominios).
- Imágenes Docker fijadas por digest, acciones del CI fijadas por commit y descargas verificadas con su checksum.

### Cambiado
- La página provisional da paso a la pantalla principal del lienzo: cabecera con el título, la pregunta y el selector de
  vista (solo «Globe» por ahora) y el globo. La cuenta atrás y la leyenda provisional salen; la leyenda de colores
  vuelve con la cinta de calendario (VENT-4).
- El código cumple la Norma de 42 adaptada a TypeScript (funciones de 25 líneas, 80 columnas, 5 funciones por fichero),
  comprobada en el lint.
