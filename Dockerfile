# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=22.21.1
ARG DEBIAN_VERSION=trixie-slim

# ----------------------------
# Build stage
# ----------------------------
FROM node:${NODE_VERSION}-${DEBIAN_VERSION} AS build
SHELL ["/bin/bash", "-euo", "pipefail", "-c"]

WORKDIR /app

# Tooling for native modules (kept out of runtime image)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    git \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Yarn via Corepack
RUN corepack enable

# IMPORTANT for multi-arch:
# Prevent puppeteer (and puppeteer-core consumers) from downloading Chromium during install
ENV PUPPETEER_SKIP_DOWNLOAD=1 \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1

# Install deps (cache-friendly)
COPY package.json yarn.lock .yarnrc.yml ./
RUN yarn install --immutable

# Build
COPY . .
RUN yarn build

# ----------------------------
# Runtime stage
# ----------------------------
FROM node:${NODE_VERSION}-${DEBIAN_VERSION} AS final
SHELL ["/bin/bash", "-euo", "pipefail", "-c"]

ENV NODE_ENV=production \
    CHROME_PATH=/usr/bin/chromium \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    PUPPETEER_SKIP_DOWNLOAD=1 \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1

WORKDIR /app

# Runtime deps:
# - chromium: required since we skip Puppeteer's download
# - dumb-init: clean PID 1
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    dumb-init \
    ca-certificates \
    chromium \
    fonts-liberation \
    fontconfig \
    && rm -rf /var/lib/apt/lists/*

# Unprivileged user
RUN useradd --create-home --uid 10001 --shell /usr/sbin/nologin webcheck

# Copy app from build stage (avoid guessing Astro output paths)
COPY --from=build /app /app

USER webcheck

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["yarn", "start"]