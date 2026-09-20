import type { APIRoute } from 'astro';
import { getAuthHeaderName, getRawHeaderUser, isEditor } from '../../lib/auth';

export const prerender = false;

// Diagnostic pour la configuration du reverse proxy (NPM) : distingue "l'en-tête
// n'arrive pas au site" de "il arrive mais le nom n'est pas dans EDITORS", deux
// causes différentes d'un même 404 sur /admin/*, sinon indiscernables de
// l'extérieur. Toujours 200, en lecture seule, jamais EDITORS ni aucune autre
// variable d'environnement en clair — seulement ces trois informations.
export const GET: APIRoute = async ({ request }) => {
  const user = getRawHeaderUser(request);

  const body = {
    expectedHeader: getAuthHeaderName(),
    receivedUser: user,
    isEditor: user !== null && isEditor(user),
  };

  return new Response(JSON.stringify(body, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
