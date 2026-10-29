# Static build served by nginx. Dokploy builds this image from the repo and routes the domain to port 80.
FROM node:22.23.4-alpine AS build
WORKDIR /app
# npm ci needs every workspace manifest named in the root package.json.
COPY package.json package-lock.json ./
COPY packages/sim/package.json packages/sim/
COPY packages/web/package.json packages/web/
COPY packages/server/package.json packages/server/
RUN npm ci
COPY . .
RUN npm run build -w @ventana/web

FROM nginx:1.30.6-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/packages/web/dist /usr/share/nginx/html
EXPOSE 80
