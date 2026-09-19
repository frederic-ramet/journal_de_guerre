import fs from 'node:fs';
import crypto from 'node:crypto';
import matter from 'gray-matter';

export interface PageFrontMatter {
  id: string;
  source: string;
  type: string | null;
  date: string | null;
  lieu: string | null;
  signature: string | null;
  statut: string;
  incertitudes: number;
  doublon: string | null;
}

export interface Page extends PageFrontMatter {
  /** Chemin absolu du fichier .md source. */
  filePath: string;
  /** Empreinte SHA-256 du fichier au moment de la lecture (garde de conflit à l'édition). */
  sha: string;
  diplomatique: string;
  normalise: string;
  notes: string;
}

function extractSection(body: string, heading: string): string {
  const pattern = new RegExp(`^##\\s+${heading}\\s*$`, 'm');
  const match = pattern.exec(body);
  if (!match) return '';

  const start = match.index + match[0].length;
  const rest = body.slice(start);
  const nextHeading = /^##\s+/m.exec(rest);
  const end = nextHeading ? nextHeading.index : rest.length;
  return rest.slice(0, end).trim();
}

function extractDiplomatique(body: string): string {
  const section = extractSection(body, 'Diplomatique');
  // Le bloc Diplomatique est un bloc de code ``` ... ``` : on retire les fences.
  const fenced = /```[^\n]*\n([\s\S]*?)```/.exec(section);
  return fenced ? fenced[1].replace(/\n$/, '') : section;
}

function toStringOrNull(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  // YAML interprète une date non quotée (ex. `date: 1918-06-25`) comme un
  // objet Date : on la reformate en YYYY-MM-DD plutôt que de laisser
  // l'horodatage complet (avec heure et fuseau) s'afficher.
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  const str = String(value).trim();
  return str.length > 0 ? str : null;
}

export function parsePageFile(filePath: string): Page {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const sha = crypto.createHash('sha256').update(raw).digest('hex');
  const { data, content } = matter(raw);

  const id = toStringOrNull(data.id);
  const source = toStringOrNull(data.source);
  const statut = toStringOrNull(data.statut);
  if (!id || !source || !statut) {
    throw new Error(`Front matter incomplet dans ${filePath} (id/source/statut requis)`);
  }

  const incertitudesRaw = data.incertitudes;
  const incertitudes =
    typeof incertitudesRaw === 'number'
      ? incertitudesRaw
      : Number.parseInt(String(incertitudesRaw ?? '0'), 10) || 0;

  return {
    id,
    source,
    type: toStringOrNull(data.type),
    date: toStringOrNull(data.date),
    lieu: toStringOrNull(data.lieu),
    signature: toStringOrNull(data.signature),
    statut,
    incertitudes,
    doublon: toStringOrNull(data.doublon),
    filePath,
    sha,
    diplomatique: extractDiplomatique(content),
    normalise: extractSection(content, 'Normalisé'),
    notes: extractSection(content, 'Notes'),
  };
}
