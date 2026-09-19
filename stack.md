# Stack - Journal de Guerre

_Décidé le 19/09/2026_

## Principe

**Git fait foi.** Les 196 fichiers `transcription/pages/*.md` sont la source de vérité unique. Le site les lit, et quand quelqu'un corrige une page, il réécrit le fichier et commit. Chaque correction devient un commit daté et lisible, sans base à synchroniser.

## Choix

| Élément | Choix |
|---|---|
| Contenu | fichiers `.md` en git |
| App | Node, un seul conteneur Docker |
| Rendu | lecture des `.md` à chaud, pas de rebuild |
| Base | SQLite (fichier dans un volume), pour l'accessoire uniquement |
| Images | volume monté, tuiles de zoom pré-générées |
| Auth | protection de `/admin` par Nginx Proxy Manager, ou accès Tailscale |
| Déploiement | `docker compose up`, pas de Dokploy |
| Écarté | Supabase (12 conteneurs pour 2 rédacteurs), Vercel |

## Ce que contient SQLite

Rien d'essentiel, uniquement ce qui n'a pas sa place dans le carnet :

- notes de lecture et favoris,
- index de recherche (reconstruit depuis les `.md`),
- état d'avancement de la relecture.

Perdre ce fichier ne perd aucune transcription.

## Boucle de correction

1. L'utilisateur autorisé ouvre une page et corrige le texte.
2. Le serveur réécrit `transcription/pages/<id>.md`, passe le statut à `corrige`, et commit :
   `correction <id> (via le site)`.
3. Le site relit le fichier, la page est à jour immédiatement.
4. Push vers le dépôt distant, en différé ou à la main.

Points à traiter à l'implémentation :

- le conteneur a besoin du dépôt monté en écriture, avec une identité git dédiée ;
- une correction ne doit jamais écraser un fichier modifié entre-temps : comparer l'empreinte du fichier avant d'écrire ;
- le bloc diplomatique et le bloc normalisé sont éditables séparément ;
- garder l'historique des corrections lisible : un commit par page, pas de commit groupé.

## Images

- 196 pages en JPEG haute résolution, environ 460 Mo, hors git (`.gitignore`).
- Tuiles de zoom générées une fois avec libvips (format DZI), servies en statique.
- Visionneuse OpenSeadragon.
- Les photos sources restent dans `jpg_source/`, jamais servies au navigateur.

## Non tranché

- Framework de rendu : rester sur Express et EJS (déjà en place) ou passer à Astro en mode serveur.
- Recherche plein texte : SQLite FTS5 suffit largement à cette échelle.
