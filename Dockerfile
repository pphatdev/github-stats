FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM deps AS build
WORKDIR /app
COPY . .
RUN npm ci && npm run build && npm prune --omit=dev

FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production
ENV WORKERS=0
WORKDIR /app

# Copy as root so we can chown to the non-root `node` user shipped with the
# official Node image (uid 1000). Subsequent process runs as `node` so a
# code-execution bug can't touch /usr, /etc, or write outside /app (L4).
COPY --from=build --chown=node:node /app/package*.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/public ./public

USER node

EXPOSE 3000
CMD ["node", "dist/server-cluster.js"]
