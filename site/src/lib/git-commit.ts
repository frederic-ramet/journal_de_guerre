import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { PAGES_DIR } from './config';

const REPO_ROOT = path.resolve(PAGES_DIR, '..', '..');

/**
 * Commit la correction d'une seule page. Un commit par page, jamais groupé
 * (§7 de spec-site.md). Ne pousse jamais vers le dépôt distant.
 */
export function commitPageCorrection(pageId: string, filePath: string, author: string): void {
  const relativePath = path.relative(REPO_ROOT, filePath);
  // L'identité git du commit est celle configurée dans le conteneur/l'environnement
  // (voir stack.md : "identité git dédiée" à configurer côté déploiement) ; le nom
  // de la personne authentifiée par le proxy apparaît dans le message, pas forcé
  // dans --author (qui exigerait une adresse email fiable qu'on n'a pas ici).
  const message = `correction ${pageId} par ${author} (via le site)`;

  execFileSync('git', ['add', relativePath], { cwd: REPO_ROOT });
  execFileSync('git', ['commit', '-m', message], { cwd: REPO_ROOT });
}
