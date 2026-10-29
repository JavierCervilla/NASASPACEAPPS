# Roadmap · Ventana Lunar

NASA Space Apps Challenge 2026, Madrid, sábado 14 y domingo 15 de noviembre. Épica `VENT-1`. La especificación
completa está en el documento «Ventana Lunar · Especificación y roadmap».

## Preparación (antes del 14 de noviembre)

Solo se prepara: las normas prohíben escribir el código de la solución antes del hackathon.

- [x] Repo con Astro + React + TypeScript, página «hola mundo» con el diseño `apple-design` (VENT-2)
- [x] CI: lint, tipos, tests unitarios, build, smoke e2e, gate de idioma y escalera de seguridad (VENT-2)
- [x] Despliegue en Dokploy preparado: Dockerfile con nginx (VENT-2)
- [ ] App en Dokploy con dominio y el «hola mundo» publicado
- [ ] CI en el pool de runners: PAT del pool con el repo y redespliegue del compose `github-runner`
- [ ] Registrar al equipo en spaceappschallenge.org (Madrid, reto CLPS Lunar Mission Browser)
- [ ] Leer el enunciado y la pestaña Resources; anotar los sitios y datasets que sugiere NASA
- [ ] Petición de prueba a JPL Horizons (cualquier objeto) para entender el formato
- [ ] Tutorial de Three.js en un proyecto de juguete que no se reutiliza
- [ ] Borrador del pitch y guion del vídeo (70 palabras)
- [ ] Textura LRO WAC 2K y cara del polo sur en el repo de recursos

## Sábado 14: MVP (gate a las 23:00)

- [ ] Datos: Horizons → `public/data/sites/*.json` con 15 sitios y 2 meses, validado (VENT-3)
- [ ] Store de tiempo, selector de sitio y cinta de calendario (VENT-4)
- [ ] Ficha del sitio y mapa polar 2D (VENT-5)

## Domingo 15: lujo y entrega (código congelado a las 15:30)

- [ ] Globo lunar 3D con la luz siguiendo al slider (VENT-6)
- [ ] Modo DSN con Goldstone, Canberra y Robledo (VENT-7)
- [ ] Uno de: comparador, exportar a .ics u horizonte LOLA (VENT-8)
- [ ] Página del proyecto, vídeo de 30 s y pitch; envío antes de las 20:00 (VENT-9)
