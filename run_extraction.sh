#!/bin/bash
# run_extraction.sh - Lancer l'extraction HTR avec vérifications
# Journal de Guerre - TrOCR Text Extraction System

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Default values
INPUT_DIR="jpg_extract"
OUTPUT_DIR="data/processed"
CONFIG_FILE="configs/default_config.yaml"
VERBOSE=false
SINGLE_IMAGE=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -i|--input)
            INPUT_DIR="$2"
            shift 2
            ;;
        -o|--output)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        -c|--config)
            CONFIG_FILE="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -i, --input DIR     Dossier d'images (défaut: jpg_extract)"
            echo "  -o, --output DIR    Dossier de sortie (défaut: data/processed)"
            echo "  -c, --config FILE   Fichier de config (défaut: configs/default_config.yaml)"
            echo "  -v, --verbose       Mode verbeux"
            echo "  -h, --help          Afficher cette aide"
            echo ""
            echo "Exemples:"
            echo "  $0                                    # Utiliser les défauts"
            echo "  $0 -i mon_dossier/ -o resultats/     # Dossiers personnalisés"
            echo "  $0 -v                                 # Mode verbeux"
            exit 0
            ;;
        *)
            # Assume it's a single image file
            if [ -f "$1" ]; then
                SINGLE_IMAGE="$1"
            else
                INPUT_DIR="$1"
            fi
            shift
            ;;
    esac
done

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  HTR Extraction Pipeline${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# ============================================
# Pre-flight checks
# ============================================
echo -e "${YELLOW}Vérifications pré-vol...${NC}"

# Check virtual environment
if [ -z "$VIRTUAL_ENV" ]; then
    if [ -d "venv" ]; then
        echo -e "${BLUE}Activation de l'environnement virtuel...${NC}"
        source venv/bin/activate
        echo -e "${GREEN}✓ Environnement virtuel activé${NC}"
    else
        echo -e "${RED}✗ Environnement virtuel non trouvé${NC}"
        echo "Lancez d'abord: ./setup.sh"
        exit 1
    fi
else
    echo -e "${GREEN}✓ Environnement virtuel actif${NC}"
fi

# Check input
if [ -n "$SINGLE_IMAGE" ]; then
    if [ ! -f "$SINGLE_IMAGE" ]; then
        echo -e "${RED}✗ Image non trouvée: $SINGLE_IMAGE${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Image à traiter: $SINGLE_IMAGE${NC}"
    INPUT_TYPE="single"
else
    if [ ! -d "$INPUT_DIR" ]; then
        echo -e "${RED}✗ Dossier d'entrée non trouvé: $INPUT_DIR${NC}"
        exit 1
    fi

    # Count images
    IMG_COUNT=$(find "$INPUT_DIR" -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" -o -iname "*.tiff" \) | wc -l)

    if [ "$IMG_COUNT" -eq 0 ]; then
        echo -e "${RED}✗ Aucune image trouvée dans $INPUT_DIR${NC}"
        exit 1
    fi

    echo -e "${GREEN}✓ Dossier d'entrée: $INPUT_DIR ($IMG_COUNT images)${NC}"
    INPUT_TYPE="batch"
fi

# Check config
if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${YELLOW}⚠ Configuration non trouvée: $CONFIG_FILE${NC}"
    echo -e "${BLUE}ℹ Utilisation des paramètres par défaut${NC}"
    CONFIG_ARG=""
else
    echo -e "${GREEN}✓ Configuration: $CONFIG_FILE${NC}"
    CONFIG_ARG="--config $CONFIG_FILE"
fi

# Check output directory
mkdir -p "$OUTPUT_DIR"
echo -e "${GREEN}✓ Dossier de sortie: $OUTPUT_DIR${NC}"

# Check disk space
AVAILABLE_SPACE=$(df -h "$OUTPUT_DIR" | awk 'NR==2 {print $4}')
echo -e "${BLUE}ℹ Espace disque disponible: $AVAILABLE_SPACE${NC}"

# Check GPU
GPU_STATUS=$(python3 -c "import torch; print('GPU' if torch.cuda.is_available() else 'CPU')" 2>/dev/null)
if [ "$GPU_STATUS" == "GPU" ]; then
    GPU_NAME=$(python3 -c "import torch; print(torch.cuda.get_device_name(0))" 2>/dev/null)
    echo -e "${GREEN}✓ Mode GPU: $GPU_NAME${NC}"
else
    echo -e "${YELLOW}⚠ Mode CPU (plus lent)${NC}"
fi

echo ""

# ============================================
# Estimate processing time
# ============================================
if [ "$INPUT_TYPE" == "batch" ]; then
    if [ "$GPU_STATUS" == "GPU" ]; then
        EST_TIME=$((IMG_COUNT * 5))  # ~5 seconds per image with GPU
    else
        EST_TIME=$((IMG_COUNT * 45))  # ~45 seconds per image with CPU
    fi

    if [ $EST_TIME -lt 60 ]; then
        echo -e "${BLUE}Temps estimé: ~${EST_TIME} secondes${NC}"
    else
        EST_MIN=$((EST_TIME / 60))
        echo -e "${BLUE}Temps estimé: ~${EST_MIN} minutes${NC}"
    fi
    echo ""
fi

# ============================================
# Confirmation
# ============================================
if [ "$INPUT_TYPE" == "batch" ] && [ "$IMG_COUNT" -gt 5 ]; then
    read -p "Lancer l'extraction sur $IMG_COUNT images? (O/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Nn]$ ]]; then
        echo "Annulé."
        exit 0
    fi
fi

# ============================================
# Run extraction
# ============================================
echo -e "${YELLOW}Démarrage de l'extraction...${NC}"
echo ""

START_TIME=$(date +%s)

# Build command
CMD="python extract_journal.py"

if [ -n "$SINGLE_IMAGE" ]; then
    CMD="$CMD $SINGLE_IMAGE"
else
    CMD="$CMD $INPUT_DIR"
fi

CMD="$CMD --output $OUTPUT_DIR"

if [ -n "$CONFIG_ARG" ]; then
    CMD="$CMD $CONFIG_ARG"
fi

if [ "$VERBOSE" = true ]; then
    CMD="$CMD --verbose"
fi

echo -e "${BLUE}Commande: $CMD${NC}"
echo ""

# Execute
if $CMD; then
    END_TIME=$(date +%s)
    ELAPSED=$((END_TIME - START_TIME))

    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  Extraction Terminée !${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""

    # Calculate time
    if [ $ELAPSED -lt 60 ]; then
        echo -e "${GREEN}✓ Temps total: ${ELAPSED} secondes${NC}"
    else
        ELAPSED_MIN=$((ELAPSED / 60))
        ELAPSED_SEC=$((ELAPSED % 60))
        echo -e "${GREEN}✓ Temps total: ${ELAPSED_MIN}m ${ELAPSED_SEC}s${NC}"
    fi

    # Show results
    echo ""
    echo -e "${BLUE}Résultats:${NC}"

    # Count output files
    if [ -d "$OUTPUT_DIR" ]; then
        CORRECTED_COUNT=$(find "$OUTPUT_DIR" -name "*_corrected.txt" -type f | wc -l)
        RAW_COUNT=$(find "$OUTPUT_DIR" -name "*_raw.txt" -type f | wc -l)
        LINE_DIRS=$(find "$OUTPUT_DIR" -type d -name "*_lines" | wc -l)

        echo "  - Textes corrigés: $CORRECTED_COUNT"
        echo "  - Textes bruts: $RAW_COUNT"
        echo "  - Dossiers de lignes: $LINE_DIRS"

        # Check for combined output
        if [ -f "$OUTPUT_DIR/combined_journal.txt" ]; then
            COMBINED_SIZE=$(wc -c < "$OUTPUT_DIR/combined_journal.txt")
            COMBINED_LINES=$(wc -l < "$OUTPUT_DIR/combined_journal.txt")
            echo "  - Journal combiné: $COMBINED_LINES lignes, $(numfmt --to=iec $COMBINED_SIZE)"
        fi

        # Check for stats
        if [ -f "$OUTPUT_DIR/processing_stats.json" ]; then
            echo ""
            echo -e "${BLUE}Statistiques:${NC}"
            python3 -c "
import json
with open('$OUTPUT_DIR/processing_stats.json') as f:
    stats = json.load(f)
for key, value in stats.items():
    if isinstance(value, float):
        print(f'  - {key}: {value:.2f}')
    else:
        print(f'  - {key}: {value}')
"
        fi
    fi

    echo ""
    echo -e "${BLUE}Fichiers de sortie dans: $OUTPUT_DIR${NC}"

    # Show sample output
    if [ "$INPUT_TYPE" == "single" ] && [ -n "$SINGLE_IMAGE" ]; then
        BASENAME=$(basename "$SINGLE_IMAGE" | sed 's/\.[^.]*$//')
        CORRECTED_FILE="$OUTPUT_DIR/${BASENAME}_corrected.txt"

        if [ -f "$CORRECTED_FILE" ]; then
            echo ""
            echo -e "${BLUE}Aperçu du texte extrait:${NC}"
            echo "----------------------------------------"
            head -20 "$CORRECTED_FILE"
            echo "----------------------------------------"
        fi
    fi

else
    echo ""
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}  Erreur lors de l'extraction${NC}"
    echo -e "${RED}========================================${NC}"
    echo ""
    echo "Suggestions:"
    echo "  1. Relancez avec --verbose pour plus de détails"
    echo "  2. Vérifiez les logs d'erreur"
    echo "  3. Assurez-vous que les dépendances sont installées (./setup.sh)"
    exit 1
fi

echo ""
echo -e "${GREEN}✓ Extraction complète !${NC}"
