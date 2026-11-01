# API server. Build from the repo root so the workspace manifests are in the context:
#   docker build -f packages/server/Dockerfile .
# The base image is pinned by digest: a tag can be moved, a digest cannot. Bump both together.
FROM node:22.23.4-alpine@sha256:fe4f6d74e20370acb04ad889077d14d0f64a9c8ea6a42bc60cddf1e844699914 AS build
WORKDIR /app
# npm ci needs every workspace manifest named in the root package.json.
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/sim/package.json packages/sim/
COPY packages/web/package.json packages/web/
COPY packages/server/package.json packages/server/
RUN npm ci
COPY packages/sim packages/sim
COPY packages/server packages/server
# `tsc -b` builds @ventana/sim first (a project reference of the server), so both dist folders exist after this.
RUN npm run build -w @ventana/server

FROM node:22.23.4-alpine@sha256:fe4f6d74e20370acb04ad889077d14d0f64a9c8ea6a42bc60cddf1e844699914
# Mount a persistent volume at HORIZONS_CACHE_DIR: every cached Horizons answer saves a slow call on the next deploy.
ENV NODE_ENV=production PORT=3000 HORIZONS_CACHE_DIR=/var/cache/horizons
# Hard cap on the custom-point tables in /var/cache/horizons/points; the pinned tables (about 10 MB) do not count.
ENV HORIZONS_POINTS_CACHE_MB=512
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/sim/package.json packages/sim/
COPY packages/web/package.json packages/web/
COPY packages/server/package.json packages/server/
# Only the server's runtime dependencies: no dev tooling and nothing from the web.
RUN npm ci --omit=dev -w @ventana/server && npm cache clean --force
# npm ci links node_modules/@ventana/sim to packages/sim; its compiled code is what runs (see the CMD below).
COPY --from=build /app/packages/sim/dist packages/sim/dist
COPY --from=build /app/packages/server/dist packages/server/dist
COPY packages/server/data packages/server/data
# The terrain horizons' answers (VENT-40); the LOLA grids themselves live on a volume set by TERRAIN_DIR, never here.
ENV TERRAIN_CACHE_DIR=/var/cache/terrain
RUN mkdir -p /var/cache/horizons /var/cache/terrain && chown node:node /var/cache/horizons /var/cache/terrain
USER node
EXPOSE 3000
# node is the one HTTP client this image is sure to keep. Unhealthy on a non-2xx answer, an error or 3 s of silence.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/v1/health',{signal:AbortSignal.timeout(3000)}).then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]
# The `ventana-compiled` condition makes `@ventana/sim` resolve to packages/sim/dist instead of its TypeScript source.
CMD ["node", "--conditions=ventana-compiled", "packages/server/dist/main.js"]
