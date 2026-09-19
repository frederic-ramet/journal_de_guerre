#!/usr/bin/env python3
"""Génère jpg_pages/_read/ : bandes horizontales à pleine résolution.

Le client d'API réduit les images à ~1568px sur le grand côté avant de les
envoyer au modèle. Les pages du carnet font ~2400x5700px (hauteur »
largeur) : une page entière envoyée telle quelle perd donc beaucoup de
détail. En découpant chaque page haute en deux bandes horizontales, chaque
bande occupe une plus petite portion de la hauteur réelle et conserve
environ deux fois plus de détail après le redimensionnement côté client.

Pour une image de hauteur >= HEIGHT_THRESHOLD :
    <id>_1.jpg = du haut à OVERLAP_TOP_FRACTION de la hauteur (0 à 56%)
    <id>_2.jpg = de OVERLAP_BOTTOM_FRACTION au bas (44% à 100%)
    (12% de recouvrement entre les deux bandes)
Pas de redimensionnement : résolution native conservée.

Pour une image plus basse (couvertures, images pieuses, lettres) : copiée
telle quelle sous <id>.jpg dans jpg_pages/_read/.

Usage: scripts/make_read.py
"""
import shutil
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT / "jpg_pages"
OUT_DIR = SRC_DIR / "_read"

HEIGHT_THRESHOLD = 3000
TOP_END_FRACTION = 0.56
BOTTOM_START_FRACTION = 0.44


def process_image(src: Path) -> None:
    stem = src.stem
    with Image.open(src) as im:
        width, height = im.size

        if height < HEIGHT_THRESHOLD:
            dest = OUT_DIR / f"{stem}.jpg"
            shutil.copyfile(src, dest)
            print(f"{stem}: copié tel quel ({width}x{height})")
            return

        top_end = int(height * TOP_END_FRACTION)
        bottom_start = int(height * BOTTOM_START_FRACTION)

        band_1 = im.crop((0, 0, width, top_end))
        band_1.save(OUT_DIR / f"{stem}_1.jpg", quality=95)

        band_2 = im.crop((0, bottom_start, width, height))
        band_2.save(OUT_DIR / f"{stem}_2.jpg", quality=95)

        print(
            f"{stem}: découpé en 2 bandes "
            f"({width}x{top_end} + {width}x{height - bottom_start}, "
            f"recouvrement {bottom_start}-{top_end})"
        )


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    sources = sorted(SRC_DIR.glob("*.jpg")) + sorted(SRC_DIR.glob("*.jpeg"))
    sources = [p for p in sources if p.parent == SRC_DIR]

    if not sources:
        print(f"Aucune image trouvée dans {SRC_DIR}")
        return

    for src in sources:
        process_image(src)

    print(f"\nTerminé : {len(sources)} page(s) traitée(s) -> {OUT_DIR}")


if __name__ == "__main__":
    main()
