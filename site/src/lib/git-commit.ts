import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { PAGES_DIR } from './config';

const REPO_ROOT = path.resolve(PAGES_DIR, '..', '..');

/**
 * Commit la correction d'une seule page. Un commit par page, jamais groupé
 * (§7 de spec-site.md, et §10 "Non négociable" sur la portée des commits du
 * site).
 *
 * Règles non négociables (voir spec-site.md §10) :
 * - jamais `git add -A`, `git add .`, ni aucune forme implicite : toujours
 *   le chemin exact du fichier concerné, avec `--` pour éviter qu'un chemin
 *   soit interprété comme une option ;
 * - avant de committer, on vérifie que `git diff --cached --name-only` ne
 *   contient que ce chemin et rien d'autre. Si un autre fichier est déjà en
 *   staging (modification concurrente, erreur d'état), on avorte plutôt que
 *   de committer un mélange ;
 * - aucune commande git destructive ou qui annule (`reset`, `checkout --`,
 *   `clean`, `restore`) n'a sa place dans cette base de code : le site
 *   écrit et commite, il ne défait jamais rien.
 *
 * Ne pousse jamais vers le dépôt distant (le push est une tâche planifiée
 * séparée, hors du site).
 */
export function commitPageCorrection(pageId: string, filePath: string, author: string): void {
  const relativePath = path.relative(REPO_ROOT, filePath);

  execFileSync('git', ['add', '--', relativePath], { cwd: REPO_ROOT });

  const staged = execFileSync('git', ['diff', '--cached', '--name-only'], { cwd: REPO_ROOT })
    .toString('utf-8')
    .split('\n')
    .filter(Boolean);

  if (staged.length !== 1 || staged[0] !== relativePath) {
    throw new Error(
      `Garde de commit : après "git add -- ${relativePath}", le staging contient ` +
        `${JSON.stringify(staged)} au lieu du seul chemin attendu. Commit avorté, ` +
        'rien n\'a été enregistré.',
    );
  }

  // L'identité git du commit est celle configurée dans le conteneur/l'environnement
  // (voir stack.md : "identité git dédiée" à configurer côté déploiement) ; le nom
  // de la personne authentifiée par le proxy apparaît dans le message, pas forcé
  // dans --author (qui exigerait une adresse email fiable qu'on n'a pas ici).
  const message = `correction ${pageId} par ${author} (via le site)`;

  execFileSync('git', ['commit', '-m', message, '--', relativePath], { cwd: REPO_ROOT });
}
