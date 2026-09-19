# UX - Journal de Guerre

_Validé le 16/09/2026_

Usage privé. Objectif : présentation légère, centrée sur la lecture du carnet.

## Arborescence

```txt
Journal de Guerre
│
├── Accueil
│   ├── Photo du carnet
│   ├── 3 lignes : Ernest, le carnet, 1918
│   └── [Lire le carnet]  [Qui était Ernest ?]
│
├── Lire  (le carnet, 1918)
│   ├── Sommaire
│   │   ├── Couverture
│   │   ├── I.   Enseignements            (à confirmer après transcription)
│   │   ├── II.  Journal de dévotion
│   │   └── III. Fin du carnet : couvertures, images pieuses
│   └── Page (x ~200)
│       ├── Image zoomable
│       ├── Texte (diplomatique / normalisé)
│       ├── Date, signature
│       ├── Note de lecture (optionnelle)
│       ├── [Corriger]  (compte autorisé)
│       └── < précédente | suivante >
│
├── Ernest
│   ├── Qui était-il
│   ├── 1918 : captivité, camp de Munster
│   ├── 1940 : la déclaration (lien vers Documents)
│   ├── Frise (dates réelles uniquement)
│   └── Provenance du carnet (mémoire familiale)
│
├── Documents
│   ├── Déclaration militaire (39-45)
│   │   ├── Image zoomable
│   │   ├── Transcription
│   │   └── Contexte (Dunkerque 1940, à vérifier)
│   └── (futurs : photos, lettres, fiche matricule...)
│
└── Explorer  (secondaire, après transcription)
    ├── Recherche
    ├── Glossaire (R.E., Bonne action, Demander...)
    └── Thèmes
```

Menu : Lire, Ernest, Documents, Explorer.

## Décisions

- Lettre 39-45 (IMG_0508) : document séparé dans "Documents", hors du fil de lecture du carnet, liée depuis "Ernest".
- Doublons : IMG_0508 = IMG_0509 (lettre), IMG_0510 = IMG_0511 (image pieuse). Garder la meilleure photo.
- Mode lecture v1 (modale) devient l'écran principal "Lire". Galerie fusionnée dedans.
- Correction directe dans la page (compte autorisé), pas de relecture en amont.

## Audit v1 : ce qui disparaît

| Section v1 | Décision |
|---|---|
| En-tête (dates 1911-1918, compteurs) | Réécrire : titre, 1 phrase, photo, bouton Lire |
| Résumé + points clés | Réécrire en 3-5 lignes vérifiées |
| Contexte historique (3 cartes) | Déplacer vers "Ernest", raccourcir, sourcer, ajouter captivité/Munster |
| Chronologie 1911-1918 | Supprimer, refaire depuis les dates réelles |
| Le Journal (3 parties) | Garder l'idée comme sommaire, à revoir après transcription |
| Structure type d'une entrée | Garder avec un vrai extrait (guide de lecture) |
| Transcriptions (8 cartes) | Supprimer (texte généré), remplacé par "Lire" |
| Analyse et graphe, statistiques | Supprimer |
| Thèmes majeurs | Déplacer vers "Explorer", à valider |
| Galerie | Fusionner dans "Lire" |
| Valeur patrimoniale, citation 1917, expert | Supprimer |
| Page Lettre militaire | Devient fiche dans "Documents" |
| Pied de page (liens .md) | Simplifier |

## Règles éditoriales

1. Rien sans source : carnet, document ou mémoire familiale, et on dit laquelle.
2. Aucun chiffre ni citation qui ne vienne du texte corrigé.
3. En cas de doute : "à vérifier", jamais inventer.
4. Textes courts : 5 lignes max par bloc.

## Prochaines étapes

- [ ] Recueillir ce que Fred sait d'Ernest et de la provenance du carnet
- [ ] Maquettes (2-3 variantes) sur canevas de design, validation par annotations
- [ ] Rédaction des textes d'accompagnement (Accueil, Ernest, Documents)
