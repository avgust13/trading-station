# syntax=docker/dockerfile:1

# --- Build stage: install deps and produce the standalone Next.js build ---
FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- Runtime stage: minimal self-contained Next.js server ---
FROM node:22-slim AS runtime
ENV NODE_ENV=production
ENV PORT=8888
ENV HOSTNAME=0.0.0.0
WORKDIR /app
# `output: "standalone"` emits a trimmed server + its own node_modules.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
EXPOSE 8888
CMD ["node", "server.js"]
