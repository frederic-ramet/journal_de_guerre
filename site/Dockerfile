FROM node:22-slim

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

# Les devDependencies (playwright, sharp, typescript...) ne servent qu'à la
# génération des tuiles et aux captures, pas à l'exécution du site : on les
# retire après le build pour alléger l'image finale.
RUN npm prune --omit=dev

ENV HOST=0.0.0.0
ENV PORT=4321
ENV PAGES_DIR=/data/transcription/pages
ENV IMAGES_DIR=/data/jpg_pages
ENV TILES_DIR=/data/tiles

EXPOSE 4321

CMD ["node", "./dist/server/entry.mjs"]
