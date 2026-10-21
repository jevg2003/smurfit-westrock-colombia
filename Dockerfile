# Production image for a company-controlled environment (Vercel does not use this file).
# Build:  docker build -t monitor-entorno .
# Run:    docker run -p 3000:3000 --env-file .env.production monitor-entorno

FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Produces .next/standalone with its own server.js (see next.config.ts).
ENV NEXT_OUTPUT=standalone
RUN pnpm build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

# Non-root user. Secrets (OPENAI_API_KEY, ...) are passed at runtime, never baked into the image.
USER node
EXPOSE 3000
CMD ["node", "server.js"]
