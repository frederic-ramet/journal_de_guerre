# TODO - Journal de Guerre

_Mis à jour le 16/09/2026_

Usage : privé (moi seul). Site Vercel ignoré.

## Maintenant

- [ ] Supprimer `.git/index.lock` (bloque git)

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

## Stack (aligner sur le stack homelab)

Référence = devserver (voir `devserver-documentation.md`) : Supabase self-hosted (Postgres, Auth, Storage), Gitea, Dokploy, accès Tailscale.

- [ ] Données : Supabase Postgres (pages, transcriptions, historique corrections, annotations) au lieu de SQLite
- [ ] Images HD + découpes : Supabase Storage ou datapool ZFS (libère le Mac)
- [ ] Auth : Supabase Auth (moi + comptes autorisés)
- [ ] Déploiement : Dokploy depuis Gitea, plus Vercel
- [ ] Export `.md` par page dans git (sauvegarde lisible)
- [ ] Framework front : à trancher (garder Express/EJS ou passer au front de référence)
- [ ] Remplacer l'ontologie par mots-clés par des entités tirées du texte corrigé

## UI/UX

- [ ] Garder l'approche narrative de la v1 (résumé, contexte, chronologie)
- [ ] Visionneuse zoomable HD (OpenSeadragon)
- [ ] Image et texte côte à côte, bascule diplomatique / normalisé
- [ ] Édition inline rapide (corriger un mot sans ouvrir un éditeur)
- [ ] Mobile : texte d'abord, image en zoom
