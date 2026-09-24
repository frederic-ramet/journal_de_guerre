import type { APIRoute } from 'astro';
import { getJWTVerificationResult, isEditor } from '../../lib/auth';

export const prerender = false;

// Diagnostic pour la configuration Cloudflare Access : renvoie l'état du jeton,
// la raison du refus s'il est invalide, l'email et isEditor.
// Toujours 200, en lecture seule, jamais EDITORS ni aucune clé secrète.
export const GET: APIRoute = async ({ request }) => {
  const result = await getJWTVerificationResult(request);

  const body = {
    hasToken: result.hasToken,
    valid: result.valid,
    reason: result.reason ?? null,
    email: result.email ?? null,
    isEditor: result.valid && result.email !== null && isEditor(result.email),
  };

  return new Response(JSON.stringify(body, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
