# syntax=docker/dockerfile:1.20@sha256:26147acbda4f14c5add9946e2fd2ed543fc402884fd75146bd342a7f6271dc1d

ARG NODE_VERSION=24.12.0
ARG DEBIAN_VERSION=trixie-slim

# ----------------------------
# Build stage
# ----------------------------
FROM node:${NODE_VERSION}-${DEBIAN_VERSION} AS build
SHELL ["/bin/bash", "-euo", "pipefail", "-c"]
WORKDIR /app

# native build tooling (kept out of runtime image)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    python3 make g++ git ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Yarn via Corepack (repo currently ends up using yarn classic)
RUN corepack enable

# IMPORTANT for multi-arch: prevent puppeteer from downloading chromium during install
ENV PUPPETEER_SKIP_DOWNLOAD=1 \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1

# deps first (cache)
COPY package.json yarn.lock .yarnrc.yml ./
COPY scripts ./scripts
RUN yarn install

# build
COPY . .
RUN yarn build

# ----------------------------
# Runtime stage
# ----------------------------
FROM node:${NODE_VERSION}-${DEBIAN_VERSION} AS final
SHELL ["/bin/bash", "-euo", "pipefail", "-c"]
WORKDIR /app

ENV NODE_ENV=production \
    CHROME_PATH=/usr/bin/chromium \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    PUPPETEER_SKIP_DOWNLOAD=1 \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1

# runtime deps (chromium is the big one; unavoidable for single-container design)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    dumb-init ca-certificates \
    traceroute \
    chromium fonts-liberation fontconfig \
    && rm -rf /var/lib/apt/lists/* /usr/share/doc /usr/share/man /usr/share/locale

# Yarn via Corepack
RUN corepack enable

# create unprivileged user
RUN useradd --create-home --uid 10001 --shell /usr/sbin/nologin webcheck

# install ONLY production deps (no dev deps)
COPY package.json yarn.lock .yarnrc.yml ./
RUN YARN_IGNORE_SCRIPTS=1 yarn install --frozen-lockfile --production=true \
    && (yarn cache clean --all || true) \
    && rm -rf node_modules/esbuild node_modules/@esbuild

# copy only runtime artifacts
COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public
COPY --from=build /app/api ./api
COPY --from=build /app/server.js ./server.js

USER webcheck
EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["yarn", "start"]
