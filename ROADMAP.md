# Roadmap · Ventana Lunar

Lienzo vivo, al día con el Dashboard: https://claude.ai/artifact/Sm8QoCwg7DqLbuCSHLPfBg

NASA Space Apps Challenge 2026, Madrid, sábado 14 y domingo 15 de noviembre. Épica `VENT-1`. La especificación
completa está en el documento «Ventana Lunar · Especificación y roadmap».

## Preparación

- [x] Repo con Astro + React + TypeScript, página «hola mundo» con el diseño `apple-design` (VENT-2)
- [x] CI: lint, tipos, tests unitarios, build, smoke e2e, gate de idioma y escalera de seguridad (VENT-2)
- [x] Despliegue en Dokploy preparado: Dockerfile con nginx (VENT-2)
- [x] App en Dokploy con dominio y el «hola mundo» publicado en https://nasa.cervilla.es
- [ ] CI en el pool de runners: PAT del pool con el repo y redespliegue del compose `github-runner`
- [ ] Registrar al equipo en spaceappschallenge.org (Madrid, reto Lunar Landing Site Navigator)
- [x] Leer el enunciado oficial (29 oct): el reto es «Lunar Landing Site Navigator»
- [ ] Pestaña Resources: vacía a 29 oct; NASA dice que añadirá recursos antes del hackathon
- [ ] Petición de prueba a JPL Horizons (cualquier objeto) para entender el formato
- [ ] Borrador del pitch y guion del vídeo (70 palabras)
- [ ] Textura LRO WAC 2K y cara del polo sur en el repo de recursos

## MVP

- [x] Datos: API con JPL Horizons y caché acotada (cualquier punto, fechas de 2026 y 2027), validada con los periodos lunares
  y el signo de la longitud; 29 sitios (polo sur, Apolo y otros países), los 12 sin coordenada citable marcados como
  aproximados (VENT-3)
- [ ] Store de tiempo, selector de sitio y cinta de calendario (VENT-4)
- [ ] Ficha del sitio con el tiempo hasta la puesta de Sol y de Tierra, y mapa polar 2D (VENT-5)

## Lujo y entrega (código congelado el domingo 15 a las 15:30)

- [ ] Horizonte real con el relieve LOLA (VENT-11)
- [ ] Globo lunar 3D con la luz siguiendo al slider (VENT-6)
- [ ] Modo DSN con Goldstone, Canberra y Robledo (VENT-7)
- [ ] Coordenadas a medida: cualquier lat/lon (VENT-10)
- [ ] Comparador de sitios o exportar a .ics (VENT-8)
- [ ] Página del proyecto, vídeo de 30 s y pitch; envío antes de las 20:00 (VENT-9)
