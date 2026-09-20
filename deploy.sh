#!/usr/bin/env bash
# Déploiement du site sur le devserver (LXC 101).
#
# Idempotent, non destructif : ce script déploie, il ne nettoie pas.
# Volontairement absents : `docker compose down -v`, `rm -rf`, `git reset`,
# `git clean`, `git checkout --`. En cas d'échec, il s'arrête et remonte
# l'erreur ; il ne tente jamais de "réparer" en annulant quoi que ce soit.
#
# Usage :
#   ./deploy.sh              déploie la dernière version de main
#   ./deploy.sh --tiles      déploie, puis régénère les tuiles DZI
#
# Prérequis : exécuté depuis la racine du clone sur le devserver
# (/mnt/data/dev/projects/journal_de_guerre), avec .env présent à la racine
# (jamais versionné — voir .env.example), et une clé SSH GitHub dédiée
# (deploy key, accès en écriture) déjà en place pour l'utilisateur qui lance
# ce script — root sur le devserver, voir la séquence de déploiement.
# `ssh -T git@github.com` doit répondre par le message d'accueil GitHub, pas
# par une question : sans ça, le premier `git push` échoue sur "Host key
# verification failed", silencieusement dans un contexte non interactif
# (systemd notamment, voir scripts/push-daily.sh).

set -euo pipefail

REGEN_TILES=false
for arg in "$@"; do
  case "$arg" in
    --tiles) REGEN_TILES=true ;;
    *)
      echo "Argument inconnu : $arg" >&2
      echo "Usage : $0 [--tiles]" >&2
      exit 1
      ;;
  esac
done

cd "$(dirname "$0")"

if [ ! -d .git ]; then
  echo "Erreur : $(pwd) n'est pas un dépôt git. Ce script doit tourner depuis le clone du devserver." >&2
  exit 1
fi

echo "==> Vérification de l'arbre de travail"
if [ -n "$(git status --porcelain)" ]; then
  echo "Erreur : l'arbre de travail n'est pas propre. Le déploiement s'arrête sans y toucher :" >&2
  git status --short >&2
  echo "Ce script ne fait ni stash ni reset. Nettoyez ou committez, puis relancez." >&2
  exit 1
fi

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo "Erreur : branche courante '$CURRENT_BRANCH', attendu 'main'." >&2
  exit 1
fi

# Le serveur commite localement (boucle de correction, git-commit.ts) et ne
# pousse qu'une fois par jour (tâche planifiée séparée, voir push-daily.sh) :
# des corrections peuvent donc attendre ici au moment d'un déploiement. Un
# --ff-only direct diverge dès que le Mac a poussé pendant ce temps. On pousse
# d'abord ce qui est local, puis on tire.
#
# Le push peut échouer pour deux raisons distinctes, à ne pas confondre :
# - problème de transport (réseau, clé) : `git push` ne contacte même pas
#   le serveur distant, le message d'erreur de git le dit explicitement ;
# - rejet "non-fast-forward" : origin/main a avancé depuis le dernier push
#   du serveur (le Mac a poussé entre-temps). Un push simple ne résout jamais
#   ça tout seul, et ce script ne tente aucun rebase/merge automatique
#   (rien qui réécrive l'historique local, voir §10 de spec-site.md) :
#   on s'arrête et on laisse quelqu'un regarder.
echo "==> git push origin main (corrections en attente, s'il y en a)"
PUSH_OUTPUT="$(git push origin main 2>&1)" && PUSH_STATUS=0 || PUSH_STATUS=$?
echo "$PUSH_OUTPUT"
if [ "$PUSH_STATUS" -ne 0 ]; then
  if echo "$PUSH_OUTPUT" | grep -qi "rejected\|non-fast-forward\|fetch first"; then
    echo "Erreur : push rejeté, origin/main a avancé depuis le dernier push du serveur" >&2
    echo "(probablement le Mac). Pas de rebase automatique ici : examinez les deux historiques" >&2
    echo "(git log --oneline main origin/main) et résolvez à la main avant de relancer." >&2
  else
    echo "Erreur : le push a échoué avant même de contacter le dépôt distant correctement" >&2
    echo "(réseau, clé SSH, ou dépôt distant injoignable — voir le message git ci-dessus)." >&2
  fi
  echo "Le pull n'a pas été tenté. Rien n'a été touché côté déploiement." >&2
  exit 1
fi

echo "==> git pull --ff-only origin main"
if ! git pull --ff-only origin main; then
  echo "Erreur : le pull --ff-only a échoué après un push réussi." >&2
  echo "Ne devrait arriver que si origin/main a avancé entre les deux commandes" >&2
  echo "(une autre correction poussée entre-temps) : relancez le script." >&2
  exit 1
fi

echo "==> docker compose up -d --build"
docker compose up -d --build

echo "==> docker compose ps"
docker compose ps

if [ "$REGEN_TILES" = true ]; then
  echo "==> Régénération des tuiles DZI (image de build, sharp inclus — pas de Node requis sur l'hôte)"
  if [ -f .env ]; then
    # shellcheck disable=SC1091
    set -a
    source .env
    set +a
  fi
  : "${MEDIA_DIR:?MEDIA_DIR manquant dans .env (ex. /mnt/data/dev/data/journal_de_guerre)}"
  docker build --target build -t journal-de-guerre-tiles-gen ./site

  TILES_RUN_STATUS=0
  docker run --rm \
    -v "${MEDIA_DIR}/jpg_pages:/data/jpg_pages:ro" \
    -v "${MEDIA_DIR}/tiles:/data/tiles" \
    -e IMAGES_DIR=/data/jpg_pages \
    -e TILES_DIR=/data/tiles \
    journal-de-guerre-tiles-gen \
    npm run tiles || TILES_RUN_STATUS=$?

  # L'image de build (~1 Go, sharp + toute la chaîne de compilation) ne sert
  # qu'à cette régénération ponctuelle : elle serait sinon oubliée et
  # s'accumulerait à chaque `--tiles` (docker run --rm ne supprime que le
  # conteneur, jamais l'image). Supprimée que la génération ait réussi ou
  # échoué, avant de faire remonter un éventuel échec de `npm run tiles`.
  echo "==> Suppression de l'image temporaire journal-de-guerre-tiles-gen"
  docker rmi journal-de-guerre-tiles-gen > /dev/null

  if [ "$TILES_RUN_STATUS" -ne 0 ]; then
    echo "Erreur : la génération des tuiles a échoué (voir la sortie ci-dessus)." >&2
    exit "$TILES_RUN_STATUS"
  fi

  # docker compose crée lui-même des points de montage vides jpg_pages/ et
  # tiles/ dans le clone (effet de bord du montage imbriqué : /data est monté
  # depuis le clone, puis /data/jpg_pages et /data/tiles sont remontés
  # par-dessus — Docker matérialise ces sous-chemins côté hôte). Inoffensif
  # tant qu'ils restent vides et gitignorés (voir .gitignore) : ce qui compte
  # est qu'IMAGES_DIR/TILES_DIR aient empêché tiles.js d'y écrire quoi que ce
  # soit de réel.
  echo "==> Vérification : jpg_pages/ et tiles/ (points de montage) restent vides dans le clone"
  for mountpoint in jpg_pages tiles; do
    if [ -d "$mountpoint" ] && [ -n "$(ls -A "$mountpoint" 2>/dev/null)" ]; then
      echo "Erreur : $mountpoint/ contient des fichiers dans le clone ($(pwd))." >&2
      echo "IMAGES_DIR/TILES_DIR auraient dû empêcher ça — à examiner avant de continuer." >&2
      exit 1
    fi
  done
fi

# Même fichier que celui que docker compose charge automatiquement pour
# résoudre ${HOST_PORT} dans docker-compose.yml (voir ce fichier) : une seule
# source de vérité pour le port, jamais dupliquée entre deploy.sh et compose.
if [ -f .env ]; then
  # shellcheck disable=SC1091
  set -a
  source .env
  set +a
fi

if [ -z "${HOST_PORT:-}" ]; then
  echo "Erreur : HOST_PORT n'est pas défini dans .env à la racine du dépôt." >&2
  echo "docker compose aurait de toute façon refusé de démarrer sans lui (voir docker-compose.yml)." >&2
  exit 1
fi
PORT="$HOST_PORT"

echo "==> Attente du démarrage (jusqu'à 30s)"
HEALTH_URL="http://localhost:${PORT}/api/health"
for _ in $(seq 1 15); do
  if curl -sf "$HEALTH_URL" > /tmp/deploy_health_check.json 2>/dev/null; then
    echo "==> $HEALTH_URL : OK"
    cat /tmp/deploy_health_check.json
    rm -f /tmp/deploy_health_check.json
    exit 0
  fi
  sleep 2
done

echo "Erreur : $HEALTH_URL ne répond pas correctement après 30s." >&2
echo "Dernière tentative :" >&2
curl -sv "$HEALTH_URL" >&2 2>&1 || true
exit 1
