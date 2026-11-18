# syntax=docker/dockerfile:1

# Node 24 (active LTS) on Alpine. Both stages must use the same image so
# native modules built in `deps` match the runtime ABI and libc (musl).
ARG NODE_IMAGE=node:24-alpine

# ---- deps: install all dependencies (incl. dev) --------------------------
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
# Toolchain is only a fallback for native modules (better-sqlite3, sharp,
# @resvg) when no prebuilt binary matches the target platform. It never
# reaches the runtime image.
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci

# ---- build: compile TypeScript, then drop devDependencies ---------------
FROM deps AS build
WORKDIR /app
COPY . .
RUN npm run build && npm prune --omit=dev

# ---- runtime -------------------------------------------------------------
FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production \
    APP_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    WORKERS=0 \
    DATABASE_PROVIDER=sqlite \
    DATABASE_URL=/app/data/stats.db
WORKDIR /app

# Pull in Alpine security fixes newer than the base image, then drop the
# package managers: npm, npx, yarn and corepack (the app runs with plain
# `node`) and apk itself. Node bundles its own OpenSSL, so the system
# libssl/libcrypto go too once apk no longer needs them.
RUN apk upgrade --no-cache \
    && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
              /opt/yarn-* /usr/local/bin/npm /usr/local/bin/npx \
              /usr/local/bin/yarn /usr/local/bin/yarnpkg /usr/local/bin/corepack \
    && apk del --no-cache apk-tools libssl3 libcrypto3 2>/dev/null || true

# Copy as root so we can chown to the non-root `node` user shipped with the
# official Node image (uid 1000). Subsequent process runs as `node` so a
# code-execution bug can't touch /usr, /etc, or write outside /app (L4).
COPY --from=build --chown=node:node /app/package*.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/public ./public

# Writable dirs must exist in the image and be owned by `node`. A named
# volume mounted on a path that doesn't exist in the image is created
# root-owned, and SQLite then fails with "unable to open database file".
RUN mkdir -p /app/data /app/public/user \
    && chown -R node:node /app/data /app/public/user

USER node

VOLUME ["/app/data"]
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=5 \
    CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/server-cluster.js"]
