import { createRemoteJWKSet, jwtVerify } from 'jose';

// Authentification Cloudflare Access : JWT signé par Cloudflare
// En développement, EDIT_ENABLED=true force l'accès sans vérification JWT.
// En production, le jeton JWT est vérifié avec signature Cloudflare RS256,
// aud (identifiant de l'application), et iss (domaine Cloudflare).
// L'identité est l'email du jeton, EDITORS est une liste d'adresses (case-insensitive).
// Le site reste lisible sans config Cloudflare ; seule l'édition est désactivée.

const EDIT_ENABLED = process.env.EDIT_ENABLED === 'true';
const CF_ACCESS_TEAM_DOMAIN = normalizeTeamDomain(process.env.CF_ACCESS_TEAM_DOMAIN ?? '');
const CF_ACCESS_AUD = process.env.CF_ACCESS_AUD ?? '';
const EDITORS_STR = (process.env.EDITORS ?? '').toLowerCase();
const EDITORS = EDITORS_STR
  .split(',')
  .map((email) => email.trim())
  .filter((email) => email.length > 0);

function normalizeTeamDomain(domain: string): string {
  if (!domain) return '';
  return domain.replace(/^https?:\/\//, '').trim();
}

function isConfigurationComplete(): boolean {
  return EDIT_ENABLED || (CF_ACCESS_TEAM_DOMAIN.length > 0 && CF_ACCESS_AUD.length > 0);
}

let jwksCache: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJWKS() {
  if (jwksCache) return jwksCache;
  if (!isConfigurationComplete()) return null;
  const certsUrl = `https://${CF_ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`;
  jwksCache = createRemoteJWKSet(new URL(certsUrl));
  return jwksCache;
}

interface CFAccessToken {
  aud: string[];
  email: string;
  iss: string;
  exp: number;
  iat: number;
}

interface VerifyResult {
  email: string | null;
  valid: boolean;
  reason?: string;
}

async function verifyCloudflareJWT(token: string): Promise<VerifyResult> {
  if (!isConfigurationComplete()) {
    return { email: null, valid: false, reason: 'configuration_incomplete' };
  }

  try {
    const jwks = getJWKS();
    if (!jwks) {
      return { email: null, valid: false, reason: 'jwks_unavailable' };
    }

    const issuer = `https://${CF_ACCESS_TEAM_DOMAIN}`;
    const result = await jwtVerify(token, jwks, {
      algorithms: ['RS256'],
      issuer,
      audience: CF_ACCESS_AUD,
    });

    const payload = result.payload as CFAccessToken;

    if (!payload.email) {
      return { email: null, valid: false, reason: 'no_email_in_token' };
    }

    return { email: payload.email.toLowerCase(), valid: true };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    if (reason.includes('signature')) {
      return { email: null, valid: false, reason: 'invalid_signature' };
    }
    if (reason.includes('audience')) {
      return { email: null, valid: false, reason: 'invalid_audience' };
    }
    if (reason.includes('issuer')) {
      return { email: null, valid: false, reason: 'invalid_issuer' };
    }
    if (reason.includes('exp')) {
      return { email: null, valid: false, reason: 'token_expired' };
    }
    return { email: null, valid: false, reason: 'verification_failed' };
  }
}

/** Retourne l'identité de l'auteur si l'édition est autorisée, sinon null. */
export async function getAuthenticatedUser(request: Request): Promise<string | null> {
  if (EDIT_ENABLED) {
    return process.env.EDIT_ENABLED_USER ?? 'dev';
  }

  const result = await getJWTVerificationResult(request);
  return result.email && result.valid && isEditor(result.email) ? result.email : null;
}

/**
 * Résultat complet de la vérification du JWT.
 * /api/whoami en a besoin pour diagnostiquer l'état du jeton.
 */
export async function getJWTVerificationResult(
  request: Request
): Promise<VerifyResult & { hasToken: boolean }> {
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) {
    return { email: null, valid: false, hasToken: false, reason: 'no_token' };
  }

  const result = await verifyCloudflareJWT(token);
  return { ...result, hasToken: true };
}

export function isEditor(email: string): boolean {
  return EDITORS.includes(email.toLowerCase());
}

export function getConfigStatus(): {
  complete: boolean;
  editEnabled: boolean;
  teamDomain: string;
  audConfigured: boolean;
  editorsCount: number;
} {
  return {
    complete: isConfigurationComplete(),
    editEnabled: EDIT_ENABLED,
    teamDomain: CF_ACCESS_TEAM_DOMAIN,
    audConfigured: CF_ACCESS_AUD.length > 0,
    editorsCount: EDITORS.length,
  };
}
