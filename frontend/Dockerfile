FROM node:24-alpine AS build

WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json tsconfig.json ./
COPY frontend ./frontend
COPY backend/package.json ./backend/package.json
COPY infra/package.json ./infra/package.json
COPY packages ./packages
RUN npm ci
RUN npm run build:contracts && npm run build -w @app/frontend

FROM node:24-alpine

WORKDIR /app
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/package.json
COPY backend/package.json ./backend/package.json
COPY infra/package.json ./infra/package.json
COPY packages/zod/package.json ./packages/zod/package.json
COPY packages/cucumber/package.json ./packages/cucumber/package.json
RUN npm ci --omit=dev
COPY --from=build /app/frontend/dist ./frontend/dist
WORKDIR /app/frontend
EXPOSE 4173
CMD ["node", "../node_modules/vite/bin/vite.js", "preview", "--host", "0.0.0.0", "--port", "4173", "--strictPort"]
