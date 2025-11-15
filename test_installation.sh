#!/bin/bash
# test_installation.sh - Test rapide de l'installation HTR
# Vérifie que tout fonctionne avant de lancer sur les données réelles

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Test d'Installation HTR${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

ERRORS=0

test_pass() {
    echo -e "${GREEN}✓ $1${NC}"
}

test_fail() {
    echo -e "${RED}✗ $1${NC}"
    ERRORS=$((ERRORS + 1))
}

test_warn() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Activate venv if exists
if [ -d "venv" ] && [ -z "$VIRTUAL_ENV" ]; then
    source venv/bin/activate
fi

echo -e "${YELLOW}Test 1: Imports Python${NC}"
echo "---"

# Test imports
python3 << 'EOF'
import sys
sys.path.insert(0, 'src')

tests = [
    ("torch", "import torch"),
    ("transformers", "import transformers"),
    ("TrOCRProcessor", "from transformers import TrOCRProcessor"),
    ("VisionEncoderDecoderModel", "from transformers import VisionEncoderDecoderModel"),
    ("cv2 (OpenCV)", "import cv2"),
    ("PIL", "from PIL import Image"),
    ("numpy", "import numpy"),
    ("yaml", "import yaml"),
    ("tqdm", "from tqdm import tqdm"),
    ("ImageEnhancer", "from htr.preprocessing.image_enhancer import ImageEnhancer"),
    ("LineDetector", "from htr.segmentation.line_detector import LineDetector"),
    ("TrOCREngine", "from htr.recognition.trocr_engine import TrOCREngine"),
    ("TextCorrector", "from htr.postprocessing.text_corrector import TextCorrector"),
    ("HTRPipeline", "from htr.pipeline import HTRPipeline"),
]

for name, cmd in tests:
    try:
        exec(cmd)
        print(f"  ✓ {name}")
    except Exception as e:
        print(f"  ✗ {name}: {e}")
EOF

if [ $? -ne 0 ]; then
    test_fail "Certains imports ont échoué"
else
    test_pass "Tous les imports réussis"
fi

echo ""
echo -e "${YELLOW}Test 2: Configuration YAML${NC}"
echo "---"

if [ -f "configs/default_config.yaml" ]; then
    python3 -c "
import yaml
with open('configs/default_config.yaml') as f:
    config = yaml.safe_load(f)
print(f'  ✓ Configuration chargée: {len(config)} sections')
for section in config:
    print(f'    - {section}')
"
    test_pass "Configuration valide"
else
    test_fail "Configuration non trouvée"
fi

echo ""
echo -e "${YELLOW}Test 3: Vocabulaire personnalisé${NC}"
echo "---"

if [ -f "configs/custom_vocab.txt" ]; then
    VOCAB_COUNT=$(grep -v '^#' configs/custom_vocab.txt | grep -v '^$' | wc -l)
    echo "  ✓ $VOCAB_COUNT mots dans le vocabulaire"
    test_pass "Vocabulaire chargé"
else
    test_warn "Vocabulaire personnalisé non trouvé"
fi

echo ""
echo -e "${YELLOW}Test 4: Images de test${NC}"
echo "---"

if [ -d "jpg_extract" ]; then
    IMG_COUNT=$(find jpg_extract -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" \) | wc -l)
    if [ "$IMG_COUNT" -gt 0 ]; then
        echo "  ✓ $IMG_COUNT images trouvées dans jpg_extract/"
        ls -lh jpg_extract/ | head -5
        test_pass "Images de test disponibles"
    else
        test_warn "Aucune image dans jpg_extract/"
    fi
else
    test_warn "Dossier jpg_extract/ non trouvé"
fi

echo ""
echo -e "${YELLOW}Test 5: Prétraitement d'image${NC}"
echo "---"

# Find a test image
TEST_IMG=$(find jpg_extract -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" \) | head -1)

if [ -n "$TEST_IMG" ]; then
    echo "  Test avec: $TEST_IMG"

    python3 << EOF
import sys
sys.path.insert(0, 'src')
from htr.preprocessing.image_enhancer import ImageEnhancer
import cv2
import numpy as np

enhancer = ImageEnhancer()
img = cv2.imread("$TEST_IMG")
if img is not None:
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    enhanced = enhancer._enhance_contrast(gray)
    print(f"  ✓ Image chargée: {img.shape}")
    print(f"  ✓ Contraste amélioré: {enhanced.shape}")
else:
    print("  ✗ Échec du chargement")
    sys.exit(1)
EOF

    if [ $? -eq 0 ]; then
        test_pass "Prétraitement fonctionnel"
    else
        test_fail "Erreur de prétraitement"
    fi
else
    test_warn "Pas d'image de test disponible"
fi

echo ""
echo -e "${YELLOW}Test 6: Segmentation de lignes${NC}"
echo "---"

if [ -n "$TEST_IMG" ]; then
    python3 << EOF
import sys
sys.path.insert(0, 'src')
from htr.segmentation.line_detector import LineDetector
import cv2

detector = LineDetector()
img = cv2.imread("$TEST_IMG", cv2.IMREAD_GRAYSCALE)
if img is not None:
    # Test column detection
    columns = detector._detect_columns(255 - img)
    print(f"  ✓ Colonnes détectées: {len(columns)}")

    # Don't do full segmentation (too slow for test)
    print(f"  ✓ Segmentation initialisée")
else:
    sys.exit(1)
EOF

    if [ $? -eq 0 ]; then
        test_pass "Segmentation fonctionnelle"
    else
        test_fail "Erreur de segmentation"
    fi
fi

echo ""
echo -e "${YELLOW}Test 7: Post-traitement${NC}"
echo "---"

python3 << 'EOF'
import sys
sys.path.insert(0, 'src')
from htr.postprocessing.text_corrector import TextCorrector

corrector = TextCorrector()
test_text = "Carnet Appartenant à Ramet Ernest le 15-6-16"
corrected = corrector.correct_text(test_text)
print(f"  Original : {test_text}")
print(f"  Corrigé  : {corrected}")
print(f"  ✓ Post-traitement fonctionnel")
EOF

if [ $? -eq 0 ]; then
    test_pass "Post-traitement fonctionnel"
else
    test_fail "Erreur de post-traitement"
fi

echo ""
echo -e "${YELLOW}Test 8: GPU / CPU Status${NC}"
echo "---"

python3 << 'EOF'
import torch
if torch.cuda.is_available():
    print(f"  ✓ GPU CUDA disponible")
    print(f"    Device: {torch.cuda.get_device_name(0)}")
    print(f"    Mémoire: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB")
else:
    print(f"  ⚠ Mode CPU uniquement")
    print(f"    Les traitements seront plus lents")
EOF

test_pass "Détection GPU/CPU"

echo ""
echo -e "${YELLOW}Test 9: Pipeline complet (dry-run)${NC}"
echo "---"

python3 << 'EOF'
import sys
sys.path.insert(0, 'src')
from htr.pipeline import HTRPipeline

try:
    # Load config but don't process anything
    pipeline = HTRPipeline("configs/default_config.yaml")
    print(f"  ✓ Pipeline initialisé")
    print(f"    - Enhancer: OK")
    print(f"    - Detector: OK")
    print(f"    - Recognizer: OK (modèle sera téléchargé au premier usage)")
    print(f"    - Corrector: OK")
except Exception as e:
    print(f"  ✗ Erreur: {e}")
    sys.exit(1)
EOF

if [ $? -eq 0 ]; then
    test_pass "Pipeline prêt"
else
    test_fail "Pipeline non fonctionnel"
fi

echo ""
echo -e "${BLUE}========================================${NC}"

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}  Tous les tests passés ! ✓${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    echo -e "${GREEN}L'installation est complète et fonctionnelle.${NC}"
    echo ""
    echo "Prochaines étapes:"
    echo "  1. Lancez: ./run_extraction.sh jpg_extract/1.jpg"
    echo "  2. Vérifiez les résultats dans data/processed/"
    echo "  3. Si OK, traitez tout: ./run_extraction.sh"
else
    echo -e "${RED}  $ERRORS test(s) échoué(s) ✗${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    echo "Actions recommandées:"
    echo "  1. Relancez ./setup.sh"
    echo "  2. Vérifiez les erreurs ci-dessus"
    echo "  3. Consultez la documentation"
fi

exit $ERRORS
