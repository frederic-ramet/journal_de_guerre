import fs from 'node:fs';
import crypto from 'node:crypto';
import type { Page } from './page';

export interface PageEdits {
  diplomatique: string;
  normalise: string;
  date: string | null;
  type: string | null;
  signature: string | null;
}

/** Nombre de "[?]" dans le bloc Diplomatique (même règle que scripts/transcribe.sh). */
export function countIncertitudes(diplomatique: string): number {
  return (diplomatique.match(/\[\?\]/g) ?? []).length;
}

/** Sérialise une valeur de front matter sans guillemets (date, type, lieu,
 * doublon...), sauf si elle contient un caractère qui l'exigerait
 * syntaxiquement en YAML. Convention observée dans les 196 fichiers
 * existants : ces champs ne sont jamais quotés (y compris les dates avec
 * [?] ou intervalle, ex. "1917-10-2[?]", "1918-06-21/22"). */
function yamlScalarUnquoted(value: string | number | null): string {
  if (value === null) return 'null';
  if (typeof value === 'number') return String(value);
  const needsQuoting = /^[\s]|[\s]$|^[!&*?|>%@`"'#]|: /.test(value) || value === '';
  return needsQuoting ? `"${value.replace(/"/g, '\\"')}"` : value;
}

/** Sérialise la signature : toujours entre guillemets doubles si non-null
 * (convention observée dans les 196 fichiers existants, ex. `"R.E."`). */
function yamlScalarSignature(value: string | null): string {
  if (value === null) return 'null';
  return `"${value.replace(/"/g, '\\"')}"`;
}

/** Reconstruit le contenu complet du fichier .md, en conservant l'ordre et
 * le format des champs et sections du pilote (front matter, puis
 * Diplomatique en bloc de code, Normalisé, Notes). Le contenu de `notes`
 * n'est jamais modifié par la correction (§7 de spec-site.md : seuls les
 * blocs diplomatique/normalisé et les champs de front matter cités sont
 * éditables). */
export function serializePage(
  original: Page,
  edits: PageEdits,
  newStatut: string,
): string {
  const incertitudes = countIncertitudes(edits.diplomatique);

  const frontMatterLines = [
    `id: ${original.id}`,
    `source: ${original.source}`,
    `type: ${yamlScalarUnquoted(edits.type)}`,
    `date: ${yamlScalarUnquoted(edits.date)}`,
    `lieu: ${yamlScalarUnquoted(original.lieu)}`,
    `signature: ${yamlScalarSignature(edits.signature)}`,
    `statut: ${newStatut}`,
    `incertitudes: ${incertitudes}`,
  ];
  if (original.doublon) {
    frontMatterLines.splice(2, 0, `doublon: ${original.doublon}`);
  }

  const diplomatiqueBlock = edits.diplomatique.replace(/\n$/, '');
  const notesBlock = original.notes;

  return [
    '---',
    ...frontMatterLines,
    '---',
    '',
    '## Diplomatique',
    '',
    '```',
    diplomatiqueBlock,
    '```',
    '',
    '## Normalisé',
    '',
    edits.normalise.trim(),
    '',
    '## Notes',
    '',
    notesBlock,
    '',
  ].join('\n').replace(/\n+$/, '\n');
}

export type WriteResult =
  | { ok: true }
  | { ok: false; reason: 'conflict'; currentContent: string }
  | { ok: false; reason: 'locked-status' };

/**
 * Écrit la page corrigée sur disque, avec garde d'empreinte : si le fichier
 * a changé sur disque depuis le SHA fourni, refuse sans rien écraser. Refuse
 * aussi si le statut courant sur disque est "verifie_claude" (jamais écrasé
 * par une correction du site).
 */
export function writePageWithGuard(
  original: Page,
  edits: PageEdits,
  expectedSha: string,
): WriteResult {
  const currentRaw = fs.readFileSync(original.filePath, 'utf-8');
  const currentSha = crypto.createHash('sha256').update(currentRaw).digest('hex');

  if (currentSha !== expectedSha) {
    return { ok: false, reason: 'conflict', currentContent: currentRaw };
  }

  // Re-vérifie le statut sur le contenu réellement présent sur disque (pas
  // seulement `original.statut`, qui vient de la lecture initiale) : défense
  // en profondeur si l'index en mémoire était périmé.
  const statutMatch = /^statut:\s*(\S+)\s*$/m.exec(currentRaw);
  if (statutMatch && statutMatch[1] === 'verifie_claude') {
    return { ok: false, reason: 'locked-status' };
  }

  const newContent = serializePage(original, edits, 'corrige');
  fs.writeFileSync(original.filePath, newContent, 'utf-8');
  return { ok: true };
}
