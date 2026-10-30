# Static build served by nginx. Dokploy builds this image from the repo and routes the domain to port 8080.
# Changing the port (it was 80 before VENT-12) needs the same change in the Dokploy domain of the web app.
# Base images are pinned by digest: a tag can be moved, a digest cannot. Bump both together.
FROM node:22.23.4-alpine@sha256:fe4f6d74e20370acb04ad889077d14d0f64a9c8ea6a42bc60cddf1e844699914 AS build
WORKDIR /app
# npm ci needs every workspace manifest named in the root package.json.
COPY package.json package-lock.json ./
COPY packages/sim/package.json packages/sim/
COPY packages/web/package.json packages/web/
COPY packages/server/package.json packages/server/
RUN npm ci
COPY . .
RUN npm run build -w @ventana/web \
  && node packages/web/scripts/csp-header.mjs packages/web/dist > /app/csp.conf

# Same nginx release as before, built to run as an unprivileged user (uid 101) on port 8080.
FROM nginxinc/nginx-unprivileged:1.30.6-alpine@sha256:f5116ed4606f3eb015dd4a8e28cb9b351476dc0ad4bc6e9f93b19cec130cdf03
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY nginx-security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/csp.conf /etc/nginx/snippets/csp.conf
COPY --from=build /app/packages/web/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1
