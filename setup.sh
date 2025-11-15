#!/bin/bash
# setup.sh - Installation et vérification du pipeline HTR
# Journal de Guerre - TrOCR Text Extraction System

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Journal de Guerre - HTR Setup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Step counter
STEP=0
TOTAL_STEPS=8

next_step() {
    STEP=$((STEP + 1))
    echo -e "\n${YELLOW}[$STEP/$TOTAL_STEPS] $1${NC}"
}

success() {
    echo -e "${GREEN}✓ $1${NC}"
}

error() {
    echo -e "${RED}✗ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# ============================================
# Step 1: Check Python version
# ============================================
next_step "Vérification de Python"

if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version 2>&1 | cut -d' ' -f2)
    PYTHON_MAJOR=$(echo "$PYTHON_VERSION" | cut -d'.' -f1)
    PYTHON_MINOR=$(echo "$PYTHON_VERSION" | cut -d'.' -f2)

    if [ "$PYTHON_MAJOR" -ge 3 ] && [ "$PYTHON_MINOR" -ge 8 ]; then
        success "Python $PYTHON_VERSION détecté"
    else
        error "Python 3.8+ requis, version actuelle: $PYTHON_VERSION"
        exit 1
    fi
else
    error "Python3 non trouvé. Installez Python 3.8+"
    exit 1
fi

# ============================================
# Step 2: Create virtual environment
# ============================================
next_step "Création de l'environnement virtuel"

if [ -d "venv" ]; then
    warning "Environnement virtuel existant détecté"
    read -p "Voulez-vous le recréer? (o/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Oo]$ ]]; then
        rm -rf venv
        python3 -m venv venv
        success "Environnement virtuel recréé"
    else
        info "Utilisation de l'environnement existant"
    fi
else
    python3 -m venv venv
    success "Environnement virtuel créé dans ./venv"
fi

# Activate virtual environment
source venv/bin/activate
success "Environnement virtuel activé"

# ============================================
# Step 3: Upgrade pip
# ============================================
next_step "Mise à jour de pip"

pip install --upgrade pip --quiet
success "pip mis à jour: $(pip --version | cut -d' ' -f2)"

# ============================================
# Step 4: Install dependencies
# ============================================
next_step "Installation des dépendances"

info "Cette étape peut prendre plusieurs minutes..."
info "Installation de PyTorch, transformers, OpenCV..."

if pip install -r requirements.txt; then
    success "Toutes les dépendances installées"
else
    error "Erreur lors de l'installation"
    warning "Essayez: pip install -r requirements.txt --verbose"
    exit 1
fi

# ============================================
# Step 5: Verify critical imports
# ============================================
next_step "Vérification des imports critiques"

echo -n "  PyTorch... "
if python3 -c "import torch; print(f'v{torch.__version__}')" 2>/dev/null; then
    success "OK"
else
    error "ÉCHEC"
    exit 1
fi

echo -n "  Transformers... "
if python3 -c "import transformers; print(f'v{transformers.__version__}')" 2>/dev/null; then
    success "OK"
else
    error "ÉCHEC"
    exit 1
fi

echo -n "  TrOCR Processor... "
if python3 -c "from transformers import TrOCRProcessor; print('OK')" 2>/dev/null; then
    success "OK"
else
    error "ÉCHEC"
    exit 1
fi

echo -n "  OpenCV... "
if python3 -c "import cv2; print(f'v{cv2.__version__}')" 2>/dev/null; then
    success "OK"
else
    error "ÉCHEC"
    exit 1
fi

echo -n "  PIL/Pillow... "
if python3 -c "from PIL import Image; print('OK')" 2>/dev/null; then
    success "OK"
else
    error "ÉCHEC"
    exit 1
fi

echo -n "  NumPy... "
if python3 -c "import numpy; print(f'v{numpy.__version__}')" 2>/dev/null; then
    success "OK"
else
    error "ÉCHEC"
    exit 1
fi

echo -n "  PySpellChecker... "
if python3 -c "from spellchecker import SpellChecker; print('OK')" 2>/dev/null; then
    success "OK"
else
    warning "Non installé (optionnel)"
fi

echo -n "  PyYAML... "
if python3 -c "import yaml; print('OK')" 2>/dev/null; then
    success "OK"
else
    error "ÉCHEC"
    exit 1
fi

# ============================================
# Step 6: Check GPU availability
# ============================================
next_step "Vérification du GPU"

GPU_INFO=$(python3 -c "
import torch
if torch.cuda.is_available():
    print(f'CUDA disponible: {torch.cuda.get_device_name(0)}')
    print(f'Mémoire GPU: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB')
else:
    print('CPU_ONLY')
" 2>/dev/null)

if [[ "$GPU_INFO" == "CPU_ONLY" ]]; then
    warning "Pas de GPU CUDA détecté - mode CPU (plus lent)"
    info "Temps estimé: 30-60 secondes par page"
else
    success "$GPU_INFO"
    info "Temps estimé: 2-5 secondes par page"
fi

# ============================================
# Step 7: Verify project structure
# ============================================
next_step "Vérification de la structure du projet"

MISSING=0

check_file() {
    if [ -f "$1" ]; then
        success "$1"
    else
        error "$1 manquant"
        MISSING=$((MISSING + 1))
    fi
}

check_dir() {
    if [ -d "$1" ]; then
        success "$1/"
    else
        error "$1/ manquant"
        MISSING=$((MISSING + 1))
    fi
}

check_file "extract_journal.py"
check_file "src/htr/pipeline.py"
check_file "src/htr/preprocessing/image_enhancer.py"
check_file "src/htr/segmentation/line_detector.py"
check_file "src/htr/recognition/trocr_engine.py"
check_file "src/htr/postprocessing/text_corrector.py"
check_file "src/htr/training/trainer.py"
check_file "configs/default_config.yaml"
check_file "configs/custom_vocab.txt"
check_dir "data"

if [ $MISSING -gt 0 ]; then
    error "$MISSING fichiers manquants"
    exit 1
fi

# Create data subdirectories if needed
mkdir -p data/raw data/processed data/training data/models
success "Dossiers de données créés/vérifiés"

# ============================================
# Step 8: Test pipeline import
# ============================================
next_step "Test d'import du pipeline HTR"

if python3 -c "
import sys
sys.path.insert(0, 'src')
from htr.pipeline import HTRPipeline
print('Pipeline HTR importé avec succès')
" 2>/dev/null; then
    success "Pipeline HTR prêt à l'emploi"
else
    error "Erreur d'import du pipeline"
    warning "Vérifiez les fichiers dans src/htr/"
    exit 1
fi

# ============================================
# Summary
# ============================================
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Installation Réussie !${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

info "Pour activer l'environnement virtuel:"
echo "  source venv/bin/activate"
echo ""

info "Pour tester sur une image:"
echo "  python extract_journal.py jpg_extract/1.jpg --output data/processed --verbose"
echo ""

info "Pour traiter tout un dossier:"
echo "  python extract_journal.py jpg_extract/ --output data/processed"
echo ""

info "Pour fine-tuner le modèle (après transcription):"
echo "  python -m src.htr.training.trainer data/training/lines/ labels.csv"
echo ""

warning "NOTE: Le premier lancement téléchargera le modèle TrOCR (~1.3 GB)"
echo ""

# Optional: Download model now
read -p "Voulez-vous télécharger le modèle TrOCR maintenant? (o/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Oo]$ ]]; then
    echo -e "${BLUE}Téléchargement du modèle TrOCR (peut prendre quelques minutes)...${NC}"
    python3 -c "
from transformers import TrOCRProcessor, VisionEncoderDecoderModel
print('Téléchargement de TrOCR-base-handwritten...')
processor = TrOCRProcessor.from_pretrained('microsoft/trocr-base-handwritten')
model = VisionEncoderDecoderModel.from_pretrained('microsoft/trocr-base-handwritten')
print('Modèle téléchargé et mis en cache!')
"
    success "Modèle TrOCR téléchargé"
fi

echo ""
success "Setup terminé ! Vous êtes prêt à extraire du texte manuscrit."
