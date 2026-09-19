import fs from 'node:fs';
import chokidar, { type FSWatcher } from 'chokidar';
import { CONTEXTE_MD_PATH } from './config';

// Le rendu se fait à la requête (voir src/pages/contexte.astro), pas ici :
// ce module ne fait que lire le fichier source à chaque appel, avec
// rechargement à chaud pour rester cohérent avec transcription/pages/*.md.
// La lecture disque directe (pas de cache) suffit à cette échelle (un seul
// fichier de quelques Ko) ; le watcher sert seulement à logguer les
// modifications, la prochaine requête relit de toute façon le fichier.

let watcher: FSWatcher | null = null;

export function readContexteMarkdown(): string {
  return fs.readFileSync(CONTEXTE_MD_PATH, 'utf-8');
}

/** Le contenu réel de la page commence au titre "## Contexte" : l'en-tête du
 * fichier (titre de travail "# Texte de la page /contexte" et le paragraphe
 * en italique qui suit) n'est pas du contenu de page. */
export function extractContexteBody(source: string): string {
  const marker = '## Contexte';
  const idx = source.indexOf(marker);
  return idx === -1 ? source : source.slice(idx);
}

export function startWatchingContexte(): void {
  if (watcher) return;
  if (!fs.existsSync(CONTEXTE_MD_PATH)) return;

  watcher = chokidar.watch(CONTEXTE_MD_PATH, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
  });

  watcher.on('change', () => {
    console.log(`[contexte] Fichier modifié: ${CONTEXTE_MD_PATH}`);
  });
}

startWatchingContexte();
