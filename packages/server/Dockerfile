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
RUN npm run build -w @ventana/server

FROM node:22.23.4-alpine
ENV NODE_ENV=production PORT=3000
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/sim/package.json packages/sim/
COPY packages/web/package.json packages/web/
COPY packages/server/package.json packages/server/
# Only the server's runtime dependencies: no dev tooling and nothing from the web.
RUN npm ci --omit=dev -w @ventana/server && npm cache clean --force
COPY --from=build /app/packages/server/dist packages/server/dist
USER node
EXPOSE 3000
CMD ["node", "packages/server/dist/main.js"]
