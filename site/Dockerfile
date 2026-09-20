# --- Stage 1 : build ---
# Toutes les dépendances (dev incluses : @astrojs/check, typescript, sharp,
# playwright...) servent à construire le site, mais ne doivent jamais
# atteindre l'image finale. playwright en particulier télécharge un
# navigateur Chromium (~300 Mo) lors de son postinstall ; sharp embarque
# libvips. Ni l'un ni l'autre n'a sa place dans l'image qui tourne : sharp
# ne sert qu'à `npm run tiles`, playwright qu'aux captures de démo — les
# deux sont des outils de développement, exécutés à la main, pas au
# démarrage du serveur.
FROM node:22-slim AS build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

# --- Stage 2 : runtime ---
# Repart d'une image vierge : seules les dependencies de production sont
# installées ici, jamais les devDependencies. Aucune trace de la couche de
# build (Chromium, libvips, sources TypeScript) ne peut se retrouver dans
# l'image finale, contrairement à un `npm prune` en fin de stage unique qui
# laisse le cache npm et les fichiers déjà écrits sur disque.
FROM node:22-slim AS runtime

# git est nécessaire au runtime : la boucle de correction (git-commit.ts)
# commite directement dans le dépôt monté en volume.
RUN apt-get update && apt-get install -y --no-install-recommends git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Astro copie déjà public/ dans dist/client/ au build (adaptateur node en
# mode standalone sert les statiques depuis là) : rien d'autre à copier.
COPY --from=build /app/dist ./dist

ENV HOST=0.0.0.0
ENV PORT=4321
ENV PAGES_DIR=/data/transcription/pages
ENV IMAGES_DIR=/data/jpg_pages
ENV TILES_DIR=/data/tiles
ENV CONTEXTE_MD_PATH=/data/contexte.md

EXPOSE 4321

CMD ["node", "./dist/server/entry.mjs"]
