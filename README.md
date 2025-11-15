# Journal de Guerre - HTR Text Extraction System

Système d'extraction de texte manuscrit français basé sur le Machine Learning, utilisant TrOCR pour la reconnaissance d'écriture manuscrite (HTR - Handwritten Text Recognition).

## Fonctionnalités

- **Extraction ML locale** : Utilise TrOCR (Microsoft) pour la reconnaissance de texte manuscrit
- **Pipeline complet** : Prétraitement, segmentation, reconnaissance, post-traitement
- **Fine-tuning** : Personnalisation du modèle sur votre corpus spécifique
- **100% local** : Aucun coût cloud récurrent, confidentialité des données
- **Optimisé français ancien** : Dictionnaire personnalisé et correction orthographique

## Architecture

```
journal_de_guerre/
├── src/
│   ├── htr/                          # Pipeline HTR principal
│   │   ├── preprocessing/            # Amélioration d'images
│   │   ├── segmentation/             # Détection de lignes
│   │   ├── recognition/              # Moteur TrOCR
│   │   ├── postprocessing/           # Correction de texte
│   │   ├── training/                 # Fine-tuning du modèle
│   │   ├── utils/                    # Utilitaires
│   │   └── pipeline.py               # Orchestration
│   ├── interface/                    # Interface web (legacy)
│   └── extract_text.py               # Script legacy (Ollama/Claude)
├── configs/                          # Configuration YAML
├── data/
│   ├── raw/                          # Images sources
│   ├── processed/                    # Résultats intermédiaires
│   ├── training/                     # Données d'entraînement
│   └── models/                       # Modèles fine-tunés
└── extract_journal.py                # Point d'entrée principal
```

## Installation

### 1. Créer l'environnement virtuel

```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate     # Windows
```

### 2. Installer les dépendances

```bash
pip install -r requirements.txt
```

### 3. Vérifier l'installation

```bash
python -c "from transformers import TrOCRProcessor; print('TrOCR OK')"
python -c "import cv2; print('OpenCV OK')"
python -c "import torch; print(f'PyTorch OK - CUDA: {torch.cuda.is_available()}')"
```

## Utilisation

### Extraction rapide (une image)

```bash
python extract_journal.py jpg_extract/1.jpg --output data/processed
```

### Traitement par lot (dossier complet)

```bash
python extract_journal.py jpg_extract/ --output data/processed
```

### Avec configuration personnalisée

```bash
python extract_journal.py jpg_extract/ --config configs/default_config.yaml --verbose
```

## Pipeline de Traitement

Le système applique 4 étapes automatiquement :

### 1. Prétraitement d'image
- Conversion en niveaux de gris
- Amélioration du contraste (CLAHE)
- Débruitage
- Correction de l'inclinaison (deskewing)
- Binarisation adaptative (Sauvola)
- Suppression des bordures

### 2. Segmentation des lignes
- Détection automatique des colonnes (pages doubles)
- Extraction des lignes par profil de projection horizontal
- Filtrage du bruit
- Sauvegarde individuelle de chaque ligne

### 3. Reconnaissance TrOCR
- Modèle pré-entraîné sur texte manuscrit
- Support GPU et CPU
- Génération par beam search
- Batch processing optimisé

### 4. Post-traitement
- Correction orthographique (pyspellchecker)
- Dictionnaire personnalisé français ancien
- Normalisation des dates
- Nettoyage des artefacts OCR

## Configuration

Éditez `configs/default_config.yaml` :

```yaml
recognition:
  model_name: "base"              # base, large, small
  custom_model_path: null         # Chemin vers modèle fine-tuné
  device: null                    # null (auto), "cuda", "cpu"

preprocessing:
  binarization_method: "sauvola"  # otsu, sauvola, adaptive
  deskew_enabled: true

postprocessing:
  use_spell_checker: true
  custom_vocabulary_file: "configs/custom_vocab.txt"
```

## Fine-tuning (Amélioration des résultats)

### 1. Préparer le dataset

Créez un fichier CSV avec les transcriptions :

```csv
image_path,transcription
line_0001.png,Carnet Appartenant
line_0002.png,à Ramet Ernest
line_0003.png,Étude
```

### 2. Lancer l'entraînement

```bash
python -m src.htr.training.trainer \
  data/training/lines/ \
  data/training/labels.csv \
  --output data/models/trocr-journal \
  --epochs 10 \
  --batch-size 8
```

### 3. Utiliser le modèle fine-tuné

```yaml
# configs/default_config.yaml
recognition:
  custom_model_path: "data/models/trocr-journal/final"
```

## Performance

| Configuration | Temps/page | Précision attendue |
|--------------|------------|-------------------|
| CPU (base)   | 30-60s     | CER ~15-25%       |
| GPU (base)   | 2-5s       | CER ~15-25%       |
| GPU (fine-tuné) | 2-5s    | CER ~5-10%        |

## Vocabulaire Personnalisé

Ajoutez des mots dans `configs/custom_vocab.txt` :

```
# Noms propres
Ramet
Ernest
Montpellier

# Termes spécifiques
spiritisme
réincarnation
```

## Structure des Résultats

```
data/processed/
├── IMG_0410_preprocessed.png     # Image prétraitée
├── IMG_0410_lines/               # Lignes segmentées
│   ├── line_0000_col0.png
│   ├── line_0001_col0.png
│   └── ...
├── IMG_0410_raw.txt              # Texte brut reconnu
├── IMG_0410_corrected.txt        # Texte corrigé
├── combined_journal.txt          # Toutes les pages combinées
└── processing_stats.json         # Statistiques
```

## Métriques

- **CER** (Character Error Rate) : Taux d'erreur au niveau caractère
- **WER** (Word Error Rate) : Taux d'erreur au niveau mot

Objectifs :
- Baseline TrOCR : CER < 25%
- Après fine-tuning : CER < 10%

## Dépannage

### Modèle lent sur CPU
```yaml
recognition:
  model_name: "small"  # Plus léger mais moins précis
```

### Mémoire GPU insuffisante
```yaml
recognition:
  device: "cpu"
training:
  batch_size: 4
  fp16: false
```

### Mauvaise segmentation des lignes
```yaml
segmentation:
  horizontal_projection_threshold: 0.03  # Réduire si lignes manquantes
  vertical_gap_threshold: 15              # Augmenter si lignes fusionnées
```

## Legacy (Ollama/Claude)

L'ancien système basé sur LLM généraliste est conservé dans `src/extract_text.py` :

```bash
# Avec Ollama (déconseillé pour manuscrit)
python src/extract_text.py jpg/ --provider ollama

# Avec Claude Vision (coûteux)
python src/extract_text.py jpg/ --provider anthropic --api-key YOUR_KEY
```

## Prochaines étapes

1. **Transcrire 50-100 lignes** manuellement pour fine-tuning
2. **Entraîner le modèle** sur votre corpus
3. **Évaluer et itérer** jusqu'à CER < 10%
4. **Traiter le journal complet** (103 pages)

## Ressources

- [TrOCR Paper](https://arxiv.org/abs/2109.10282)
- [Hugging Face TrOCR](https://huggingface.co/microsoft/trocr-base-handwritten)
- [OpenCV Documentation](https://docs.opencv.org/)

## Licence

MIT License
