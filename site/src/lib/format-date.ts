const MOIS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

/**
 * Formate une date du front matter pour l'affichage. Gère :
 * - une date simple ISO "1918-06-26" -> "26 juin 1918"
 * - un intervalle "1918-06-21/22" ou "1918-06-24/1918-06-25" -> affiché tel
 *   quel après reformatage de chaque borne, séparé par " – "
 * - toute valeur qui ne matche pas ces formes est renvoyée telle quelle
 *   (mieux vaut un texte brut visible qu'un champ vide ou une erreur).
 */
export function formatDateAffichage(date: string): string {
  if (date.includes('/')) {
    const [debut, fin] = date.split('/');
    return `${formatOneDate(debut, debut)} – ${formatOneDate(fin, debut)}`;
  }
  return formatOneDate(date, date);
}

function formatOneDate(part: string, context: string): string {
  const full = /^(\d{4})-(\d{2})-(\d{2})$/.exec(part);
  if (full) {
    const [, y, m, d] = full;
    return `${Number.parseInt(d, 10)} ${MOIS[Number.parseInt(m, 10) - 1]} ${y}`;
  }
  // Borne courte d'un intervalle, ex. "22" dans "1918-06-21/22" : reprend
  // l'année et le mois du contexte (première borne).
  const short = /^(\d{1,2})$/.exec(part);
  const contextFull = /^(\d{4})-(\d{2})-(\d{2})$/.exec(context);
  if (short && contextFull) {
    const [, y, m] = contextFull;
    return `${Number.parseInt(short[1], 10)} ${MOIS[Number.parseInt(m, 10) - 1]} ${y}`;
  }
  return part;
}
