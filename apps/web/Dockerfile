FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-workspace.yaml turbo.json pnpm-lock.yaml ./
COPY apps/web/package.json apps/web/package.json

RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter @madar/web build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable
RUN addgroup -S app && adduser -S app -G app
COPY --from=base --chown=app:app /app .
USER app
EXPOSE 3000
CMD ["pnpm","--filter","@madar/web","start"]
