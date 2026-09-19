#!/usr/bin/env bash
# Transcription des pages du carnet via `claude -p` (headless, abonnement Claude Code).
# Une invocation de `claude` par page. Pas d'appel API Anthropic facturé séparément.
#
# Usage:
#   scripts/transcribe.sh [batch_size]
#
# - Ne traite que les pages sans fichier transcription/pages/<id>.md. Ne
#   réécrit jamais une page déjà transcrite.
# - Traite par lots de `batch_size` pages (défaut 10). Commit git à la fin de
#   chaque lot complet.
# - Injecte transcription/glossaire.md dans le prompt s'il existe. Le prompt
#   et le format de sortie ne changent pas d'un lot à l'autre (méthode figée :
#   page entière, pas de bandes).
# - Écriture atomique : Claude écrit d'abord <id>.md.tmp, le script valide le
#   contenu (front matter complet + 3 sections non vides) puis renomme en
#   <id>.md. Validation échouée -> .tmp supprimé, page loggée comme échec,
#   le lot continue (jamais de fichier à moitié écrit).
# - Une page à plus de QMARK_ALERT_THRESHOLD [?] (comptés dans le seul bloc
#   Diplomatique) : n'arrête pas le script, ajoutée à transcription/a_revoir.md.
# - Un échec de page (appel `claude` en erreur, ou validation refusée) : ne
#   bloque jamais le lot, ajoutée à transcription/a_revoir.md. Le script
#   s'arrête seulement après CONSECUTIVE_FAILURE_LIMIT échecs consécutifs, ou
#   si `claude` signale une limite d'usage atteinte.
# - Met à jour transcription/RAPPORT.md à la fin de chaque lot.

set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PAGES_DIR="${TRANSCRIBE_PAGES_DIR:-jpg_pages}"
OUT_DIR="${TRANSCRIBE_OUT_DIR:-transcription/pages}"
PILOTE="transcription/pilote/f001r.md"
LOG_FILE="${TRANSCRIBE_LOG_FILE:-transcription/journal.log}"
A_REVOIR_FILE="transcription/a_revoir.md"
RAPPORT_FILE="transcription/RAPPORT.md"
VALIDATOR="scripts/validate_page.py"
BATCH_SIZE="${1:-10}"
QMARK_ALERT_THRESHOLD=15
CONSECUTIVE_FAILURE_LIMIT=3

mkdir -p "$OUT_DIR"
touch "$LOG_FILE"
touch "$A_REVOIR_FILE"

if [[ ! -f "$PILOTE" ]]; then
  echo "Fichier pilote introuvable: $PILOTE" >&2
  exit 1
fi

log() {
  local ts
  ts="$(date '+%Y-%m-%d %H:%M:%S')"
  echo "[$ts] $*" | tee -a "$LOG_FILE"
}

note_a_revoir() {
  # note_a_revoir <id> <raison>
  local ts
  ts="$(date '+%Y-%m-%d %H:%M:%S')"
  {
    echo ""
    echo "## ${1} — ${ts}"
    echo ""
    echo "${2}"
  } >> "$A_REVOIR_FILE"
}

GLOSSAIRE="transcription/glossaire.md"

build_prompt() {
  local id="$1" source="$2" tmp_rel="$3"
  local glossaire_section=""
  if [[ -f "$GLOSSAIRE" ]]; then
    glossaire_section="Glossaire de référence (mots récurrents, dates, orthographe, signature) :
---
$(cat "$GLOSSAIRE")
---
"
  fi
  cat <<PROMPT
Lis l'image ${PAGES_DIR}/${source} (carnet de guerre manuscrit, 1918, écriture
cursive française au crayon).

Écris le fichier ${tmp_rel} au format EXACT de ${PILOTE}
(front matter YAML avec id, source, type, date, lieu, signature, statut,
incertitudes ; puis sections "## Diplomatique" en bloc de code, "## Normalisé",
"## Notes").

Règles strictes :
- id: ${id}, source: ${source}, statut: ia
- Transcris littéralement ce qui est visible : orthographe, ponctuation, sauts
  de ligne d'origine.
- LE BUT N'EST PAS DE RÉDUIRE LE NOMBRE DE [?]. Un mot transcrit avec
  assurance et faux est bien plus grave qu'un [?]. Dans le doute, marque [?].
  Ne corrige jamais l'orthographe du scripteur pour produire un mot plus
  plausible : transcris ce qui est écrit, même fautif.
- Ne résume pas, ne reformule pas dans la section Diplomatique.
- Si la page est vierge ou illisible, indique-le honnêtement dans "type" et
  "Notes" plutôt que d'inventer du texte (les 3 sections doivent quand même
  être présentes et non vides, par exemple "(page vierge)").
- Le champ incertitudes doit être exactement égal au nombre de [?] présents
  dans le bloc Diplomatique (compte-les et vérifie avant d'écrire le fichier).
- L'image contient, sur un bord, une fine bande de la page voisine
  (recouvrement de découpe). Ne transcris que la page principale, ignore
  cette bande.
${glossaire_section}- Écris UNIQUEMENT le fichier ${tmp_rel}, aucun autre fichier.
PROMPT
}

count_diplomatique_qmarks() {
  python3 -c "
content = open('$1', encoding='utf-8').read()
start = content.find('## Diplomatique')
code_start = content.find('\`\`\`', start) + 3
code_end = content.find('\`\`\`', code_start)
block = content[code_start:code_end] if start != -1 and code_start != -1 and code_end != -1 else ''
print(block.count('[?]'))
" 2>/dev/null || echo 0
}

# Liste des pages à traiter : une entrée "id source" par ligne, id = nom sans extension.
# Toute page qui a déjà un fichier .md est protégée, quel que soit son statut
# (jamais réécrite) — en particulier les pages corrigées à la main (statut
# verifie_claude ou autre) ne sont jamais retouchées par ce script.
# IMG_0509 est exclue : doublon photo de la même lettre que IMG_0508 (voir
# transcription/pilote/doc-declaration-1940.md), une seule des deux à transcrire.
EXCLUDED_IDS=("IMG_0509")

is_excluded() {
  local id="$1"
  for excluded in "${EXCLUDED_IDS[@]}"; do
    [[ "$id" == "$excluded" ]] && return 0
  done
  return 1
}

pages_to_do=()
while IFS= read -r -d '' img; do
  base="$(basename "$img")"
  id="${base%.*}"
  is_excluded "$id" && continue
  out_file="$OUT_DIR/${id}.md"
  [[ -f "$out_file" ]] && continue
  pages_to_do+=("$id" "$base")
done < <(find "$PAGES_DIR" -maxdepth 1 -type f \( -iname '*.jpg' -o -iname '*.jpeg' \) -print0 | sort -z)

total_pages=$(( ${#pages_to_do[@]} / 2 ))
if (( total_pages == 0 )); then
  log "Aucune page à traiter (toutes ont déjà un fichier, ou jpg_pages/ est vide)."
  exit 0
fi

log "=== Démarrage : $total_pages page(s) à transcrire, lots de $BATCH_SIZE ==="

processed=0
skipped=0
consecutive_failures=0
batch_num=0
batch_first_id=""
batch_qmark_lines=()
i=0
while (( i < ${#pages_to_do[@]} )); do
  id="${pages_to_do[i]}"
  source="${pages_to_do[i+1]}"
  i=$(( i + 2 ))

  if [[ -z "$batch_first_id" ]]; then
    batch_first_id="$id"
  fi

  out_file="$OUT_DIR/${id}.md"
  tmp_file="$OUT_DIR/${id}.md.tmp"
  rm -f "$tmp_file"

  start_ts=$(date +%s)
  result_json="$(mktemp)"

  build_prompt "$id" "$source" "$tmp_file" | claude -p \
    --output-format json \
    --permission-mode acceptEdits \
    --allowedTools "Read,Write" \
    > "$result_json" 2>&1
  exit_code=$?

  end_ts=$(date +%s)
  duration=$(( end_ts - start_ts ))

  page_failed=0
  failure_reason=""

  if (( exit_code != 0 )); then
    failure_reason="échec appel claude (exit $exit_code)"
    page_failed=1
  else
    is_error="$(python3 -c "import json; d=json.load(open('$result_json')); print(d.get('is_error'))" 2>/dev/null)"
    subtype="$(python3 -c "import json; d=json.load(open('$result_json')); print(d.get('subtype',''))" 2>/dev/null)"
    cost="$(python3 -c "import json; d=json.load(open('$result_json')); print(d.get('total_cost_usd',''))" 2>/dev/null)"

    if [[ "$is_error" != "False" ]]; then
      failure_reason="is_error=$is_error subtype=$subtype"
      page_failed=1
      if [[ "$subtype" =~ usage_limit || "$subtype" =~ rate_limit || "$subtype" == "error_max_turns" ]]; then
        log "Limite d'usage probable atteinte (subtype=$subtype) sur $id — arrêt du script."
        rm -f "$tmp_file" "$result_json"
        note_a_revoir "$id" "Arrêt du script : limite d'usage probable atteinte (subtype=$subtype)."
        exit 3
      fi
    elif [[ ! -f "$tmp_file" ]]; then
      failure_reason="fichier temporaire non créé par claude"
      page_failed=1
    elif ! validation_msg="$(python3 "$VALIDATOR" "$tmp_file" 2>&1)"; then
      failure_reason="validation refusée ($validation_msg)"
      page_failed=1
    fi
  fi
  rm -f "$result_json"

  if (( page_failed )); then
    log "ECHEC $id (${duration}s) : ${failure_reason} — page sautée."
    note_a_revoir "$id" "**Échec de transcription** (${duration}s) : ${failure_reason}."
    rm -f "$tmp_file"
    skipped=$(( skipped + 1 ))
    consecutive_failures=$(( consecutive_failures + 1 ))
    if (( consecutive_failures >= CONSECUTIVE_FAILURE_LIMIT )); then
      log "ARRÊT : $CONSECUTIVE_FAILURE_LIMIT échecs consécutifs."
      exit 4
    fi
    batch_qmark_lines+=("$id : ÉCHEC (${failure_reason})")
  else
    consecutive_failures=0
    qmark_count=$(count_diplomatique_qmarks "$tmp_file")
    mv "$tmp_file" "$out_file"
    processed=$(( processed + 1 ))
    log "OK  $id  (${duration}s, coût affiché \$${cost}, ${qmark_count} [?])  [$processed traitées, $skipped sautées / $total_pages]"
    batch_qmark_lines+=("$id : ${qmark_count} [?]")

    if (( qmark_count > QMARK_ALERT_THRESHOLD )); then
      log "$id a ${qmark_count} [?] (seuil ${QMARK_ALERT_THRESHOLD}) — noté dans $A_REVOIR_FILE, on continue."
      note_a_revoir "$id" "**${qmark_count} [?]** dans le bloc Diplomatique (seuil d'alerte : ${QMARK_ALERT_THRESHOLD}). À relire en priorité."
    fi
  fi

  done_count=$(( processed + skipped ))
  batch_num_pages=$(( (done_count - 1) % BATCH_SIZE + 1 ))

  if (( done_count % BATCH_SIZE == 0 )) || (( i >= ${#pages_to_do[@]} )); then
    batch_num=$(( batch_num + 1 ))
    log "--- Fin de lot : $batch_first_id .. $id ($done_count/$total_pages au total) ---"

    python3 scripts/update_rapport.py \
      --lot "$batch_num" \
      --pages-range "${batch_first_id}-${id}" \
      "${batch_qmark_lines[@]}"

    if git -C "$ROOT_DIR" rev-parse --is-inside-work-tree > /dev/null 2>&1; then
      git -C "$ROOT_DIR" add transcription/ > /dev/null 2>&1
      if ! git -C "$ROOT_DIR" diff --cached --quiet; then
        git -C "$ROOT_DIR" commit -q -m "$(cat <<EOF
transcription lot $batch_num (pages $batch_first_id-$id)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
        log "Commit git créé pour le lot $batch_num."
      else
        log "Rien à committer pour le lot $batch_num (aucun changement staged)."
      fi
    fi

    batch_first_id=""
    batch_qmark_lines=()
  fi
done

log "=== Terminé : $processed transcrite(s), $skipped sautée(s) / $total_pages ==="
