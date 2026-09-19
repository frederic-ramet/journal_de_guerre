#!/usr/bin/env python3
"""Valide qu'un fichier de transcription est complet avant de le publier.

Vérifie : front matter YAML avec tous les champs requis, et les trois
sections (Diplomatique, Normalisé, Notes) présentes et non vides.

Usage: validate_page.py <fichier.md>
Exit 0 si valide, 1 sinon (message sur stderr).
"""
import re
import sys

REQUIRED_FIELDS = [
    "id",
    "source",
    "type",
    "date",
    "lieu",
    "signature",
    "statut",
    "incertitudes",
]
REQUIRED_SECTIONS = ["## Diplomatique", "## Normalisé", "## Notes"]


def fail(msg: str) -> None:
    print(f"INVALIDE: {msg}", file=sys.stderr)
    sys.exit(1)


def main() -> None:
    if len(sys.argv) != 2:
        fail("usage: validate_page.py <fichier.md>")

    path = sys.argv[1]
    try:
        with open(path, encoding="utf-8") as f:
            content = f.read()
    except OSError as e:
        fail(f"lecture impossible ({e})")
        return

    if not content.startswith("---"):
        fail("pas de front matter YAML (doit commencer par '---')")

    parts = content.split("---", 2)
    if len(parts) < 3:
        fail("front matter YAML mal formé (second '---' manquant)")

    front_matter = parts[1]
    body = parts[2]

    for field in REQUIRED_FIELDS:
        if not re.search(rf"^{re.escape(field)}:", front_matter, re.MULTILINE):
            fail(f"champ front matter manquant: {field}")

    section_positions = []
    for section in REQUIRED_SECTIONS:
        idx = body.find(section)
        if idx == -1:
            fail(f"section manquante: {section}")
        section_positions.append((idx, section))

    section_positions.sort()
    for i, (idx, section) in enumerate(section_positions):
        end = section_positions[i + 1][0] if i + 1 < len(section_positions) else len(body)
        section_body = body[idx + len(section):end].strip()
        if not section_body:
            fail(f"section vide: {section}")

    print("OK")
    sys.exit(0)


if __name__ == "__main__":
    main()
