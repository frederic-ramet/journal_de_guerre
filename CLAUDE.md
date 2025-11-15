# CLAUDE.md - Journal de Guerre Project Guide

## Project Overview
ML-based Handwritten Text Recognition (HTR) system for extracting content from scanned historical French journal images. Uses TrOCR (Transformer-based OCR) with fine-tuning capabilities for optimal results on cursive French handwriting.

## File Structure
```
journal_de_guerre/
├── src/
│   ├── htr/                       # Main HTR pipeline
│   │   ├── preprocessing/         # Image enhancement (OpenCV)
│   │   ├── segmentation/          # Line detection
│   │   ├── recognition/           # TrOCR engine
│   │   ├── postprocessing/        # Spell checking, cleanup
│   │   ├── training/              # Fine-tuning utilities
│   │   └── pipeline.py            # Main orchestrator
│   ├── interface/                 # Streamlit web interface (legacy)
│   └── extract_text.py            # Legacy LLM-based extraction
├── configs/                       # YAML configuration files
├── data/
│   ├── raw/                       # Input images
│   ├── processed/                 # Pipeline outputs
│   ├── training/                  # Training datasets
│   └── models/                    # Fine-tuned models
├── jpg_extract/                   # Sample images
└── extract_journal.py             # Main entry point
```

## Project Setup
```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Verify installation
python -c "from transformers import TrOCRProcessor; print('OK')"
```

## Development Commands
```bash
# Run HTR pipeline on folder
python extract_journal.py jpg_extract/ --output data/processed

# Single image processing
python extract_journal.py jpg_extract/1.jpg --verbose

# With custom config
python extract_journal.py jpg_extract/ --config configs/default_config.yaml

# Fine-tune model
python -m src.htr.training.trainer data/training/lines/ data/training/labels.csv

# Run tests
pytest tests/  # Not yet implemented
```

## Key Components

### 1. Image Preprocessing (`src/htr/preprocessing/`)
- Grayscale conversion
- CLAHE contrast enhancement
- Sauvola binarization for historical documents
- Automatic deskewing
- Border removal

### 2. Line Segmentation (`src/htr/segmentation/`)
- Column detection for double pages
- Horizontal projection profile analysis
- Individual line extraction
- Noise filtering

### 3. TrOCR Recognition (`src/htr/recognition/`)
- Microsoft TrOCR models (base/large/small)
- GPU/CPU support with auto-detection
- Beam search decoding
- Batch processing

### 4. Post-processing (`src/htr/postprocessing/`)
- French spell checking (pyspellchecker)
- Custom vocabulary for historical terms
- Date normalization
- OCR artifact cleanup

### 5. Training (`src/htr/training/`)
- Fine-tuning on custom datasets
- Metrics: CER (Character Error Rate), WER (Word Error Rate)
- Dataset preparation utilities

## Coding Guidelines
- Python 3.8+ with type hints
- Follow PEP 8 style guidelines
- Use dataclasses for structured data
- Comprehensive logging at DEBUG/INFO levels
- Configuration via YAML files
- Modular architecture with clear separation of concerns
- Error handling with retry logic where appropriate
- Document all public methods with docstrings

## Configuration
Main config: `configs/default_config.yaml`
Custom vocabulary: `configs/custom_vocab.txt`

## Performance Targets
- Baseline TrOCR: CER < 25%, WER < 40%
- After fine-tuning: CER < 10%, WER < 20%
- Processing speed: 2-5s/page (GPU), 30-60s/page (CPU)

## Version Control
- Organize commits by logical changes (preprocessing, recognition, etc.)
- Write clear commit messages describing architectural changes
- Keep legacy code for backward compatibility
- Document breaking changes in README
