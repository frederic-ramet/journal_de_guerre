# Journal de Guerre - Ramet Ernest (1918)

## Version 2.0 - Architecture à 3 espaces

Application web pour la préservation, la lecture et l'analyse d'un journal de prisonnier de guerre français.

### 🏛️ Les 3 Espaces

1. **📖 Journal** - Lecture immersive
   - Visionneuse plein écran avec zoom
   - Navigation par miniatures
   - Mode nuit
   - Transcriptions annotées

2. **🗄️ Archives** - Préservation et édition
   - Outils de manipulation d'image (rotation, luminosité, contraste)
   - Éditeur de transcription avec formatage HTML
   - Système de validation (brouillon → vérifié → validé)
   - Annotations et notes du transcripteur

3. **🔬 Étude** - Analyse et contexte
   - Contexte historique (WWI, camp de Munster)
   - Recherche textuelle dans les transcriptions
   - Thèmes et entités référencés
   - Chronologie interactive

---

## 🚀 Installation

### Prérequis
- Node.js 18+
- npm

### Setup

```bash
# Installer les dépendances
npm install

# Initialiser la base de données SQLite
npm run init-db

# Migrer les données existantes
npm run migrate

# Lancer le serveur de développement
npm start
```

Le serveur démarre sur `http://localhost:3000`

---

## 📁 Structure du Projet

```
journal_de_guerre/
├── server.js                 # Serveur Express principal
├── package.json              # Configuration Node.js
├── vercel.json              # Configuration Vercel
├── data/
│   └── journal.db           # Base de données SQLite (gitignored)
├── scripts/
│   ├── init-database.js     # Initialisation BDD
│   ├── migrate-data.js      # Migration des données
│   └── build-static.js      # Build statique pour Vercel
├── src/
│   ├── routes/              # Routes Express
│   │   ├── index.js         # Page d'accueil
│   │   ├── journal.js       # Espace Journal
│   │   ├── archives.js      # Espace Archives
│   │   ├── etude.js         # Espace Étude
│   │   └── api.js           # API REST
│   ├── views/               # Templates EJS
│   │   ├── partials/        # Header, Nav, Footer
│   │   ├── journal/         # Vues Journal
│   │   ├── archives/        # Vues Archives
│   │   └── etude/           # Vues Étude
│   └── public/              # Assets statiques
│       ├── css/             # Styles modulaires
│       └── js/              # Scripts par espace
├── jpg_web/                 # Images du journal (103 pages)
└── dist/                    # Build statique (gitignored)
```

---

## 🛠️ Commandes

```bash
# Développement
npm start                    # Lancer le serveur (port 3000)
npm run dev                  # Mode développement avec nodemon

# Base de données
npm run init-db              # Créer les tables
npm run migrate              # Importer les transcriptions

# Production
npm run build                # Générer la version statique
```

---

## 🌐 Déploiement Vercel

1. **Build local** (pour édition)
   ```bash
   npm run init-db
   npm run migrate
   npm start
   # Éditer les transcriptions...
   ```

2. **Build statique**
   ```bash
   npm run build
   # Génère le dossier dist/
   ```

3. **Déployer**
   - Push vers GitHub
   - Vercel détecte automatiquement le `vercel.json`
   - Build command: `npm run build`
   - Output directory: `dist`

**Note** : Le mode édition n'est pas disponible en version statique.
Utilisez le serveur local pour les modifications.

---

## 📊 Base de Données

### Tables principales

- **pages** : Métadonnées des 103 pages
- **transcriptions** : Contenu texte (HTML et plain)
- **annotations** : Annotations visuelles
- **image_adjustments** : Paramètres d'image (rotation, etc.)
- **entities** : Personnes, lieux, concepts
- **themes** : Tags thématiques

### API REST

```
GET  /api/pages              # Liste des pages
GET  /api/pages/:id          # Page spécifique
PUT  /api/transcriptions/:id # Mettre à jour transcription
PUT  /api/adjustments/:id    # Sauvegarder ajustements image
POST /api/annotations        # Ajouter annotation
GET  /api/export             # Exporter tout en JSON
GET  /api/stats              # Statistiques
```

---

## 📜 Contexte Historique

**Auteur** : Ramet Ernest
**Période** : Juin 1918
**Lieu** : Camp de prisonniers de Munster, Westphalie (Allemagne)
**Contenu** : 103 pages de réflexions spirituelles mêlant spiritisme et foi chrétienne

Le journal documente l'évolution spirituelle d'un soldat français prisonnier pendant la Première Guerre mondiale. Il recopie ses notes antérieures (1911-1917) en les préservant pour la postérité.

---

## 🎨 Technologies

- **Backend** : Express.js, EJS templates
- **Database** : SQLite (better-sqlite3)
- **Frontend** : Vanilla JS, CSS variables
- **Build** : Script Node.js custom
- **Deploy** : Vercel (static)

---

## 📄 Licence

MIT License - Projet de préservation du patrimoine historique
