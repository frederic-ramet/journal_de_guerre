function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function markDoubts(escaped: string): string {
  // Un mot suivi de [?] (ex. "avoi[?]") ou un [?] isolé : dans les deux cas,
  // on entoure le [?] lui-même du marqueur d'incertitude.
  return escaped.replace(
    /\[\?\]/g,
    '<span class="doubt" title="lecture incertaine">[?]</span>',
  );
}

/**
 * Transforme le texte Diplomatique en HTML : échappe les caractères
 * spéciaux, marque les [?], garde le texte tel quel (les sauts de ligne
 * d'origine sont préservés par le CSS white-space: pre-wrap sur le <pre>
 * qui reçoit ce HTML).
 */
export function renderDiplomatique(text: string): string {
  return markDoubts(escapeHtml(text));
}

/**
 * Transforme le texte Normalisé en HTML : un <p> par paragraphe (coupure sur
 * ligne vide), pour un espacement visuel net entre paragraphes plutôt qu'un
 * simple retour à la ligne dans un bloc préformaté.
 */
export function renderNormalise(text: string): string {
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return paragraphs.map((p) => `<p>${markDoubts(escapeHtml(p))}</p>`).join('');
}
