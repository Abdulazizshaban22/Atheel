FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable

# Needed for PDF generation (headless Chromium)
RUN apk add --no-cache chromium

# deps
COPY package.json pnpm-workspace.yaml turbo.json pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/ai-kernel/package.json packages/ai-kernel/package.json
COPY packages/workflow-kernel/package.json packages/workflow-kernel/package.json
COPY packages/runtime-kernel/package.json packages/runtime-kernel/package.json
COPY packages/culture-sa-kernel/package.json packages/culture-sa-kernel/package.json
COPY packages/creative-loop-kernel/package.json packages/creative-loop-kernel/package.json
COPY packages/twin-kernel/package.json packages/twin-kernel/package.json
COPY packages/packet-kernel/package.json packages/packet-kernel/package.json
COPY packages/doc-kernel/package.json packages/doc-kernel/package.json

RUN pnpm install --frozen-lockfile

# source
COPY . .

RUN pnpm --filter @madar/api build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable
RUN apk add --no-cache chromium

# Create non-root user
RUN addgroup -S app && adduser -S app -G app

COPY --from=base --chown=app:app /app .

RUN chmod +x apps/api/docker-entrypoint.sh || true

USER app
EXPOSE 4000
ENTRYPOINT ["./apps/api/docker-entrypoint.sh"]
