#!/usr/bin/env bash
# Pousse quotidiennement les corrections commitées localement par le site
# (git-commit.ts) vers origin/main. Pas d'auto-push après chaque correction :
# cette tâche planifiée est le seul moment où le serveur pousse (voir TODO.md,
# section Déploiement).
#
# Idempotent, non destructif : si rien n'est à pousser, ne fait rien (git
# push le dit lui-même, "Everything up-to-date"). Aucune commande qui annule
# ou réécrit l'historique.

set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -d .git ]; then
  echo "Erreur : $(pwd) n'est pas un dépôt git." >&2
  exit 1
fi

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo "Erreur : branche courante '$CURRENT_BRANCH', attendu 'main'. Rien poussé." >&2
  exit 1
fi

echo "$(date -Iseconds) : push quotidien vers origin/main"

PUSH_OUTPUT="$(git push origin main 2>&1)" && PUSH_STATUS=0 || PUSH_STATUS=$?
echo "$PUSH_OUTPUT"

if [ "$PUSH_STATUS" -ne 0 ]; then
  if echo "$PUSH_OUTPUT" | grep -qi "rejected\|non-fast-forward\|fetch first"; then
    echo "Erreur : push rejeté, origin/main a avancé (probablement le Mac)." >&2
    echo "Pas de rebase automatique : à résoudre à la main avant le prochain déploiement." >&2
  else
    echo "Erreur : push échoué (réseau, clé SSH, ou dépôt distant injoignable)." >&2
  fi
  exit 1
fi

echo "$(date -Iseconds) : push terminé."
