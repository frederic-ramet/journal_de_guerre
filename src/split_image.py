#!/usr/bin/env python3
"""
Script pour découper une image en 2 ou 4 parties pour améliorer la lisibilité.
"""

from PIL import Image
import os
import sys
from pathlib import Path


def split_image(image_path: str, parts: int = 4, output_dir: str = None) -> list[str]:
    """
    Découpe une image en 2 ou 4 parties.

    Args:
        image_path: Chemin vers l'image source
        parts: Nombre de parties (2 pour haut/bas, 4 pour quadrants)
        output_dir: Dossier de sortie (défaut: même dossier que l'image)

    Returns:
        Liste des chemins vers les images découpées
    """
    if parts not in [2, 4]:
        raise ValueError("Le nombre de parties doit être 2 ou 4")

    img = Image.open(image_path)
    width, height = img.size

    if output_dir is None:
        output_dir = os.path.dirname(image_path)

    os.makedirs(output_dir, exist_ok=True)

    base_name = Path(image_path).stem
    ext = Path(image_path).suffix

    output_files = []

    if parts == 2:
        # Découpe en 2 (haut et bas)
        mid_y = height // 2

        # Partie haute
        top = img.crop((0, 0, width, mid_y))
        top_path = os.path.join(output_dir, f"{base_name}_top{ext}")
        top.save(top_path, quality=95)
        output_files.append(top_path)

        # Partie basse
        bottom = img.crop((0, mid_y, width, height))
        bottom_path = os.path.join(output_dir, f"{base_name}_bottom{ext}")
        bottom.save(bottom_path, quality=95)
        output_files.append(bottom_path)

    else:  # parts == 4
        # Découpe en 4 quadrants
        mid_x = width // 2
        mid_y = height // 2

        # Quadrant supérieur gauche
        tl = img.crop((0, 0, mid_x, mid_y))
        tl_path = os.path.join(output_dir, f"{base_name}_top_left{ext}")
        tl.save(tl_path, quality=95)
        output_files.append(tl_path)

        # Quadrant supérieur droit
        tr = img.crop((mid_x, 0, width, mid_y))
        tr_path = os.path.join(output_dir, f"{base_name}_top_right{ext}")
        tr.save(tr_path, quality=95)
        output_files.append(tr_path)

        # Quadrant inférieur gauche
        bl = img.crop((0, mid_y, mid_x, height))
        bl_path = os.path.join(output_dir, f"{base_name}_bottom_left{ext}")
        bl.save(bl_path, quality=95)
        output_files.append(bl_path)

        # Quadrant inférieur droit
        br = img.crop((mid_x, mid_y, width, height))
        br_path = os.path.join(output_dir, f"{base_name}_bottom_right{ext}")
        br.save(br_path, quality=95)
        output_files.append(br_path)

    return output_files


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python split_image.py <image_path> [parts=4] [output_dir]")
        print("  parts: 2 (haut/bas) ou 4 (quadrants)")
        sys.exit(1)

    image_path = sys.argv[1]
    parts = int(sys.argv[2]) if len(sys.argv) > 2 else 4
    output_dir = sys.argv[3] if len(sys.argv) > 3 else None

    files = split_image(image_path, parts, output_dir)
    print(f"Images créées:")
    for f in files:
        print(f"  - {f}")
