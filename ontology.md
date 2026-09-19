# Ontologie du carnet

_Plan de travail. Rédigé le 19/09/2026. À exécuter après la relecture des transcriptions._

## Principe

L'ontologie est **dérivée du texte, jamais saisie à la main**. Elle se recalcule intégralement depuis `transcription/pages/*.md`. Si elle diverge du texte, c'est le texte qui a raison.

Ce qui existait dans la v2 est à jeter : une liste d'entités écrite à la main dans `data/ontology.json`, recherchée par mots-clés, produisant un graphe générique (Dieu, Cœur, Prière) qui n'apprenait rien.

## Ce qu'on extrait

Quatre types, pas davantage.

| Type | Exemples | Utilité |
|---|---|---|
| `personnes` | Georges Lété, Normand Toussaint, Guilbert Abel, Camille, « un Russe », « l'Allemand » | reconstituer le groupe du dimanche et le quotidien du camp |
| `lieux` | Westphalie, Étaples, Dunkerque, Ramsgate, Plymouth, Brest | situer, et alimenter la carte s'il y en a une |
| `themes` | orgueil, rire, aumône, charité, colère, mort, prière, libre arbitre | relier des leçons séparées de plusieurs mois |
| `sources` | Voltaire, Descartes, saint François, Évangile de Luc | montrer ce qui circulait au camp |

**Exclu** : « Dieu » (240 occurrences, aucune valeur discriminante), « esprit », « bien », « mal ». Une entité qui apparaît partout ne sert à rien.

## Les six étapes

### 1. Fiabiliser le texte

Préalable non négociable. Extraire d'un texte à 363 `[?]` produit du bruit.

- passe de relecture des pages à forte incertitude (Opus, zoom sur les lignes contenant un `[?]`) ;
- trancher les quinze doublons photographiques, sinon chaque entité est comptée deux fois ;
- statut `corrige` ou `ia-relu` sur l'ensemble.

### 2. Figer le vocabulaire

Écrire `transcription/ontologie-schema.json` : la liste des quatre types, et pour chacun les règles de normalisation (casse, accents, alias connus). Court, une page.

### 3. Extraire, page par page

Un passage sur les 196 pages, même méthode que la transcription : `scripts/extract_entities.sh`, un appel `claude -p` par page, lots de 10, reprise possible.

Consigne du prompt :

> Ne relève que ce qui est explicitement écrit sur cette page. Pour chaque entité, donne la forme exacte telle qu'écrite et la phrase qui la porte. N'infère rien : si le texte dit « mon camarade » sans le nommer, l'entité est « camarade non nommé ». Ignore Dieu, Jésus, l'esprit, le bien et le mal.

Sortie ajoutée au front matter du `.md` de la page :

```yaml
entites:
  personnes:
    - nom: "Georges Lété"
      forme: "Gorge Leté"
      extrait: "Gorge Leté nous donnera les explications sur la science de l'espéritisme"
  lieux: []
  themes: ["espéritisme", "amitié"]
  sources: []
```

Écriture atomique et garde d'empreinte, comme pour la transcription. Ne jamais toucher aux sections de texte.

### 4. Consolider

`scripts/build_ontology.js` agrège les 196 fichiers et produit `transcription/entites.json` :

```json
{
  "personnes": [{
    "id": "p-lete",
    "nom": "Georges Lété",
    "formes": ["Gorge Leté", "George", "Georges Lété"],
    "pages": ["IMG_0418_a", "IMG_0432_a", "IMG_0482_a", "IMG_0482_b"],
    "premiere": "1918-06-18",
    "derniere": "1918-11-18"
  }]
}
```

Le script rapproche les variantes par distance de Levenshtein et par cooccurrence, mais ne décide pas seul : il produit un fichier de fusions proposées, à valider.

### 5. Valider à la main

Frédéric relit la liste consolidée, environ une heure : supprimer le bruit, fusionner les alias, corriger les rattachements. La liste validée fait foi, et un champ `valide: true` la protège des recalculs.

### 6. Exposer, et seulement ce qui sert

- **Sur une page** : les entités citées, cliquables, sous le texte.
- **Fiche d'entité** : « Georges Lété, cité sur 7 pages, du 18 juin au 18 novembre 1918 », avec les extraits et les liens vers les pages.
- **Frise** : les dates du front matter, qui montrent le rythme d'écriture s'effondrer (39 entrées datées en juin, 2 en novembre).
- **Graphe** : seulement si l'étape 5 révèle quelque chose d'invisible autrement, par exemple des camarades qui apparaissent par vagues. Sinon, pas de graphe.

## Technique

| Sujet | Décision |
|---|---|
| Stockage | dans le front matter des `.md` (dérivé mais versionné, donc lisible dans l'historique git) |
| Consolidation | `transcription/entites.json`, régénérable, commité |
| Index | table SQLite reconstruite au boot depuis les `.md`, jamais source de vérité |
| Recherche | SQLite FTS5 sur les deux versions du texte, filtres par entité et par période |
| Recalcul | `npm run ontology` : extraction (si `--full`), consolidation, puis index |
| Modèle | Sonnet pour l'extraction, elle est répétitive ; Opus pour les pages litigieuses |
| Coût | un passage complet, même ordre de grandeur que la transcription |

## Ce qu'on ne fait pas

- Pas d'embeddings ni de base vectorielle : 24 000 mots, la recherche plein texte suffit.
- Pas de graphe de connaissances pour l'esthétique.
- Pas d'entités inventées pour étoffer une page.
