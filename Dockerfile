FROM node:24-alpine AS build

ARG VITE_API_URL
ARG VITE_WS_URL
ARG VITE_MEDIA_URL
ARG VITE_PROXY_URL
ARG VITE_CFG_MAX_FILE_SIZE

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL
ENV VITE_MEDIA_URL=$VITE_MEDIA_URL
ENV VITE_PROXY_URL=$VITE_PROXY_URL
ENV VITE_CFG_MAX_FILE_SIZE=$VITE_CFG_MAX_FILE_SIZE

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack use pnpm

WORKDIR /app
COPY . .
RUN pnpm install
RUN pnpm build:deps
RUN pnpm build:web

FROM caddy:2-alpine AS production
COPY --from=build /app/packages/client/dist /srv
COPY ./Caddyfile /etc/caddy/Caddyfile