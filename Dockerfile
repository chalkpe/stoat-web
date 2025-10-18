FROM node:24-alpine AS build
WORKDIR /app
COPY . .
RUN pnpm build:deps
RUN pnpm build:web

FROM caddy:2-alpine AS production
COPY --from=build /app/packages/client/dist /srv
COPY ./Caddyfile /etc/caddy/Caddyfile