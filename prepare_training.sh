#!/bin/bash
# prepare_training.sh - Préparer les données pour le fine-tuning
# Segmente les images en lignes et crée un fichier CSV de labels

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

INPUT_DIR="${1:-jpg_extract}"
OUTPUT_DIR="${2:-data/training}"
MAX_LINES="${3:-100}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Préparation des Données d'Entraînement${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Activate venv
if [ -d "venv" ] && [ -z "$VIRTUAL_ENV" ]; then
    source venv/bin/activate
    echo -e "${GREEN}✓ Environnement virtuel activé${NC}"
fi

# Create output directories
mkdir -p "$OUTPUT_DIR/lines"
mkdir -p "$OUTPUT_DIR/preprocessed"

echo -e "${BLUE}Configuration:${NC}"
echo "  - Dossier source: $INPUT_DIR"
echo "  - Dossier sortie: $OUTPUT_DIR"
echo "  - Lignes max: $MAX_LINES"
echo ""

# Count source images
IMG_COUNT=$(find "$INPUT_DIR" -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" \) | wc -l)

if [ "$IMG_COUNT" -eq 0 ]; then
    echo -e "${RED}✗ Aucune image trouvée dans $INPUT_DIR${NC}"
    exit 1
fi

echo -e "${GREEN}✓ $IMG_COUNT images trouvées${NC}"
echo ""

# ============================================
# Step 1: Preprocess and segment images
# ============================================
echo -e "${YELLOW}Étape 1: Segmentation des images en lignes${NC}"
echo "---"

python3 << EOF
import sys
sys.path.insert(0, 'src')
from htr.preprocessing.image_enhancer import ImageEnhancer
from htr.segmentation.line_detector import LineDetector
from pathlib import Path
import cv2

input_dir = Path("$INPUT_DIR")
output_lines_dir = Path("$OUTPUT_DIR/lines")
output_preprocessed_dir = Path("$OUTPUT_DIR/preprocessed")
max_lines = $MAX_LINES

enhancer = ImageEnhancer()
detector = LineDetector()

# Get all images
image_extensions = {'.jpg', '.jpeg', '.png', '.tiff', '.bmp'}
image_files = sorted([f for f in input_dir.glob('**/*') if f.suffix.lower() in image_extensions])

total_lines = 0
processed_images = 0

print(f"Traitement de {len(image_files)} images...")

for img_file in image_files:
    if total_lines >= max_lines:
        print(f"\\nAtteint la limite de {max_lines} lignes")
        break

    print(f"  {img_file.name}...", end=" ", flush=True)

    try:
        # Preprocess
        preprocessed = enhancer.process(str(img_file))

        # Save preprocessed
        prep_file = output_preprocessed_dir / f"{img_file.stem}_preprocessed.png"
        cv2.imwrite(str(prep_file), preprocessed)

        # Detect lines
        lines = detector.detect_lines(preprocessed)

        # Save lines
        for line in lines:
            if total_lines >= max_lines:
                break

            line_filename = f"{img_file.stem}_line_{line.line_number:04d}.png"
            line_path = output_lines_dir / line_filename
            cv2.imwrite(str(line_path), line.image)
            total_lines += 1

        print(f"{len(lines)} lignes")
        processed_images += 1

    except Exception as e:
        print(f"ERREUR: {e}")

print(f"\\nRésumé:")
print(f"  - Images traitées: {processed_images}")
print(f"  - Lignes extraites: {total_lines}")
print(f"  - Lignes sauvées dans: $OUTPUT_DIR/lines/")
EOF

LINE_COUNT=$(ls -1 "$OUTPUT_DIR/lines/"*.png 2>/dev/null | wc -l)
echo ""
echo -e "${GREEN}✓ $LINE_COUNT lignes extraites${NC}"
echo ""

# ============================================
# Step 2: Create CSV template
# ============================================
echo -e "${YELLOW}Étape 2: Création du fichier CSV de labels${NC}"
echo "---"

CSV_FILE="$OUTPUT_DIR/labels.csv"

echo "image_path,transcription" > "$CSV_FILE"

for line_file in "$OUTPUT_DIR/lines/"*.png; do
    filename=$(basename "$line_file")
    echo "$filename," >> "$CSV_FILE"
done

echo -e "${GREEN}✓ Fichier CSV créé: $CSV_FILE${NC}"
echo ""

# ============================================
# Step 3: Instructions
# ============================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Données Prêtes !${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

echo -e "${YELLOW}Prochaine étape: Transcription manuelle${NC}"
echo ""
echo "1. Ouvrez le fichier CSV:"
echo "   ${GREEN}$CSV_FILE${NC}"
echo ""
echo "2. Pour chaque image de ligne, ajoutez la transcription:"
echo "   - Ouvrez l'image correspondante dans $OUTPUT_DIR/lines/"
echo "   - Écrivez le texte exact dans la colonne 'transcription'"
echo ""
echo "   Exemple:"
echo "   image_path,transcription"
echo "   1_line_0000.png,Carnet Appartenant"
echo "   1_line_0001.png,à Ramet Ernest"
echo ""
echo "3. Une fois terminé, lancez le fine-tuning:"
echo "   ${GREEN}python -m src.htr.training.trainer $OUTPUT_DIR/lines/ $CSV_FILE${NC}"
echo ""

# Optional: Open image viewer helper
read -p "Voulez-vous créer un script d'aide à la transcription? (o/N) " -n 1 -r
echo

if [[ $REPLY =~ ^[Oo]$ ]]; then
    cat > "$OUTPUT_DIR/transcribe_helper.py" << 'PYEOF'
#!/usr/bin/env python3
"""
Assistant de transcription interactif.
Affiche chaque image de ligne et permet de saisir la transcription.
"""
import csv
from pathlib import Path
from PIL import Image
import os

def main():
    lines_dir = Path("lines")
    csv_file = Path("labels.csv")

    # Read existing transcriptions
    existing = {}
    if csv_file.exists():
        with open(csv_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row['transcription'].strip():
                    existing[row['image_path']] = row['transcription']

    # Get all line images
    line_files = sorted(lines_dir.glob("*.png"))

    print(f"Trouvé {len(line_files)} lignes à transcrire")
    print(f"Déjà transcrites: {len(existing)}")
    print()
    print("Commandes:")
    print("  - Tapez le texte et appuyez sur Entrée")
    print("  - Tapez 'skip' pour passer")
    print("  - Tapez 'quit' pour sauvegarder et quitter")
    print("  - Tapez 'view' pour réafficher l'image")
    print()

    transcriptions = existing.copy()

    for i, line_file in enumerate(line_files):
        filename = line_file.name

        # Skip if already transcribed
        if filename in transcriptions:
            print(f"[{i+1}/{len(line_files)}] {filename} - Déjà transcrit: {transcriptions[filename][:50]}...")
            continue

        print(f"\n[{i+1}/{len(line_files)}] {filename}")

        # Try to display image
        try:
            img = Image.open(line_file)
            img.show()
        except:
            print(f"  (Ouvrez manuellement: {line_file})")

        while True:
            text = input("Transcription: ").strip()

            if text.lower() == 'quit':
                save_csv(csv_file, transcriptions, line_files)
                print(f"\nSauvegardé {len(transcriptions)} transcriptions")
                return

            if text.lower() == 'skip':
                break

            if text.lower() == 'view':
                img.show()
                continue

            if text:
                transcriptions[filename] = text
                break

    # Save final
    save_csv(csv_file, transcriptions, line_files)
    print(f"\nTerminé! {len(transcriptions)} transcriptions sauvées.")

def save_csv(csv_file, transcriptions, line_files):
    with open(csv_file, 'w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['image_path', 'transcription'])
        for line_file in line_files:
            filename = line_file.name
            text = transcriptions.get(filename, '')
            writer.writerow([filename, text])

if __name__ == "__main__":
    main()
PYEOF

    chmod +x "$OUTPUT_DIR/transcribe_helper.py"
    echo -e "${GREEN}✓ Script d'aide créé: $OUTPUT_DIR/transcribe_helper.py${NC}"
    echo ""
    echo "Pour l'utiliser:"
    echo "  cd $OUTPUT_DIR"
    echo "  python transcribe_helper.py"
fi

echo ""
echo -e "${GREEN}✓ Préparation terminée !${NC}"
