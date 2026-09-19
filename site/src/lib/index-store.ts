import fs from 'node:fs';
import path from 'node:path';
import chokidar, { type FSWatcher } from 'chokidar';
import { PAGES_DIR } from './config';
import { parsePageFile, type Page } from './page';
import { periodeForId, type PeriodeDef } from '../data/periodes';

export interface IndexedPage extends Page {
  /** Rang de lecture, 1 à N, dans l'ordre des identifiants. */
  numero: number;
  periode: PeriodeDef;
}

class Index {
  private pagesById = new Map<string, IndexedPage>();
  private orderedIds: string[] = [];
  private watcher: FSWatcher | null = null;

  get size(): number {
    return this.orderedIds.length;
  }

  all(): IndexedPage[] {
    return this.orderedIds.map((id) => this.pagesById.get(id)!);
  }

  byId(id: string): IndexedPage | undefined {
    return this.pagesById.get(id);
  }

  byNumero(numero: number): IndexedPage | undefined {
    const id = this.orderedIds[numero - 1];
    return id ? this.pagesById.get(id) : undefined;
  }

  /** Recharge immédiatement une page depuis le disque (pas d'attente du
   * watcher chokidar, qui a un délai de stabilité) : à appeler juste après
   * une écriture réussie, pour que la page relue soit à jour tout de suite. */
  reloadPageSync(id: string): void {
    const existing = this.pagesById.get(id);
    if (!existing) return;
    const page = parsePageFile(existing.filePath);
    this.pagesById.set(id, { ...page, numero: existing.numero, periode: existing.periode });
  }

  /** Reconstruit tout l'index depuis le disque. */
  rebuild(): void {
    if (!fs.existsSync(PAGES_DIR)) {
      console.warn(`[index] PAGES_DIR introuvable: ${PAGES_DIR}`);
      this.pagesById = new Map();
      this.orderedIds = [];
      return;
    }

    const files = fs
      .readdirSync(PAGES_DIR)
      .filter((f) => f.endsWith('.md'))
      .sort((a, b) => a.localeCompare(b, 'en'));

    const pagesById = new Map<string, IndexedPage>();
    const orderedIds: string[] = [];

    files.forEach((file, i) => {
      const filePath = path.join(PAGES_DIR, file);
      try {
        const page = parsePageFile(filePath);
        const numero = i + 1;
        const periode = periodeForId(page.id);
        pagesById.set(page.id, { ...page, numero, periode });
        orderedIds.push(page.id);
      } catch (err) {
        console.error(`[index] Erreur de lecture ${filePath}:`, err);
      }
    });

    this.pagesById = pagesById;
    this.orderedIds = orderedIds;
  }

  /** Recharge un seul fichier (utilisé par le watcher, évite de tout reparser). */
  private reloadOne(filePath: string): void {
    try {
      const page = parsePageFile(filePath);
      const existing = this.pagesById.get(page.id);
      if (existing) {
        this.pagesById.set(page.id, { ...page, numero: existing.numero, periode: existing.periode });
      } else {
        // Nouveau fichier : on ne connaît pas encore son rang, on reconstruit tout.
        this.rebuild();
      }
    } catch (err) {
      console.error(`[index] Erreur de rechargement ${filePath}:`, err);
    }
  }

  startWatching(): void {
    if (this.watcher) return;
    if (!fs.existsSync(PAGES_DIR)) return;

    this.watcher = chokidar.watch(PAGES_DIR, {
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
    });

    this.watcher
      .on('add', (filePath) => {
        console.log(`[index] Nouveau fichier: ${filePath}`);
        this.rebuild();
      })
      .on('change', (filePath) => {
        console.log(`[index] Fichier modifié: ${filePath}`);
        this.reloadOne(filePath);
      })
      .on('unlink', (filePath) => {
        console.log(`[index] Fichier supprimé: ${filePath}`);
        this.rebuild();
      });
  }

  stopWatching(): void {
    this.watcher?.close();
    this.watcher = null;
  }
}

export const index = new Index();
index.rebuild();
index.startWatching();
