FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS dev
ENV NODE_ENV=development
COPY . .
RUN pnpm prisma generate
CMD ["sh", "-c", "pnpm nx serve ${APP:-api} --configuration=development"]

FROM deps AS build
COPY . .
ARG APP=api
RUN pnpm prisma generate
RUN pnpm nx build ${APP}

FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/dist/apps /app/dist/apps
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/package.json /app/package.json
ARG APP=api
ENV APP=${APP}
CMD ["sh", "-c", "node dist/apps/${APP}/main.js"]

FROM nginx:1.27-alpine AS ui-runtime
COPY apps/fs-ui/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/apps/fs-ui/browser /usr/share/nginx/html
