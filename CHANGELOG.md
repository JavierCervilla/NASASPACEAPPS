# Changelog · Ventana Lunar

## [Sin publicar]

### Añadido
- API de datos (`/api/sites`, `/api/sites/:id` y `/api/ephemeris` para cualquier punto de la Luna): Sol, Tierra, ventanas de alunizaje y antena de la DSN hora a hora, calculados con JPL Horizons y guardados en caché. 29 sitios con sus fuentes; 12 de ellos marcados como zona aproximada.
- Proyecto en Astro + React con una página provisional en modo oscuro: el nombre, la pregunta «When can you land at the
  lunar south pole?», los días que faltan para el hackathon y la leyenda de los tres colores (Sol, Tierra, ventana).
- Integración continua con lint, tipos, tests, build, prueba en navegador, gate de idioma y escalera de seguridad.
- Despliegue en Dokploy: imagen Docker con nginx que sirve la web estática.
- Guía de diseño `apple-design` incluida en el repo para que toda la interfaz la siga.
