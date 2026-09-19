# Spec du site - Carnet d'Ernest Ramet

_19/09/2026. Destinataire : Claude Code. Lire aussi `stack.md`, `ux.md`, `transcription/synthese.md`._

## 1. Objectif

Un site privé, pour Frédéric et sa famille, qui permet de lire le carnet de son arrière-grand-père Ernest Ramet (196 pages, 1918-1919) en regard des images originales, et de corriger les transcriptions au fil de la lecture.

Public : la famille, pas le grand public. Pas de SEO, pas d'analytics, pas de partage social.

Ton : sobre, documentaire, jamais grandiloquent. Rien n'est affirmé sans source.

## 2. Stack imposée

- **Astro** en mode serveur (adaptateur Node), TypeScript.
- **Aucune** dépendance à Supabase, Vercel, Dokploy.
- **SQLite** (better-sqlite3) pour l'accessoire uniquement : index de recherche, notes de lecture. Perdre ce fichier ne doit rien perdre d'essentiel.
- **Git fait foi** : les `.md` de `transcription/pages/` sont la source de vérité. Le site les lit à chaud, sans rebuild.
- **OpenSeadragon** pour le zoom, tuiles DZI générées par libvips.
- Un seul conteneur Docker, `docker compose up`.

## 3. Données

### Source

`transcription/pages/IMG_XXXX_[ab].md`, 196 fichiers. Front matter :

```yaml
id: IMG_0450_b
source: IMG_0450_b.jpg
type: journal | lecon | priere | examen_conscience | liste_bonnes_actions | ...
date: 1918-08-23        # ou null, ou intervalle "1918-06-21/22"
lieu: null
signature: "R.E."       # ou null
statut: ia | ia-relu | verifie_claude | corrige
incertitudes: 3
doublon: IMG_0451_b.jpg # optionnel
```

Puis trois sections : `## Diplomatique` (bloc de code, lignes d'origine, `[?]` sur les passages douteux), `## Normalisé`, `## Notes`.

### Index au démarrage

Au boot, parcourir les fichiers, construire l'index en mémoire et dans SQLite (FTS5) :

- ordre de lecture = ordre des identifiants ;
- numéro de page affiché = rang dans cet ordre (1 à 196) ;
- champs dérivés : date normalisée, période (`journal de camp` jusqu'à IMG_0440, `enseignement` ensuite, voir §6), nombre de `[?]`, doublon éventuel ;
- surveiller le dossier (chokidar) pour recharger à chaud quand un fichier change.

### Images

- `jpg_pages/*.jpg`, 196 fichiers, ~460 Mo, hors git, montés en volume.
- Tuiles DZI générées une fois par un script `scripts/tiles.js` (libvips `dzsave`), dans un volume `tiles/`.
- `jpg_source/` n'est jamais servi.

## 4. Routes

| Route | Contenu |
|---|---|
| `/` | Accueil |
| `/lire` | Sommaire du carnet |
| `/lire/:n` | Une page (n de 1 à 196) |
| `/ernest` | Qui était Ernest, chronologie sourcée |
| `/documents` | Documents annexes, dont la déclaration de 1940 |
| `/documents/:id` | Fiche d'un document |
| `/contexte` | Page de contexte historique détaillée (lien en pied de page uniquement) |
| `/explorer` | Recherche, glossaire, thèmes |
| `/admin/corriger/:id` | Édition d'une page (protégé) |

## 5. Écrans

Les maquettes validées : https://claude.ai/artifact/KXXjEscoADwLjswVEb4tMs

### Accueil

- Signature R.E. en logo, titre « Carnet d'Ernest ».
- Une phrase d'accroche tirée du carnet, pas un résumé.
- Trois phrases de mise en situation (voir §6, texte fourni).
- Deux boutons : « Lire le carnet », « Qui était Ernest ? ».
- Une image de page en vis-à-vis.
- **Interdits** : compteurs, statistiques, citations non sourcées, ton institutionnel.

### Lire, une page

Deux colonnes à parts égales, image à gauche, texte à droite.

- Image : OpenSeadragon, zoom profond, double-clic pour zoomer, plein écran possible.
- En-tête : « page N sur 196 », date si connue (puce), type de page.
- Bascule **Normalisé / Diplomatique**. Par défaut : Normalisé.
- En version diplomatique, conserver les sauts de ligne d'origine, police à chasse fixe.
- Les `[?]` sont rendus en soulignement pointillé avec une infobulle « lecture incertaine », jamais masqués.
- Signature R.E. affichée en bas quand le front matter la porte.
- Notes de la transcription, repliées par défaut.
- Navigation précédente / suivante, et flèches du clavier.
- Bouton « Corriger cette page », visible uniquement si authentifié.
- Si `doublon` est renseigné : bandeau discret « cette page a été photographiée deux fois, voir aussi X ».

Mobile : image réduite en tête (tap pour plein écran), texte dessous, navigation par balayage.

### Ernest

Chronologie de six entrées, chacune avec sa source (folio ou document). Contenu dans `transcription/synthese.md`. En tête, les trois phrases de mise en situation. Lien vers `/contexte`.

### Contexte

Page longue, accessible depuis le pied de page. Deux parties : la captivité en Westphalie et le complexe de Münster, Étaples pendant la guerre. Sources en notes. Contenu rédigé séparément, prévoir la mise en page (texte long, notes, références).

### Explorer

Recherche plein texte (SQLite FTS5) sur les deux versions du texte, glossaire, filtres par type et par période. Écran secondaire, à faire en dernier.

## 6. Contenus fournis

### Accroche d'accueil

> Chaque soir, il notait une bonne action faite et une mauvaise action évitée.

### Mise en situation, trois phrases

> En juin 1918, Ernest Ramet est prisonnier en Westphalie et partage ses biscuits avec des Russes affamés. À 800 kilomètres de là, Étaples, sa ville, est devenue la plus grande base britannique de la guerre, et ses hôpitaux viennent d'être bombardés. Vingt-deux ans plus tard, il quittera la plage de Dunkerque à la rame.

### Repère de lecture

L'analyse du corpus montre un basculement net vers IMG_0440 :

| | juin-juillet 1918 | septembre-novembre 1918 |
|---|---|---|
| « camarade » | 16 | 0 |
| « travail » | 12 | 0 |
| « Jésus » | 0 | 33 |
| « Dieu » | 14 | 63 |

Le carnet commence comme la vie d'un homme et finit comme un catéchisme. Le site doit le rendre lisible : marquer les deux périodes dans le sommaire et sur la barre de progression, et faire entrer le visiteur par la première.

### Règles éditoriales

1. Rien sans source : carnet, document, ou mémoire familiale, et on dit laquelle.
2. Aucun chiffre ni citation qui ne vienne du texte transcrit.
3. En cas de doute, écrire « à vérifier ». Ne jamais combler.
4. Le lieu de captivité s'écrit « en Westphalie ». Münster est une hypothèse, présentée comme telle.

## 7. Correction : le cœur technique

Parcours :

1. L'utilisateur authentifié ouvre `/admin/corriger/:id`.
2. Formulaire : bloc diplomatique et bloc normalisé éditables séparément, plus les champs de front matter (date, type, signature).
3. À l'enregistrement, le serveur :
   - vérifie que l'empreinte SHA du fichier est celle qui a été servie au chargement, sinon refuse et affiche le conflit ;
   - réécrit le `.md` en conservant l'ordre et le format des sections ;
   - recalcule `incertitudes` à partir du nombre réel de `[?]` ;
   - passe `statut` à `corrige` ;
   - commit : `correction <id> (via le site)`, auteur configurable ;
   - ne pousse pas automatiquement, une commande manuelle suffit.
4. L'index se recharge, la page est à jour.

Contraintes : un commit par page, jamais groupé. Ne jamais écraser un fichier dont le statut est `verifie_claude` sans confirmation explicite.

Authentification : protection par le reverse proxy (Nginx Proxy Manager) ou accès Tailscale. Le site ne gère pas de comptes. Il lit un en-tête ou une variable d'environnement pour savoir s'il doit afficher les boutons d'édition.

## 8. Design

Repris des maquettes.

**Couleurs** : papier `#E8E4DA`, papier clair `#F2EFE7`, encre `#23252B`, encre douce `#4A4C54`, bleu du quadrillage `#5C6BA6` (accent), bleu clair `#9AA3C4`, gris chaud `#87826F`, filet `#CFC9BA`. Thème sombre fourni dans la maquette, à reprendre en jetons CSS.

**Typographie** : Spectral pour le texte lu et les titres, IBM Plex Sans pour l'interface, IBM Plex Mono pour les dates, folios et données. Google Fonts, avec pile de repli.

**Principes** : pas de cartes partout, pas d'ombres génériques, le filet et l'espace suffisent. Le bleu ne sert qu'aux dates, aux sources et aux éléments actifs.

**Logo** : la signature R.E. d'Ernest, extraite de IMG_0450_b, trait parasite retiré. Fournie en PNG détourée ; à vectoriser en SVG (deux chemins, R et E).

## 9. Ordre de construction

1. **Socle** : Astro + adaptateur Node, Docker, lecture des `.md`, index en mémoire, rechargement à chaud.
2. **Lire** : `/lire/:n` avec image (d'abord une simple balise img, tuiles ensuite), texte, bascule, navigation. C'est l'écran qui porte tout le projet.
3. **Tuiles** : script libvips, OpenSeadragon, plein écran.
4. **Correction** : formulaire, garde d'empreinte, écriture, commit.
5. **Accueil et Ernest** : contenu fourni ci-dessus.
6. **Documents** : lettre de 1940.
7. **Contexte** : page longue.
8. **Explorer** : recherche FTS5, glossaire.

S'arrêter après chaque étape et montrer le résultat.

## 10. Non négociable

- Ne jamais réécrire un fichier de `transcription/pages/` autrement que par le parcours de correction décrit en §7.
- Ne pas réintroduire le contenu de l'ancien site (`index.html`, `script.js`, `transcriptions_*.md`, `synthese_journal.md`) : il est faux.
- Aucune donnée inventée pour remplir un écran, aucun contenu de démonstration.
- Le dépôt monté en écriture pour la correction (§7) est un risque réel, pas théorique : un `git add` trop large emporte des fichiers qu'on ne voulait pas toucher, sans personne pour s'en apercevoir en production. Trois règles, sans exception :
  - jamais `git add -A`, `git add .`, ni aucune forme implicite : toujours le chemin exact du fichier concerné, avec `--` pour qu'il ne soit jamais interprété comme une option ;
  - avant de committer, vérifier que `git diff --cached --name-only` ne contient que ce chemin et rien d'autre ; sinon avorter sans committer et remonter l'erreur ;
  - aucune commande git qui annule ou réécrit l'historique (`git reset`, `git checkout --`, `git clean`, `git restore`) n'a sa place dans la base de code du site. Le site écrit et commite, il n'annule jamais rien.
