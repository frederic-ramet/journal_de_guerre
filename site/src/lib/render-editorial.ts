import { Marked } from 'marked';
import { index } from './index-store';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Rendu Markdown pour les pages de prose éditoriale (contexte, et tout futur
// contenu rédigé du même genre). Jamais utilisé pour transcription/pages/*.md
// : le bloc Diplomatique reste un <pre> brut, non passé par un moteur
// Markdown (voir src/lib/render.ts et src/lib/page.ts, inchangés).
//
// HTML brut du fichier source neutralisé (échappé, jamais injecté tel quel) :
// le contenu vient de nous, mais le fichier est éditable sur disque et rien
// n'oblige à faire confiance à ce qu'il contient.
const markdown = new Marked({
  renderer: {
    html({ text }) {
      return escapeHtml(text);
    },
  },
});

const REFERENCE_PATTERN = /\[(\d+)\]/g;
const IMG_ID_PATTERN = /\bIMG_\d{4}(?:_[ab])?\b/g;
// Une séquence de 2+ identifiants IMG_XXXX séparés par ", " (et un éventuel
// " et " avant le dernier) : ce que produit une liste comme
// "(IMG_0426_b, IMG_0427_b, IMG_0428_b, IMG_0429_b)" dans le texte source.
const IMG_ID_GROUP_PATTERN = new RegExp(
  `${IMG_ID_PATTERN.source}(?:(?:, | et )${IMG_ID_PATTERN.source})+`,
  'g',
);

/** Un identifiant de page isolé (IMG_0424_b) n'a aucun sens pour un lecteur
 * de la famille : c'est un nom de fichier, pas un repère de lecture. On
 * affiche "page N" (le rang réel dans /lire), le lien continue de pointer
 * vers cette page ; l'identifiant technique n'apparaît plus à l'écran. */
function renderSingleImgLink(id: string): string {
  const page = index.byId(id);
  if (!page) return id;
  return `<a href="/lire/${page.numero}" class="page-ref">page ${page.numero}</a>`;
}

/** Un groupe d'identifiants consécutifs ("IMG_A, IMG_B, IMG_C, IMG_D") se lit
 * "pages N, N, N et N" plutôt que quatre liens collés à la file. */
function renderImgLinkGroup(match: string): string {
  const ids = match.match(IMG_ID_PATTERN) ?? [];
  const links = ids.map((id) => {
    const page = index.byId(id);
    return page ? `<a href="/lire/${page.numero}" class="page-ref">${page.numero}</a>` : id;
  });
  if (links.length === 1) return `page ${links[0]}`;
  const last = links[links.length - 1];
  const rest = links.slice(0, -1);
  return `pages ${rest.join(', ')} et ${last}`;
}

/** Transforme les renvois [1]..[9] en liens vers #source-N, et les
 * identifiants de page (IMG_0424_b...) en liens "page N" vers /lire/:n —
 * appliqué après le rendu Markdown, sur le HTML produit, jamais dans le
 * fichier source. Court-circuite à l'intérieur des balises <a>...</a> déjà
 * présentes pour ne pas imbriquer un lien dans un lien. */
function linkifyReferencesAndPageIds(html: string): string {
  // Découpe le HTML en segments alternant "hors lien" / "dans un lien
  // existant" (ex. les liens [1](url) du fichier de sources), pour ne
  // transformer que le texte hors des ancres déjà posées par Markdown.
  const parts = html.split(/(<a\b[^>]*>.*?<\/a>)/gs);

  return parts
    .map((part, i) => {
      // Segments impairs = contenu déjà à l'intérieur d'un <a>...</a> : laissé tel quel.
      if (i % 2 === 1) return part;

      let out = part.replace(REFERENCE_PATTERN, (match, num) => {
        return `<a href="#source-${num}" class="ref">${match}</a>`;
      });

      // Les groupes d'identifiants consécutifs sont traités avant les
      // identifiants isolés, sinon le pattern isolé les découperait un par un.
      out = out.replace(IMG_ID_GROUP_PATTERN, renderImgLinkGroup);
      out = out.replace(IMG_ID_PATTERN, renderSingleImgLink);

      return out;
    })
    .join('');
}

/** Pose une ancre id="source-N" sur le paragraphe qui commence par "[N] "
 * (une entrée de la section Sources), pour que les renvois [N] du corps du
 * texte pointent vers un endroit réel de la page. N'est appliqué qu'à la
 * partie du HTML après le titre Sources (voir renderEditorialMarkdown) :
 * ces [N]-là ne doivent jamais redevenir des liens, seulement porter l'ancre. */
function anchorSourceEntries(html: string): string {
  return html.replace(/<p>\[(\d+)\]/g, '<p id="source-$1">[$1]');
}

// Une entrée de la section Sources, telle que produite par le Markdown :
// "[1] <em>Titre</em>, Nom du site : <a href="URL">URL</a>". On veut le lien
// sur le titre et l'URL masquée (seul le nom du site reste en texte) :
// "[1] <a href="URL"><em>Titre</em></a>, Nom du site".
const SOURCE_ENTRY_LINK_PATTERN =
  /(<em>[^<]+<\/em>)(, [^<:]+) : <a href="([^"]+)">[^<]+<\/a>/g;

/** Masque l'URL brute de chaque entrée [N] de la section Sources : le lien
 * passe sur le titre, le nom du site reste visible en texte. N'affecte que
 * les paragraphes d'entrées sourcées, pas les liens de la liste "Archives
 * complémentaires" qui suit (pas de forme "[N] *titre*, site : url" là-bas). */
function deduplicateSourceUrls(html: string): string {
  return html.replace(
    SOURCE_ENTRY_LINK_PATTERN,
    (_match, titleEm: string, siteName: string, url: string) =>
      `<a href="${url}">${titleEm}</a>${siteName}`,
  );
}

/** Enveloppe dans un encadré "réserve méthodologique" tout paragraphe qui
 * commence par un texte en gras suivi d'un point (ex. "**À vérifier.** ...")
 * — même traitement visuel que l'encadré "Ce que l'on ne sait pas encore" de
 * /ernest. Détecté sur la forme du HTML rendu, jamais codé dans le .md.
 * Règle volontairement large : un futur paragraphe éditorial qui commencerait
 * par "**Quelque chose.**" serait aussi encadré, sans distinction sémantique. */
function wrapMethodologicalCaveats(html: string): string {
  return html.replace(
    /<p>(<strong>[^<]+\.<\/strong>[\s\S]*?)<\/p>/g,
    '<aside class="caveat"><p>$1</p></aside>',
  );
}

const SOURCES_HEADING_PATTERN = /<h2>Sources<\/h2>/;

/** Le fichier source écrit son premier titre en "##" (même niveau que les
 * sous-parties suivantes) : sémantiquement, c'est le titre de la page, donc
 * un h1. On ne retouche que la toute première occurrence de <h2>, avec le
 * même rendu visuel qu'aujourd'hui (voir .prose h1 dans le style de la page). */
function promoteFirstHeadingToH1(html: string): string {
  return html.replace(/<h2>/, '<h1>').replace(/<\/h2>/, '</h1>');
}

/**
 * Les renvois [N] du corps du texte et les ancres de la section Sources ne
 * doivent jamais se mélanger : linkifyReferencesAndPageIds ne s'applique
 * qu'au corps (avant le titre "Sources"), anchorSourceEntries ne s'applique
 * qu'à la section Sources elle-même (après ce titre). Sans ce découpage,
 * appliquer les deux à tout le HTML fait de chaque [N] de la liste des
 * sources un lien vers sa propre ancre.
 */
export function renderEditorialMarkdown(source: string): string {
  const rawHtml = markdown.parse(source, { async: false }) as string;
  const withH1 = promoteFirstHeadingToH1(rawHtml);
  const withCaveats = wrapMethodologicalCaveats(withH1);

  const splitIndex = withCaveats.search(SOURCES_HEADING_PATTERN);
  if (splitIndex === -1) {
    // Pas de section Sources dans ce document : rien à ancrer, tout le
    // corps peut recevoir les liens de renvoi/page.
    return linkifyReferencesAndPageIds(withCaveats);
  }

  const body = withCaveats.slice(0, splitIndex);
  const sources = withCaveats.slice(splitIndex);
  const renderedSources = deduplicateSourceUrls(anchorSourceEntries(sources));
  return linkifyReferencesAndPageIds(body) + renderedSources;
}
