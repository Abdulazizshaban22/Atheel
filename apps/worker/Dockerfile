FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-workspace.yaml turbo.json pnpm-lock.yaml ./
COPY apps/worker/package.json apps/worker/package.json

RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter @madar/worker build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable

RUN addgroup -S app && adduser -S app -G app
COPY --from=base --chown=app:app /app .

USER app
CMD ["pnpm","--filter","@madar/worker","start"]
