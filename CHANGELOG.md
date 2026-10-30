# Changelog · Ventana Lunar

## [Sin publicar]

### Añadido
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
- El código cumple la Norma de 42 adaptada a TypeScript (funciones de 25 líneas, 80 columnas, 5 funciones por fichero),
  comprobada en el lint.
