# API server. Build from the repo root so the workspace manifests are in the context:
#   docker build -f packages/server/Dockerfile .
FROM node:22.23.4-alpine AS build
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

FROM node:22.23.4-alpine
# Mount a persistent volume at HORIZONS_CACHE_DIR: every cached Horizons answer saves a slow call on the next deploy.
ENV NODE_ENV=production PORT=3000 HORIZONS_CACHE_DIR=/var/cache/horizons
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
RUN mkdir -p /var/cache/horizons && chown node:node /var/cache/horizons
USER node
EXPOSE 3000
# The `ventana-compiled` condition makes `@ventana/sim` resolve to packages/sim/dist instead of its TypeScript source.
CMD ["node", "--conditions=ventana-compiled", "packages/server/dist/main.js"]
