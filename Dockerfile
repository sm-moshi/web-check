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

# Yarn via Corepack (lockfile uses Yarn Berry)
RUN corepack enable \
    && corepack prepare yarn@4.5.3 --activate

ENV YARN_ENABLE_PROGRESS_BARS=0

# IMPORTANT for multi-arch: prevent puppeteer from downloading chromium during install
ENV PUPPETEER_SKIP_DOWNLOAD=1 \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1

# deps first (cache)
COPY package.json yarn.lock .yarnrc.yml ./
COPY scripts ./scripts
RUN yarn install --immutable --inline-builds --silent

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

# create unprivileged user
RUN useradd --create-home --uid 10001 --shell /usr/sbin/nologin webcheck

# copy only runtime artifacts (node_modules built for target arch in build stage)
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public
COPY --from=build /app/api ./api
COPY --from=build /app/server.js ./server.js

USER webcheck
EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
