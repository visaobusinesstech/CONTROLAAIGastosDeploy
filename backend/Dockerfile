FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --include=dev

COPY tsconfig.json drizzle.config.ts ./
COPY src ./src
COPY api ./api
COPY whatsapp ./whatsapp
COPY drizzle ./drizzle

RUN npm run build && npm prune --omit=dev

ENV NODE_ENV=production
ENV BAILEYS_SESSION_DIR=/data/.baileys-session

EXPOSE 3333

CMD ["node", "dist/src/index.js"]
