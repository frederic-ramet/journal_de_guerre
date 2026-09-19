#!/usr/bin/env python3
"""Met à jour transcription/RAPPORT.md à la fin d'un lot de transcribe.sh.

Usage:
    update_rapport.py --lot N --pages-range "IDA-IDB" "id1 : 2 [?]" "id2 : 0 [?]" ...

Lit l'état actuel de transcription/pages/, transcription/a_revoir.md et
transcription/journal.log pour reconstruire un rapport global à chaque appel
(idempotent : peut être relancé sans dépendre de son propre historique).
"""
import argparse
import re
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGES_DIR = ROOT / "jpg_pages"
OUT_DIR = ROOT / "transcription" / "pages"
A_REVOIR_FILE = ROOT / "transcription" / "a_revoir.md"
JOURNAL_FILE = ROOT / "transcription" / "journal.log"
RAPPORT_FILE = ROOT / "transcription" / "RAPPORT.md"
GLOSSAIRE_FILE = ROOT / "transcription" / "glossaire.md"

# "allemagne" seule est trop fréquente (mention générique du pays de
# captivité dans des dates/signatures) pour signaler une reprise du nom de
# ville précis de la page de titre : on exige "westphalie" ou une variante
# du nom de ville lui-même.
LIEU_PATTERN = re.compile(r"westphalie|m\w*nster|mart[eè]ne", re.IGNORECASE)
# "george" seul matche le camarade "Georges Lété" (faux positif fréquent) :
# on exige la graphie du maître accolée à un [?] ou "tek"/"tét", jamais
# juste le prénom.
MAITRE_PATTERN = re.compile(r"geco\[?\]?t[ée]t|george\[?\]?tek", re.IGNORECASE)


def total_source_pages() -> int:
    return len(list(PAGES_DIR.glob("*.jpg"))) + len(list(PAGES_DIR.glob("*.jpeg")))


def done_pages() -> list[Path]:
    return sorted(OUT_DIR.glob("*.md"))


def qmark_count_in_diplomatique(text: str) -> int:
    start = text.find("## Diplomatique")
    if start == -1:
        return 0
    code_start = text.find("```", start)
    if code_start == -1:
        return 0
    code_start += 3
    code_end = text.find("```", code_start)
    if code_end == -1:
        return 0
    return text[code_start:code_end].count("[?]")


def parse_journal_durations() -> list[tuple[str, int]]:
    """Retourne [(id, duration_seconds), ...] pour la dernière ligne OK de
    chaque page dans le journal (une page peut avoir été retranscrite après
    suppression manuelle de son .md, auquel cas seule la dernière tentative
    réussie compte)."""
    if not JOURNAL_FILE.exists():
        return []
    by_id: dict[str, int] = {}
    order: list[str] = []
    pattern = re.compile(r"OK\s+(\S+)\s+\((\d+)s")
    for line in JOURNAL_FILE.read_text(encoding="utf-8").splitlines():
        m = pattern.search(line)
        if m:
            page_id = m.group(1)
            if page_id not in by_id:
                order.append(page_id)
            by_id[page_id] = int(m.group(2))
    return [(page_id, by_id[page_id]) for page_id in order]


def build_rapport(lot_num: int, pages_range: str, batch_lines: list[str]) -> str:
    pages = done_pages()
    total = total_source_pages()
    done_count = len(pages)
    remaining = total - done_count

    existing_ids = {p.stem for p in pages}
    durations = [(pid, d) for pid, d in parse_journal_durations() if pid in existing_ids]
    total_duration = sum(d for _, d in durations)
    avg_duration = total_duration / len(durations) if durations else 0

    qmark_by_page = []
    lieu_hits = []
    maitre_hits = []
    for p in pages:
        text = p.read_text(encoding="utf-8")
        count = qmark_count_in_diplomatique(text)
        qmark_by_page.append((p.stem, count))
        if LIEU_PATTERN.search(text):
            lieu_hits.append(p.stem)
        if MAITRE_PATTERN.search(text):
            maitre_hits.append(p.stem)

    qmark_by_page.sort(key=lambda t: -t[1])

    lines = []
    lines.append("# Rapport de transcription — Journal de guerre d'Ernest Ramet")
    lines.append("")
    lines.append(f"_Dernière mise à jour : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} — lot {lot_num} (pages {pages_range})_")
    lines.append("")
    lines.append("## Avancement")
    lines.append("")
    lines.append(f"- Pages transcrites : **{done_count} / {total}**")
    lines.append(f"- Pages restantes : **{remaining}**")
    if durations:
        lines.append(f"- Temps moyen par page : {avg_duration:.0f}s ({len(durations)} pages chronométrées)")
        lines.append(f"- Temps cumulé de transcription : {total_duration/60:.0f} min")
        if avg_duration > 0 and remaining > 0:
            est_remaining_min = remaining * avg_duration / 60
            lines.append(f"- Estimation temps restant au rythme actuel : ~{est_remaining_min:.0f} min")
    lines.append("")

    lines.append("## Dernier lot traité")
    lines.append("")
    lines.append(f"Lot {lot_num} — pages {pages_range} :")
    lines.append("")
    for line in batch_lines:
        lines.append(f"- {line}")
    lines.append("")

    lines.append("## Décompte des [?] par page (toutes pages transcrites, triées par nombre décroissant)")
    lines.append("")
    lines.append("| Page | [?] |")
    lines.append("|---|---|")
    for stem, count in qmark_by_page:
        lines.append(f"| {stem} | {count} |")
    lines.append("")

    lines.append("## Pages à revoir")
    lines.append("")
    if A_REVOIR_FILE.exists() and A_REVOIR_FILE.read_text(encoding="utf-8").strip():
        lines.append(f"Voir [`transcription/a_revoir.md`](a_revoir.md) pour le détail (échecs, pages à plus de 15 [?]).")
    else:
        lines.append("Aucune pour l'instant.")
    lines.append("")

    lines.append("## Lieu de captivité (\"... Westphalie, Allemagne\")")
    lines.append("")
    if lieu_hits:
        lines.append("Mentions trouvées sur : " + ", ".join(lieu_hits))
    else:
        lines.append("Aucune occurrence trouvée en dehors de la page de titre (IMG_0410_b) pour l'instant.")
    lines.append("")

    lines.append("## Nom du maître (\"Geco[?]tét\" / variantes)")
    lines.append("")
    if maitre_hits:
        lines.append("Mentions trouvées sur : " + ", ".join(maitre_hits))
    else:
        lines.append("Aucune occurrence trouvée en dehors de la page de titre (IMG_0410_b) pour l'instant.")
    lines.append("")

    lines.append("## Points à trancher au retour")
    lines.append("")
    lines.append("(Complété manuellement au fil de l'eau par le script/l'agent si quelque chose")
    lines.append("d'inhabituel est rencontré — voir aussi les Notes de chaque page.)")
    lines.append("")

    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--lot", type=int, required=True)
    parser.add_argument("--pages-range", required=True)
    parser.add_argument("batch_lines", nargs="*")
    args = parser.parse_args()

    content = build_rapport(args.lot, args.pages_range, args.batch_lines)
    RAPPORT_FILE.write_text(content, encoding="utf-8")
    print(f"RAPPORT.md mis à jour ({RAPPORT_FILE})")


if __name__ == "__main__":
    main()
