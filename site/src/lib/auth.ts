// Authentification de /admin/* : ni comptes ni mots de passe côté site.
// - En production, le reverse proxy (Nginx Proxy Manager) doit poser l'en-tête
//   nommé par AUTH_HEADER après avoir authentifié la personne, et l'écraser
//   pour tout ce qui vient du client (jamais transmis tel quel depuis
//   l'extérieur). Ce site fait confiance à cet en-tête uniquement parce qu'il
//   est supposé tourner derrière ce proxy, jamais exposé directement.
// - En développement, EDIT_ENABLED=true force l'accès sans proxy.
//
// Authentifié ne veut pas dire éditeur : l'Access List de NPM protège tout
// le site (lecture comprise), donc n'importe quel compte de la famille pose
// l'en-tête. Seuls les noms listés dans EDITORS peuvent corriger — les
// autres lisent, sans bouton d'édition et avec /admin/* qui répond 404.
// EDITORS vide ou absent : personne ne peut éditer, y compris en étant
// authentifié auprès du proxy.

const AUTH_HEADER_NAME = process.env.AUTH_HEADER ?? 'X-Authenticated-User';
const EDIT_ENABLED = process.env.EDIT_ENABLED === 'true';
const EDITORS = (process.env.EDITORS ?? '')
  .split(',')
  .map((name) => name.trim())
  .filter((name) => name.length > 0);

/** Retourne l'identité de l'auteur si l'édition est autorisée, sinon null. */
export function getAuthenticatedUser(request: Request): string | null {
  if (EDIT_ENABLED) {
    return process.env.EDIT_ENABLED_USER ?? 'dev';
  }
  const user = getRawHeaderUser(request);
  return user && isEditor(user) ? user : null;
}

/**
 * Valeur brute de l'en-tête d'authentification, sans filtrage par EDITORS —
 * distincte de getAuthenticatedUser() exprès : /api/whoami (voir cette route)
 * a besoin de savoir si l'en-tête arrive au site avant de savoir si le nom
 * reçu est autorisé à corriger, pour diagnostiquer un proxy qui ne
 * transmettrait pas l'en-tête sans le confondre avec un nom absent d'EDITORS.
 */
export function getRawHeaderUser(request: Request): string | null {
  const value = request.headers.get(AUTH_HEADER_NAME);
  return value && value.trim().length > 0 ? value.trim() : null;
}

export function isEditor(user: string): boolean {
  return EDITORS.includes(user);
}

export function getAuthHeaderName(): string {
  return AUTH_HEADER_NAME;
}
