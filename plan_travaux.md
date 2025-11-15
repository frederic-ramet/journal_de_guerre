# Plan de Travaux - Extraction de Texte Manuscrit Local

## Analyse des Images

**Caractéristiques identifiées :**
- Écriture cursive française ancienne (1911-1916)
- Papier jauni avec lignes de cahier
- Encre décolorée (gris/brun)
- Pages doubles (2 colonnes sur certaines images)
- Résolution variable (154KB à 5.3MB)

**Pourquoi Ollama/LLaVA échoue :**
- Modèles vision généralistes, non optimisés pour OCR
- Pas d'entraînement spécifique sur écriture manuscrite
- Incapables de suivre les lignes cursives connectées
- Vocabulaire français ancien mal géré

---

## STRATÉGIE RECOMMANDÉE : Pipeline HTR Hybride

### Phase 1 : Pré-traitement des Images (Critique)

**Objectif** : Améliorer la lisibilité avant reconnaissance

```python
# Outils recommandés
pip install opencv-python scikit-image pillow

# Pipeline de pré-traitement
1. Détection et correction de la rotation (deskewing)
2. Binarisation adaptative (Otsu + Sauvola)
3. Suppression du bruit (morphologie mathématique)
4. Amélioration du contraste (CLAHE)
5. Segmentation des pages (détecter 2 colonnes)
6. Segmentation des lignes (projection horizontale)
```

**Code estimé** : ~200 lignes Python

---

### Phase 2 : Moteur HTR Principal

#### Option A : TrOCR (Recommandé - Meilleur rapport qualité/effort)

**Pourquoi TrOCR :**
- Modèle Transformer encoder-decoder (Microsoft)
- Pré-entraîné sur texte manuscrit
- Fine-tunable sur votre corpus
- Fonctionne en local sur GPU/CPU

```bash
pip install transformers torch torchvision
```

**Modèles disponibles :**
- `microsoft/trocr-base-handwritten` - Base (334M params)
- `microsoft/trocr-large-handwritten` - Large (558M params)

**Avantages :**
- Excellent sur cursive
- Supporte le français après fine-tuning
- API simple (Hugging Face)
- GPU : ~2-5 sec/page | CPU : ~30-60 sec/page

**Inconvénients :**
- Nécessite segmentation ligne par ligne
- Fine-tuning recommandé pour français ancien

---

#### Option B : Kraken/eScriptorium (Spécialisé HTR historique)

**Pourquoi Kraken :**
- Conçu spécifiquement pour documents historiques
- Modèles pré-entraînés pour français ancien
- Segmentation automatique intégrée
- Utilisé par BnF et archives nationales

```bash
pip install kraken
# Télécharger modèle français
kraken get 10.5281/zenodo.2577813
```

**Modèles recommandés :**
- `fr_cursive_19c.mlmodel` - Cursive française 19e siècle
- `cremma-medieval` - Manuscrits médiévaux/anciens

**Avantages :**
- Pipeline complet (segmentation + OCR)
- Modèles historiques prêts à l'emploi
- Fine-tuning avec peu de données (~50 pages)
- Interface web (eScriptorium) disponible

**Inconvénients :**
- Moins flexible que TrOCR
- Documentation parfois sparse

---

#### Option C : PaddleOCR (Rapide, multilingue)

```bash
pip install paddlepaddle paddleocr
```

**Avantages :**
- Très rapide (optimisé production)
- Détection + reconnaissance intégrées
- Support français natif

**Inconvénients :**
- Moins bon sur cursive ancienne
- Optimisé pour imprimé moderne

---

### Phase 3 : Fine-tuning (Amélioration Majeure)

**Approche recommandée : Few-shot learning avec TrOCR**

#### Étape 1 : Création du Dataset d'Entraînement

**Données nécessaires :**
- 20-50 lignes transcrites manuellement (minimum)
- 100-200 lignes pour résultats optimaux
- Format : image de ligne + transcription

**Structure :**
```
training_data/
├── images/
│   ├── line_001.jpg
│   ├── line_002.jpg
│   └── ...
└── labels.csv
    # image_path,transcription
    # line_001.jpg,"Carnet Appartenant"
    # line_002.jpg,"à Ramet Ernest"
```

**Outil de création :**
```python
# Script de segmentation semi-automatique
1. Détection automatique des lignes
2. Interface pour corriger/valider
3. Transcription manuelle assistée
4. Export format entraînement
```

#### Étape 2 : Fine-tuning TrOCR

```python
from transformers import TrOCRProcessor, VisionEncoderDecoderModel
from transformers import Seq2SeqTrainer, Seq2SeqTrainingArguments

# Charger modèle pré-entraîné
processor = TrOCRProcessor.from_pretrained('microsoft/trocr-base-handwritten')
model = VisionEncoderDecoderModel.from_pretrained('microsoft/trocr-base-handwritten')

# Configuration fine-tuning
training_args = Seq2SeqTrainingArguments(
    output_dir="./trocr-journal",
    num_train_epochs=10,
    per_device_train_batch_size=8,
    learning_rate=5e-5,
    fp16=True,  # Si GPU disponible
)

# Entraînement
trainer = Seq2SeqTrainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
)
trainer.train()
```

**Temps estimé :**
- Transcription manuelle : 2-4 heures pour 100 lignes
- Fine-tuning : 1-2 heures sur GPU (NVIDIA GTX 1080+)
- Fine-tuning CPU : 8-12 heures

---

### Phase 4 : Post-traitement Intelligent

#### 4.1 Correction orthographique contextuelle

```python
# Outils
pip install pyspellchecker language-tool-python

# Pipeline
1. Détection des mots mal reconnus
2. Correction basée sur dictionnaire français 1900
3. Modèle de langage pour contexte (GPT-2 français local)
4. Règles spécifiques (dates, noms propres)
```

#### 4.2 Dictionnaire personnalisé

```python
# Mots fréquents dans le journal
custom_vocab = {
    "spiritisme", "incarnation", "désincarnation",
    "réincarnation", "exhilaration", "esprit",
    "Ramet", "Ernest", "Montpellier"
}

# Regex pour dates
date_pattern = r"le \d{1,2}[-/]\d{1,2}[-/]\d{2,4}"
```

#### 4.3 Modèle de langage local (optionnel)

```bash
# GPT-2 français pour correction contextuelle
pip install transformers
# Modèle : "ClassCat/gpt2-base-french"
```

---

## PLAN D'IMPLÉMENTATION

### Sprint 1 : Infrastructure (2-3 jours)

**Tâches :**
1. [ ] Installer dépendances (TrOCR, OpenCV, etc.)
2. [ ] Créer pipeline pré-traitement images
3. [ ] Tester TrOCR de base sur images brutes
4. [ ] Comparer avec Kraken (modèle français)
5. [ ] Choisir moteur principal

**Livrables :**
- Script `preprocessing.py`
- Script `baseline_ocr.py`
- Rapport comparatif des moteurs

---

### Sprint 2 : Segmentation (2-3 jours)

**Tâches :**
1. [ ] Détecter pages doubles vs simples
2. [ ] Segmenter colonnes automatiquement
3. [ ] Extraire lignes individuelles
4. [ ] Créer interface validation manuelle
5. [ ] Exporter dataset structuré

**Livrables :**
- Script `line_segmentation.py`
- Interface web simple (Streamlit) pour validation
- Dataset de 100+ lignes segmentées

---

### Sprint 3 : Fine-tuning (3-5 jours)

**Tâches :**
1. [ ] Transcrire 50-100 lignes manuellement
2. [ ] Préparer dataset format HuggingFace
3. [ ] Fine-tuner TrOCR sur corpus
4. [ ] Évaluer précision (CER, WER)
5. [ ] Itérer si nécessaire

**Livrables :**
- Modèle fine-tuné `trocr-journal-guerre`
- Métriques : CER < 10%, WER < 20%
- Script `train_model.py`

---

### Sprint 4 : Post-traitement (2-3 jours)

**Tâches :**
1. [ ] Implémenter correction orthographique
2. [ ] Créer dictionnaire personnalisé
3. [ ] Ajouter détection dates/noms
4. [ ] Pipeline complet bout-en-bout
5. [ ] Interface utilisateur finale

**Livrables :**
- Script `postprocessing.py`
- Pipeline complet `extract_journal.py`
- Documentation utilisateur

---

### Sprint 5 : Optimisation (2-3 jours)

**Tâches :**
1. [ ] Parallélisation traitement
2. [ ] Cache des résultats intermédiaires
3. [ ] Mode batch optimisé
4. [ ] Gestion erreurs robuste
5. [ ] Tests sur corpus complet

**Livrables :**
- Version production du pipeline
- Rapport qualité final
- Guide maintenance

---

## RESSOURCES MATÉRIELLES

### Configuration Minimum
- **CPU** : 4+ cores (Intel i5/Ryzen 5)
- **RAM** : 8GB minimum (16GB recommandé)
- **Stockage** : 10GB libre
- **GPU** : Optionnel mais recommandé

### Configuration Optimale
- **GPU** : NVIDIA GTX 1080 / RTX 3060 (8GB+ VRAM)
- **RAM** : 16-32GB
- **SSD** : Pour I/O rapide

### Temps de Traitement Estimé

| Moteur | CPU (par page) | GPU (par page) |
|--------|----------------|----------------|
| TrOCR Base | 30-60s | 2-5s |
| TrOCR Large | 60-120s | 5-10s |
| Kraken | 20-40s | 10-15s |
| PaddleOCR | 5-15s | 1-3s |

**Pour 103 pages (IMG_0410-0512) :**
- GPU : 3-17 minutes
- CPU : 30 minutes - 2 heures

---

## MÉTRIQUES DE SUCCÈS

### Character Error Rate (CER)
- **Baseline (LLaVA)** : ~40-60%
- **Objectif Phase 1** : < 25%
- **Objectif Final** : < 10%

### Word Error Rate (WER)
- **Baseline** : ~50-70%
- **Objectif Phase 1** : < 35%
- **Objectif Final** : < 20%

### Critères Qualitatifs
- [ ] Dates correctement reconnues (100%)
- [ ] Noms propres identifiés (>90%)
- [ ] Structure paragraphes préservée
- [ ] Pas de hallucinations (texte inventé)

---

## ALTERNATIVES EXPLORÉES

### Pourquoi PAS ces solutions :

**1. Tesseract OCR**
- Mauvais sur cursive manuscrite
- Conçu pour texte imprimé
- Pas de modèle français cursif ancien

**2. Google Cloud Vision / AWS Textract**
- Coûteux à grande échelle
- Données sensibles sur cloud
- Pas meilleur que solutions locales pour HTR

**3. EasyOCR**
- Bon pour imprimé moderne
- Faible sur cursive historique
- Pas de fine-tuning facile

**4. GPT-4 Vision / Claude Vision**
- Très coûteux (0.01-0.03$/image)
- 103 pages = 1-3$ minimum
- Pas de garantie de cohérence

---

## PROCHAINES ÉTAPES IMMÉDIATES

1. **Aujourd'hui** : Installer TrOCR et tester sur images existantes
2. **Demain** : Créer pipeline pré-traitement
3. **Cette semaine** : Segmenter 50 lignes et transcrire
4. **Semaine prochaine** : Fine-tuning et évaluation

**Commande de démarrage :**
```bash
# Créer environnement
python -m venv venv_htr
source venv_htr/bin/activate

# Installer dépendances
pip install torch torchvision transformers
pip install opencv-python scikit-image pillow
pip install datasets evaluate

# Test rapide
python -c "from transformers import TrOCRProcessor; print('TrOCR OK')"
```

---

## ESTIMATION EFFORT TOTAL

| Phase | Temps Dev | Temps Machine |
|-------|-----------|---------------|
| Infrastructure | 2-3 jours | 1h |
| Segmentation | 2-3 jours | 2h |
| Fine-tuning | 3-5 jours | 8-12h |
| Post-traitement | 2-3 jours | 1h |
| Optimisation | 2-3 jours | 4h |
| **TOTAL** | **11-17 jours** | **~16h** |

**Note** : Le temps de transcription manuelle (50-100 lignes) est le goulot d'étranglement principal (~4-6 heures de travail humain).

---

## CONCLUSION

**Recommandation finale** : Pipeline TrOCR + Fine-tuning

Cette approche offre :
- Meilleure précision pour cursive française
- Contrôle total (local, pas de coûts récurrents)
- Amélioration continue possible
- Modèle réutilisable pour autres documents similaires

Le fine-tuning sur 50-100 lignes transcrites manuellement devrait réduire le taux d'erreur de 40-60% à moins de 10%, rendant le texte exploitable pour recherche et analyse.
