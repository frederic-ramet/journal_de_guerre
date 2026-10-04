# TODO - Journal de Guerre

_Mis à jour le 19/09/2026_

Usage : privé, moi et la famille. Hébergement prévu sur le devserver (LXC 101). Vercel abandonné.

## Maintenant

- [x] Tout pousser sur `origin/main` (les transcriptions n'existaient que sur le Mac)
- [ ] Corriger les renvois `[N]` de la section Sources sur `/contexte`
- [ ] Durcir `git-commit.ts` : `git add` explicite, vérification avant commit, aucun `git reset`
- [ ] Préparer le déploiement (voir Déploiement)

## Transcription HD (quand crédits)

Photos HD : `jpg_source/` (103 photos, 504 Mo, 24 Mpx, gitignored). Test OK sur IMG_0450.

- [x] Préparer images : 197 pages dans `jpg_pages/` (rotation, recadrage, découpe). Fichiers périmés dans `jpg_pages/TODELETE/`
- [x] Pilote : format validé (en-tête + diplomatique + normalisé + notes), voir `transcription/pilote/`
- [x] Défaut corrigé : à partir de la photo IMG_0439, l'écriture est tournée de 90° (Ernest tournait le carnet). 135 pages redressées. Les transcriptions faites avant correction ont été refaites
- [x] Découpe corrigée : détection de la reliure (elle varie de 35 % à 65 % de la largeur) + 5 % de recouvrement
- [ ] Transcription en cours via Claude Code, lots de 10, statut `ia`
- [ ] Pages `verifie_claude` (faites à la main, référence de qualité) : IMG_0440_a, IMG_0440_b
- [ ] Reprendre les pages listées dans `transcription/a_revoir.md`
- [ ] Doublons à trancher pendant la transcription (~15 paires : 0433/0434, 0448/0449, 0450/0451, 0454/0455, 0460/0461, 0466/0467, 0476/0477, 0480/0481, 0483/0484, 0508/0509, 0510/0511...)
- [ ] Vérifier le nom du lieu sur la page de titre (Münster ? illisible) en recoupant les autres pages
- [ ] Déclaration 1940 (IMG_0508) : vérifier le centre mobilisateur « Guin[?]amp » (Guingamp ?), le numéro du bataillon (4e), et les deux noms de marins d'Étaples (« Perrault Léon », « Calvin[?] Jean »)
- [ ] Renommer en folio (f001r...) une fois l'ordre des pages confirmé
- [ ] Transcrire tout : version diplomatique (`[?]` si doute) + normalisée + métadonnées (date, signature, type d'entrée), statut `ia`
- [ ] Pas de relecture en amont : correction au fil de l'eau dans l'app
- [ ] Boucle qualité : garder l'historique des corrections (texte IA vs texte corrigé), en tirer glossaire et règles, relancer les pages non corrigées avec le prompt amélioré
- [ ] Reconstruire synthèse, chronologie, entités depuis le texte corrigé

Coût (API, ~200 pages, tarifs à vérifier) :

| Option | Total |
|---|---|
| Sonnet 5 + relecture Opus 5, batch | ~12 $ (~0,06 $/page) |
| Opus 5 x2, batch | ~17 $ |
| Sonnet 5 x2, batch | ~7 $ |
| Dans Cowork | inclus abonnement, plus lent |

Attention : ~3 Go libres sur le Mac.

## Site

- [x] Maquettes validées (4 écrans) : https://claude.ai/artifact/KXXjEscoADwLjswVEb4tMs
- [x] Stack décidée : Astro + SQLite accessoire + git source de vérité, voir `stack.md`
- [x] Spec de développement : `spec-site.md` (8 étapes, passée à Claude Code)
- [x] Texte de la page contexte (captivité en Westphalie, Étaples pendant la guerre), avec sources : `contexte.md`
- [x] Signature R.E. vectorisée : `site/public/signature.svg` (fill currentColor), PNG de repli régénéré
- [ ] Étapes 7 (contexte) et 8 (explorer) du site

Images, à reprendre : recadrage trop large sur une partie des pages

## Corrections de contenu (04/10/2026)

- [x] **La déclaration de 1940 est celle d'Ernest fils**, pas du père : corrigé dans `synthese.md`, `contexte.md`, `spec-site.md`, `recherche/BRIEF.md`, `glossaire.md`, et dans le site (`contenu-editorial.ts`, `documents.ts`)
- [x] Distance Étaples / Westphalie : « 800 km » faux, environ 415 à 450 km, corrigé en « plus de 400 »
- [x] « carnet d'aspirations » : formule absente du carnet, remplacée par la page de titre réelle
- [x] Citations tronquées sans marque de coupure (IMG_0470_b, IMG_0483_a) : « […] » ajoutés
- [x] « années 1920 » non daté par le carnet : remplacé par « après la guerre »
- [x] Lieu de captivité : Münster remplacé par Marten (probable) dans le site, `contexte.md` et `synthese.md`
- [ ] Par le parcours de correction du site : IMG_0410_b, lieu « Mart[?]e » → « Martene » ; IMG_0508, préciser « Ernest Ramet fils » dans les notes
- [ ] Accroche « Chaque soir, il notait… » : « chaque soir » n'est pas attesté par le carnet (entrées datées au jour). À trancher par Frédéric
- [ ] Recherche : la fiche matricule mobilisée en 1939-1940 est celle d'Ernest fils ; prévenir l'agent (le raisonnement sur la classe du père dans `recherche/00` part de la mauvaise hypothèse)

## Comprendre (espace pédagogique)

Brief de recherche : `recherche/BRIEF.md`, confié à l'agent de recherche historique.

- [ ] Lieu de captivité : la page de titre se lit « Martene Westphalie » (relecture HD du 24/09), très probablement **Marten, près de Dortmund** (mines, cokeries), rattaché au VII<sup>e</sup> corps (Münster). À confirmer par l'agent, puis corriger `contexte.md` (qui dit « rien de plus de lisible ») et `synthese.md`
- [ ] Archives : fiches CICR et registre matricule d'Ernest, fiches de Georges Lété et des camarades
- [ ] Pilotes : spiritisme, bonne action (piste Kardec, question 919), prière de Charlemagne
- [x] Page « Comprendre » (carte des 11 questions, état de la recherche) : `comprendre.md`
- [ ] Route `/comprendre` dans le site, entrée du menu principal
- [ ] Rédiger les zooms, un par question, à partir du matériau rapporté
- [ ] IMG_0483_a : date notée « 4-1-18 », en réalité 4 janvier 1919 (millésime écrit par habitude), à corriger dans le front matter

## Ontologie

Plan détaillé dans `ontology.md`. À lancer après la relecture, pas avant.

- [ ] 1. Fiabiliser le texte (relecture des `[?]`, doublons tranchés)
- [ ] 2. Figer le vocabulaire (4 types : personnes, lieux, thèmes, sources)
- [ ] 3. Extraction page par page, en lots, dans le front matter
- [ ] 4. Consolidation vers `transcription/entites.json`
- [ ] 5. Validation humaine de la liste
- [ ] 6. Exposition dans le site (fiches d'entité, frise, graphe seulement s'il apprend quelque chose)

## Contenu

- [ ] Une seule source de vérité (voir Stack)
- [ ] Archiver : `script.js`, `index.html`, `styles.css`, `transcriptions_ameliorees_batch*.md`, `transcriptions_completes.md`, `VERIFICATION_*`, `CORRECTIONS_*`, `synthese_journal.md`, `ANALYSE_COMPLETE_JOURNAL.md`, `knowledge_graph.md`, `embeddings_cache.pkl`, v1 Python
- [ ] Une seule numérotation (folio)
- [ ] Mettre à jour `CLAUDE.md`, fusionner les README
- [ ] Nettoyer branches `claude/*`

## Déploiement

Cible : devserver LXC 101, `192.168.1.194`, `/mnt/data/dev/projects/journal_de_guerre`. Voir `devserver-heberger-un-projet.md` (mais pas de Supabase, pas de Gitea, pas de Dokploy).

Décisions prises :

- dépôt de référence : GitHub `origin`. Le clone du serveur est en écriture, c'est le site qui commite les corrections
- pas d'auto-push : tâche planifiée quotidienne sur le serveur
- le Mac n'édite plus les `.md` de `transcription/pages/` à la main une fois en production
- clone en `--single-branch --branch main` (la branche `claude/review-requested-*` porte 500 Mo de photos)
- médias hors dépôt dans `/mnt/data/dev/data/journal_de_guerre/`

Reste à faire :

- [ ] `docker-compose.yml` : monter le dépôt entier (`.:/data`), `.git` compris, médias depuis le chemin serveur
- [ ] Identité git dans le conteneur (variables `GIT_*`, `safe.directory`), testée par un vrai commit
- [ ] Dockerfile multi-étapes (sortir `playwright` et `sharp` de l'image finale)
- [ ] Route `/api/health` + healthcheck compose
- [ ] `deploy.sh` idempotent
- [ ] Choisir un port libre en 30xx (vérifier, ne pas deviner)
- [ ] rsync de `jpg_pages` vers le serveur, puis régénérer les tuiles sur place
- [ ] Cloudflare : tunnel homelab-local vers `carnet.ramet.net`, Access (code par e-mail) devant, vérifier `/api/whoami`
- [ ] AdGuard : `carnet.home` → `192.168.1.194` (AdGuard et NPM sont sur le homeserver, LXC 100)

## UI/UX

- [ ] Garder l'approche narrative de la v1 (résumé, contexte, chronologie)
- [ ] Visionneuse zoomable HD (OpenSeadragon)
- [ ] Image et texte côte à côte, bascule diplomatique / normalisé
- [ ] Édition inline rapide (corriger un mot sans ouvrir un éditeur)
- [ ] Mobile : texte d'abord, image en zoom
